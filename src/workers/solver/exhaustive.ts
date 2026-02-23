import { RotationAssignment } from '@/types/domain.ts';
import type {
  Player,
  PlayerId,
  RotationSchedule,
  Rotation,
  FormationSlot,
  SubPosition,
} from '@/types/domain.ts';
import {
  calculatePlayerStats,
  calculateRotationStrength,
  computeStrengthStats,
} from '@/utils/stats.ts';
import { getPeriodForRotation } from '@/utils/rotationLayout.ts';
import { autoAssignPositions } from '@/utils/positions.ts';
import { optimizePositionAssignments } from './position-planner.ts';
import { prepareConstraints } from './constraintPreparation.ts';
import type { SolverContext, BenchPattern } from './types.ts';

interface PlayerConstraints {
  player: Player;
  cannotBench: Set<number>;
  mustBench: Set<number>;
}

interface SolutionScore {
  softMissCount: number;
  strengthVariance: number;
}

const PRIMARY_SEARCH_TIMEOUT_MS = 12_000;
const PRIMARY_SEARCH_NODE_LIMIT = 8_000_000;
const FALLBACK_SEARCH_TIMEOUT_MS = 3_000;

function searchingMessage(combinations: string): string {
  return JSON.stringify({
    key: 'game:solver.searching',
    combinations,
  });
}

function oneBasedRotations(indices: number[]): string {
  return indices
    .sort((a, b) => a - b)
    .map((i) => `R${i + 1}`)
    .join(', ');
}

function describePlayerPatternFailure(params: {
  playerName: string;
  cannotBench: Set<number>;
  mustBench: Set<number>;
  targetBenchCount: number;
  totalRotations: number;
  maxConsecutive: number;
}): string {
  const { playerName, cannotBench, mustBench, targetBenchCount, totalRotations, maxConsecutive } =
    params;

  const overlap = [...mustBench].filter((idx) => cannotBench.has(idx));
  if (overlap.length > 0) {
    return `${playerName}: conflict on ${oneBasedRotations(overlap)} (must bench and cannot bench).`;
  }

  const availableSlots = totalRotations - cannotBench.size;
  if (targetBenchCount > availableSlots) {
    return `${playerName}: needs ${targetBenchCount} bench rotations but can only bench in ${availableSlots}.`;
  }

  const patternAtMustOnly = generateBenchPatterns(
    totalRotations,
    mustBench.size,
    cannotBench,
    mustBench,
    maxConsecutive,
  );
  if (patternAtMustOnly.length === 0) {
    return `${playerName}: required bench rotations (${oneBasedRotations([...mustBench])}) violate current constraints.`;
  }

  return `${playerName}: no valid bench pattern fits the current constraints.`;
}

function findRotationCapacityConflicts(params: {
  players: Player[];
  constraintsPerPlayer: PlayerConstraints[];
  totalRotations: number;
  benchSlotsPerRotation: number;
}): string[] {
  const { players, constraintsPerPlayer, totalRotations, benchSlotsPerRotation } = params;
  const conflicts: string[] = [];

  for (let rot = 0; rot < totalRotations; rot++) {
    let forcedBenchCount = 0;
    let canBenchCount = 0;
    const forcedPlayers: string[] = [];

    for (let i = 0; i < players.length; i++) {
      const constraints = constraintsPerPlayer[i];
      if (constraints.mustBench.has(rot)) {
        forcedBenchCount++;
        forcedPlayers.push(players[i].name);
      }
      if (!constraints.cannotBench.has(rot)) {
        canBenchCount++;
      }
    }

    if (forcedBenchCount > benchSlotsPerRotation) {
      conflicts.push(
        `R${rot + 1}: ${forcedBenchCount} players are forced to bench (max allowed ${benchSlotsPerRotation}). Forced: ${forcedPlayers.join(', ')}.`,
      );
    } else if (canBenchCount < benchSlotsPerRotation) {
      conflicts.push(
        `R${rot + 1}: only ${canBenchCount} players can bench, but ${benchSlotsPerRotation} bench slots are required.`,
      );
    }
  }

  return conflicts;
}

function generatePatternPoolForPlayer(params: {
  constraints: PlayerConstraints;
  totalRotations: number;
  maxConsecutive: number;
  enforceMinPlayTime: boolean;
  rotationWeights: number[];
  maxBenchWeight: number;
}): BenchPattern[] {
  const {
    constraints,
    totalRotations,
    maxConsecutive,
    enforceMinPlayTime,
    rotationWeights,
    maxBenchWeight,
  } = params;

  const minBench = constraints.mustBench.size;
  const maxBench = totalRotations - constraints.cannotBench.size;
  if (maxBench < minBench) return [];

  const patterns: BenchPattern[] = [];
  for (let benchCount = minBench; benchCount <= maxBench; benchCount++) {
    patterns.push(
      ...generateBenchPatterns(
        totalRotations,
        benchCount,
        constraints.cannotBench,
        constraints.mustBench,
        maxConsecutive,
        rotationWeights,
        enforceMinPlayTime ? maxBenchWeight : undefined,
      ),
    );
  }
  return patterns;
}

function findFallbackFeasibleBenchSets(params: {
  constraintsPerPlayer: PlayerConstraints[];
  totalRotations: number;
  benchSlotsPerRotation: number;
  maxConsecutive: number;
  enforceMinPlayTime: boolean;
  rotationWeights: number[];
  defaultMaxBenchWeight: number;
  maxBenchWeightByPlayer?: Record<string, number>;
  cancellation: { cancelled: boolean };
  onProgress: (percentage: number, message: string) => void;
}): { orderedPlayers: Player[]; benchSets: BenchPattern[] } | null {
  const {
    constraintsPerPlayer,
    totalRotations,
    benchSlotsPerRotation,
    maxConsecutive,
    enforceMinPlayTime,
    rotationWeights,
    defaultMaxBenchWeight,
    maxBenchWeightByPlayer,
    cancellation,
    onProgress,
  } = params;

  const playerPools = constraintsPerPlayer
    .map((constraints) => ({
      player: constraints.player,
      patterns: generatePatternPoolForPlayer({
        constraints,
        totalRotations,
        maxConsecutive,
        enforceMinPlayTime,
        rotationWeights,
        maxBenchWeight: maxBenchWeightByPlayer?.[constraints.player.id] ?? defaultMaxBenchWeight,
      }),
    }))
    .sort((a, b) => a.patterns.length - b.patterns.length);

  if (playerPools.some((p) => p.patterns.length === 0)) return null;

  const benchCountPerRotation = new Array<number>(totalRotations).fill(0);
  const chosen: BenchPattern[] = new Array<BenchPattern>(playerPools.length);
  const deadStates = new Set<string>();
  let found = false;
  let timedOut = false;
  let explored = 0;
  const searchStartTime = Date.now();
  let lastProgressAt = searchStartTime;
  let lastReportedProgress = 15;

  onProgress(lastReportedProgress, searchingMessage('0'));

  const keyBuf = new Uint16Array(totalRotations + 1);
  function stateKey(depth: number): string {
    keyBuf[0] = depth;
    for (let i = 0; i < totalRotations; i++) keyBuf[i + 1] = benchCountPerRotation[i];
    return String.fromCharCode(...keyBuf);
  }

  function search(depth: number) {
    if (found || timedOut) return;
    if (cancellation.cancelled) throw new Error('Cancelled');
    if (Date.now() - searchStartTime > FALLBACK_SEARCH_TIMEOUT_MS) {
      timedOut = true;
      return;
    }
    explored++;

    const now = Date.now();
    if (now - lastProgressAt >= 300) {
      const elapsedMs = now - searchStartTime;
      const bump = Math.max(1, Math.floor((now - lastProgressAt) / 300));
      lastReportedProgress = Math.min(44, lastReportedProgress + bump);
      onProgress(lastReportedProgress, searchingMessage(explored.toLocaleString()));
      lastProgressAt = now;
      if (elapsedMs > FALLBACK_SEARCH_TIMEOUT_MS) {
        timedOut = true;
        return;
      }
    }

    const remainingPlayers = playerPools.length - depth;
    for (let r = 0; r < totalRotations; r++) {
      if (benchCountPerRotation[r] > benchSlotsPerRotation) return;
      if (benchCountPerRotation[r] + remainingPlayers < benchSlotsPerRotation) return;
    }

    const key = stateKey(depth);
    if (deadStates.has(key)) return;

    if (depth === playerPools.length) {
      for (let r = 0; r < totalRotations; r++) {
        if (benchCountPerRotation[r] !== benchSlotsPerRotation) return;
      }
      found = true;
      return;
    }

    for (const pattern of playerPools[depth].patterns) {
      let valid = true;
      for (const rotIndex of pattern) {
        if (benchCountPerRotation[rotIndex] + 1 > benchSlotsPerRotation) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;

      chosen[depth] = pattern;
      for (const rotIndex of pattern) {
        benchCountPerRotation[rotIndex]++;
      }

      search(depth + 1);
      if (found || timedOut) return;

      for (const rotIndex of pattern) {
        benchCountPerRotation[rotIndex]--;
      }
    }

    if (!found && !timedOut) {
      deadStates.add(key);
    }
  }

  search(0);

  if (!found || timedOut) return null;
  return {
    orderedPlayers: playerPools.map((p) => p.player),
    benchSets: chosen.map((set) => [...set]),
  };
}

export function exhaustiveSearch(ctx: SolverContext): RotationSchedule {
  const { players, config, totalRotations, benchSlotsPerRotation, cancellation } = ctx;

  const constraints = prepareConstraints(ctx);
  const {
    goalieMap,
    cannotBench: cannotBenchMap,
    mustBench: mustBenchMap,
    hardFieldPositionLocksByRotation,
    softFieldPositionPrefsByRotation,
    positionContinuityPlayerIdsByRotation,
    softOverrides,
    maxBenchWeightByPlayer,
    rotationWeights,
    totalRotationWeight,
    normalizedPeriodDivisions,
  } = constraints;

  const defaultMaxBenchWeight = totalRotationWeight * (1 - config.minPlayPercentage / 100);
  const getPlayerMaxBenchWeight = (playerId: string): number =>
    maxBenchWeightByPlayer.get(playerId) ?? defaultMaxBenchWeight;

  ctx.onProgress(6, 'game:solver.generating_patterns');

  // For each player, determine how many rotations they should bench
  const benchCounts = calculateBenchCounts(players, totalRotations, benchSlotsPerRotation, config);

  // Ensure bench counts accommodate must-bench rotations (goalie rest + hard bench overrides)
  for (const player of players) {
    const mb = mustBenchMap.get(player.id);
    const current = benchCounts.get(player.id) ?? 0;
    if (mb && mb.size > current) {
      const increase = mb.size - current;
      benchCounts.set(player.id, mb.size);

      // Redistribute: reduce bench from other players (most benched first)
      let remaining = increase;
      const others = [...benchCounts.entries()]
        .filter(([id]) => id !== player.id)
        .sort(([, a], [, b]) => b - a);

      for (const [otherId, otherCount] of others) {
        if (remaining <= 0) break;
        const minBench = mustBenchMap.get(otherId)?.size ?? 0;
        const reducible = otherCount - minBench;
        if (reducible > 0) {
          const reduction = Math.min(remaining, reducible);
          benchCounts.set(otherId, otherCount - reduction);
          remaining -= reduction;
        }
      }
    }
  }

  // Build per-player constraint maps
  const maxConsecutive = config.noConsecutiveBench ? config.maxConsecutiveBench : totalRotations;

  const constraintsPerPlayer: PlayerConstraints[] = players.map((player) => ({
    player,
    cannotBench: cannotBenchMap.get(player.id) ?? new Set<number>(),
    mustBench: mustBenchMap.get(player.id) ?? new Set<number>(),
  }));

  // Generate valid bench patterns, reducing counts where constraints are too tight
  function generatePatternsForPlayer({ cannotBench, mustBench, player }: PlayerConstraints): {
    patterns: BenchPattern[];
    benchCount: number;
  } {
    let targetBenchCount = benchCounts.get(player.id) ?? 0;
    const availableSlots = totalRotations - cannotBench.size;
    targetBenchCount = Math.min(targetBenchCount, availableSlots);
    targetBenchCount = Math.max(targetBenchCount, mustBench.size);

    let patterns = generateBenchPatterns(
      totalRotations,
      targetBenchCount,
      cannotBench,
      mustBench,
      maxConsecutive,
      rotationWeights,
      config.enforceMinPlayTime ? getPlayerMaxBenchWeight(player.id) : undefined,
    );

    while (patterns.length === 0 && targetBenchCount > mustBench.size) {
      targetBenchCount--;
      patterns = generateBenchPatterns(
        totalRotations,
        targetBenchCount,
        cannotBench,
        mustBench,
        maxConsecutive,
        rotationWeights,
        config.enforceMinPlayTime ? getPlayerMaxBenchWeight(player.id) : undefined,
      );
    }

    return { patterns, benchCount: targetBenchCount };
  }

  // First pass: generate patterns, adjusting counts down where needed
  const playerPatterns: { player: Player; patterns: BenchPattern[] }[] = [];

  for (let i = 0; i < constraintsPerPlayer.length; i++) {
    const constraints = constraintsPerPlayer[i];
    const { patterns, benchCount } = generatePatternsForPlayer(constraints);
    if (patterns.length === 0) {
      throw new Error(
        describePlayerPatternFailure({
          playerName: constraints.player.name,
          cannotBench: constraints.cannotBench,
          mustBench: constraints.mustBench,
          targetBenchCount: benchCount,
          totalRotations,
          maxConsecutive,
        }),
      );
    }
    benchCounts.set(constraints.player.id, benchCount);
    playerPatterns.push({ player: constraints.player, patterns });

    const generationProgress = Math.min(
      11,
      6 + Math.floor(((i + 1) / constraintsPerPlayer.length) * 5),
    );
    ctx.onProgress(generationProgress, 'game:solver.generating_patterns');
  }

  // Redistribute deficit: if some players had their bench count reduced,
  // increase bench for players who can absorb more
  const totalBenchSlots = totalRotations * benchSlotsPerRotation;
  const currentTotal = [...benchCounts.values()].reduce((sum, c) => sum + c, 0);
  let deficit = totalBenchSlots - currentTotal;

  if (deficit > 0) {
    // Sort by skill ascending (weaker players absorb more bench first)
    const sortedBySkill = [...constraintsPerPlayer].sort(
      (a, b) => a.player.skillRanking - b.player.skillRanking,
    );

    let safetyCounter = 0;
    while (deficit > 0 && safetyCounter < players.length * totalRotations) {
      safetyCounter++;
      let progressed = false;

      for (const constraints of sortedBySkill) {
        if (deficit <= 0) break;
        const current = benchCounts.get(constraints.player.id) ?? 0;
        const maxAvailable = totalRotations - constraints.cannotBench.size;

        if (current < maxAvailable) {
          const newCount = current + 1;
          const patterns = generateBenchPatterns(
            totalRotations,
            newCount,
            constraints.cannotBench,
            constraints.mustBench,
            maxConsecutive,
            rotationWeights,
            config.enforceMinPlayTime ? getPlayerMaxBenchWeight(constraints.player.id) : undefined,
          );
          if (patterns.length > 0) {
            benchCounts.set(constraints.player.id, newCount);
            const idx = playerPatterns.findIndex((pp) => pp.player.id === constraints.player.id);
            playerPatterns[idx].patterns = patterns;
            deficit--;
            progressed = true;
          }
        }
      }

      if (!progressed) break;
    }
  }

  const totalCombinations = playerPatterns.reduce((p, c) => p * c.patterns.length, 1);
  ctx.onProgress(12, searchingMessage(totalCombinations.toLocaleString()));

  // Sort players by number of patterns (ascending) for better pruning
  playerPatterns.sort((a, b) => a.patterns.length - b.patterns.length);

  // Pre-compute player index mapping after sort for soft override grouping
  const playerIndexById = new Map<string, number>();
  for (let i = 0; i < playerPatterns.length; i++) {
    playerIndexById.set(playerPatterns[i].player.id, i);
  }

  // Group soft overrides by search depth (player index) for incremental scoring.
  // Each entry contains the override's rotationIndex, expected assignment, and whether
  // the player is the goalie for that rotation (which takes priority over bench/field).
  const softOverridesByDepth: Array<
    Array<{ rotationIndex: number; assignment: RotationAssignment; isGoalie: boolean }>
  > = Array.from({ length: playerPatterns.length }, () => []);
  for (const override of softOverrides) {
    const idx = playerIndexById.get(override.playerId);
    if (idx == null) continue;
    if (override.rotationIndex < 0 || override.rotationIndex >= totalRotations) continue;
    softOverridesByDepth[idx].push({
      rotationIndex: override.rotationIndex,
      assignment: override.assignment,
      isGoalie: goalieMap.get(override.rotationIndex) === override.playerId,
    });
  }

  // Search for the best combination
  let bestBenchSets: BenchPattern[] | null = null;
  let bestScore: SolutionScore = { softMissCount: Infinity, strengthVariance: Infinity };
  let combinations = 0;

  const currentBenchSets: BenchPattern[] = new Array<BenchPattern>(players.length);
  const benchCountPerRotation = new Array<number>(totalRotations).fill(0);
  const deadEndStates = new Set<string>();

  // Incremental strength tracking: start with all players on field
  const totalTeamStrength = playerPatterns.reduce((s, pp) => s + pp.player.skillRanking, 0);
  const strengthPerRotation = new Array<number>(totalRotations).fill(totalTeamStrength);
  let softMissCount = 0;

  const effectiveTimeoutMs = ctx.searchTimeoutMs ?? PRIMARY_SEARCH_TIMEOUT_MS;
  const effectiveNodeLimit = ctx.searchNodeLimit ?? PRIMARY_SEARCH_NODE_LIMIT;

  const searchStartTime = Date.now();
  let lastProgressAt = searchStartTime;
  let lastReportedProgress = 12;
  let nodesVisited = 0;
  let searchTimedOut = false;

  const keyBuf = new Uint16Array(totalRotations + 1);
  function stateKey(depth: number): string {
    keyBuf[0] = depth;
    for (let i = 0; i < totalRotations; i++) keyBuf[i + 1] = benchCountPerRotation[i];
    return String.fromCharCode(...keyBuf);
  }

  function search(depth: number): boolean {
    if (cancellation.cancelled) throw new Error('Cancelled');
    if (searchTimedOut) return false;
    if (nodesVisited >= effectiveNodeLimit || Date.now() - searchStartTime > effectiveTimeoutMs) {
      searchTimedOut = true;
      return false;
    }
    nodesVisited++;

    const now = Date.now();
    if (now - lastProgressAt >= 300) {
      const elapsedMs = now - searchStartTime;
      const comboProgress =
        totalCombinations > 0 ? 12 + Math.floor((combinations / totalCombinations) * 32) : 12;
      const timeProgress = 12 + Math.floor(elapsedMs / 300);
      const nodeProgress = 12 + Math.floor(Math.log10(nodesVisited + 1) * 4);
      const progress = Math.min(
        44,
        Math.max(lastReportedProgress, comboProgress, timeProgress, nodeProgress),
      );
      if (progress > lastReportedProgress) {
        lastReportedProgress = progress;
      }
      ctx.onProgress(lastReportedProgress, searchingMessage(combinations.toLocaleString()));
      lastProgressAt = now;
    }

    const remainingPlayers = playerPatterns.length - depth;
    for (let r = 0; r < totalRotations; r++) {
      if (benchCountPerRotation[r] > benchSlotsPerRotation) return false;
      if (benchCountPerRotation[r] + remainingPlayers < benchSlotsPerRotation) return false;
    }

    const key = stateKey(depth);
    if (deadEndStates.has(key)) return false;

    if (depth === playerPatterns.length) {
      // Validate: each rotation must have exactly benchSlotsPerRotation benched
      for (let r = 0; r < totalRotations; r++) {
        if (benchCountPerRotation[r] !== benchSlotsPerRotation) return false;
      }

      // Compute variance from incrementally maintained strengths
      let sum = 0;
      for (let r = 0; r < totalRotations; r++) sum += strengthPerRotation[r];
      const avg = sum / totalRotations;
      let varianceSum = 0;
      for (let r = 0; r < totalRotations; r++) {
        const diff = strengthPerRotation[r] - avg;
        varianceSum += diff * diff;
      }
      const strengthVariance = varianceSum / totalRotations;
      combinations++;

      if (
        softMissCount < bestScore.softMissCount ||
        (softMissCount === bestScore.softMissCount && strengthVariance < bestScore.strengthVariance)
      ) {
        bestScore = { softMissCount, strengthVariance };
        bestBenchSets = currentBenchSets.map((s) => [...s]);
      }
      return true;
    }

    const { patterns } = playerPatterns[depth];
    const skill = playerPatterns[depth].player.skillRanking;
    const depthOverrides = softOverridesByDepth[depth];
    let foundFeasibleCompletion = false;

    for (const pattern of patterns) {
      // Prune: check if adding this pattern would exceed bench slots for any rotation
      let valid = true;
      for (const rotIndex of pattern) {
        if (benchCountPerRotation[rotIndex] + 1 > benchSlotsPerRotation) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;

      // Apply pattern: update bench counts, strengths, and soft miss count
      currentBenchSets[depth] = pattern;
      const patternSet = new Set(pattern);
      for (const rotIndex of pattern) {
        benchCountPerRotation[rotIndex]++;
        strengthPerRotation[rotIndex] -= skill;
      }
      let softMissDelta = 0;
      for (const ov of depthOverrides) {
        const actual = ov.isGoalie
          ? RotationAssignment.Goalie
          : patternSet.has(ov.rotationIndex)
            ? RotationAssignment.Bench
            : RotationAssignment.Field;
        if (actual !== ov.assignment) softMissDelta++;
      }
      softMissCount += softMissDelta;

      if (search(depth + 1)) {
        foundFeasibleCompletion = true;
      }

      // Undo
      softMissCount -= softMissDelta;
      for (const rotIndex of pattern) {
        benchCountPerRotation[rotIndex]--;
        strengthPerRotation[rotIndex] += skill;
      }

      if (searchTimedOut) break;
      if (ctx.feasibilityOnly && foundFeasibleCompletion) break;
    }

    if (!foundFeasibleCompletion && !searchTimedOut) {
      deadEndStates.add(key);
    }

    return foundFeasibleCompletion;
  }

  search(0);

  if (!bestBenchSets) {
    const fallback = findFallbackFeasibleBenchSets({
      constraintsPerPlayer,
      totalRotations,
      benchSlotsPerRotation,
      maxConsecutive,
      enforceMinPlayTime: config.enforceMinPlayTime,
      rotationWeights,
      defaultMaxBenchWeight,
      maxBenchWeightByPlayer: ctx.maxBenchWeightByPlayer,
      cancellation,
      onProgress: ctx.onProgress,
    });
    if (fallback) {
      const fallbackPlayerPatterns = fallback.orderedPlayers.map((player) => ({
        player,
        patterns: [],
      }));
      return buildSchedule(
        fallbackPlayerPatterns,
        fallback.benchSets,
        goalieMap,
        hardFieldPositionLocksByRotation,
        softFieldPositionPrefsByRotation,
        positionContinuityPlayerIdsByRotation,
        players,
        {
          ...config,
          periodDivisions: normalizedPeriodDivisions,
        },
        totalRotations,
      );
    }

    if (searchTimedOut) {
      throw new Error(
        'No valid rotation schedule found within search limit. This setup creates too many combinations to evaluate. Add hard locks or relax no-consecutive-bench/min-play constraints and try again.',
      );
    }

    const rotationConflicts = findRotationCapacityConflicts({
      players,
      constraintsPerPlayer,
      totalRotations,
      benchSlotsPerRotation,
    });
    if (rotationConflicts.length > 0) {
      throw new Error(`No valid rotation schedule: ${rotationConflicts.join(' ')}`);
    }

    throw new Error(
      'No valid rotation schedule found. Constraint combination is infeasible. Check no-consecutive-bench, minimum play time, and goalie rest settings.',
    );
  }

  ctx.onProgress(47, 'game:solver.building_schedule');

  return buildSchedule(
    playerPatterns,
    bestBenchSets,
    goalieMap,
    hardFieldPositionLocksByRotation,
    softFieldPositionPrefsByRotation,
    positionContinuityPlayerIdsByRotation,
    players,
    {
      ...config,
      periodDivisions: normalizedPeriodDivisions,
    },
    totalRotations,
  );
}

export function calculateBenchCounts(
  players: Player[],
  totalRotations: number,
  benchSlotsPerRotation: number,
  config: { skillBalance: boolean },
): Map<string, number> {
  const totalBenchSlots = totalRotations * benchSlotsPerRotation;
  const counts = new Map<string, number>();

  if (!config.skillBalance) {
    // Equal distribution
    const perPlayer = Math.floor(totalBenchSlots / players.length);
    const remainder = totalBenchSlots - perPlayer * players.length;
    const sorted = [...players].sort((a, b) => a.skillRanking - b.skillRanking);
    for (let i = 0; i < sorted.length; i++) {
      counts.set(sorted[i].id, perPlayer + (i < remainder ? 1 : 0));
    }
  } else {
    // Weight by inverse skill: lower skill = more bench
    const maxRank = 5;
    const weights = players.map((p) => maxRank + 1 - p.skillRanking);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    let assigned = 0;
    const weighted = players
      .map((p, i) => ({ player: p, weight: weights[i] }))
      .sort((a, b) => b.weight - a.weight);

    for (const entry of weighted) {
      let benchCount = Math.round((entry.weight / totalWeight) * totalBenchSlots);

      benchCount = Math.min(benchCount, totalRotations);
      benchCount = Math.max(benchCount, 0);

      counts.set(entry.player.id, benchCount);
      assigned += benchCount;
    }

    // Adjust if total doesn't match
    let diff = totalBenchSlots - assigned;
    const adjustOrder =
      diff > 0
        ? [...weighted].sort((a, b) => b.weight - a.weight)
        : [...weighted].sort((a, b) => a.weight - b.weight);

    let idx = 0;
    while (diff !== 0) {
      const entry = adjustOrder[idx % adjustOrder.length];
      const current = counts.get(entry.player.id) ?? 0;
      if (diff > 0 && current < totalRotations) {
        counts.set(entry.player.id, current + 1);
        diff--;
      } else if (diff < 0 && current > 0) {
        counts.set(entry.player.id, current - 1);
        diff++;
      }
      idx++;
      if (idx > adjustOrder.length * totalRotations) break;
    }
  }

  return counts;
}

export function generateBenchPatterns(
  totalRotations: number,
  benchCount: number,
  cannotBench: Set<number>,
  mustBench: Set<number>,
  maxConsecutive: number,
  rotationWeights?: number[],
  maxBenchWeight?: number,
): BenchPattern[] {
  if (mustBench.size > benchCount) return [];
  for (const idx of mustBench) {
    if (cannotBench.has(idx)) return [];
  }

  const weightForRotation = (index: number): number => rotationWeights?.[index] ?? 1;
  const mustBenchWeight = [...mustBench].reduce((sum, idx) => sum + weightForRotation(idx), 0);
  const epsilon = 1e-9;
  if (maxBenchWeight != null && mustBenchWeight > maxBenchWeight + epsilon) {
    return [];
  }

  const availableSlots: number[] = [];
  for (let i = 0; i < totalRotations; i++) {
    if (!cannotBench.has(i) && !mustBench.has(i)) {
      availableSlots.push(i);
    }
  }

  const remaining = benchCount - mustBench.size;
  if (remaining < 0 || remaining > availableSlots.length) return [];

  const mustBenchArr = [...mustBench].sort((a, b) => a - b);
  const results: BenchPattern[] = [];
  const checkConsecutive = maxConsecutive < totalRotations;

  // Incremental consecutive-bench tracking
  const benchedAt = new Array<boolean>(totalRotations).fill(false);
  for (const idx of mustBenchArr) benchedAt[idx] = true;

  // Check if adding slot would create a consecutive run > maxConsecutive
  function wouldExceedConsecutive(slot: number): boolean {
    // Count consecutive benched neighbors before and after this slot
    let run = 1;
    for (let s = slot - 1; s >= 0 && benchedAt[s]; s--) run++;
    for (let s = slot + 1; s < totalRotations && benchedAt[s]; s++) run++;
    return run > maxConsecutive;
  }

  // Validate mustBench slots don't already violate consecutive constraint
  if (checkConsecutive) {
    let consecutive = 0;
    for (let i = 0; i < totalRotations; i++) {
      consecutive = benchedAt[i] ? consecutive + 1 : 0;
      if (consecutive > maxConsecutive) return [];
    }
  }

  function choose(start: number, chosen: number[], chosenWeight: number) {
    if (chosen.length === remaining) {
      if (maxBenchWeight != null && mustBenchWeight + chosenWeight > maxBenchWeight + epsilon) {
        return;
      }
      // Build sorted full pattern
      const fullPattern: number[] = new Array(benchCount);
      let mi = 0;
      let ci = 0;
      let fi = 0;
      while (mi < mustBenchArr.length && ci < chosen.length) {
        if (mustBenchArr[mi] < chosen[ci]) {
          fullPattern[fi++] = mustBenchArr[mi++];
        } else {
          fullPattern[fi++] = chosen[ci++];
        }
      }
      while (mi < mustBenchArr.length) fullPattern[fi++] = mustBenchArr[mi++];
      while (ci < chosen.length) fullPattern[fi++] = chosen[ci++];
      results.push(fullPattern);
      return;
    }

    const slotsNeeded = remaining - chosen.length;
    for (let i = start; i <= availableSlots.length - slotsNeeded; i++) {
      const slot = availableSlots[i];
      const nextWeight = chosenWeight + weightForRotation(slot);
      if (maxBenchWeight != null && mustBenchWeight + nextWeight > maxBenchWeight + epsilon) {
        continue;
      }
      if (checkConsecutive && wouldExceedConsecutive(slot)) continue;
      benchedAt[slot] = true;
      chosen.push(slot);
      choose(i + 1, chosen, nextWeight);
      chosen.pop();
      benchedAt[slot] = false;
    }
  }

  choose(0, [], 0);
  return results;
}

export function buildSchedule(
  playerPatterns: { player: Player; patterns: BenchPattern[] }[],
  benchSets: BenchPattern[],
  goalieMap: Map<number, string>,
  hardFieldPositionLocksByRotation: Map<number, Map<PlayerId, SubPosition>>,
  softFieldPositionPrefsByRotation: Map<number, Map<PlayerId, SubPosition>>,
  positionContinuityPlayerIdsByRotation: Map<number, Set<PlayerId>>,
  allPlayers: Player[],
  config: {
    periods: number;
    periodDivisions: number[];
    usePositions: boolean;
    formation: FormationSlot[];
  },
  totalRotations: number,
): RotationSchedule {
  const rotations: Rotation[] = [];
  const playerMap = config.usePositions ? new Map(allPlayers.map((p) => [p.id, p])) : undefined;
  const positionHistory = config.usePositions
    ? new Map<string, Map<SubPosition, number>>()
    : undefined;
  const plannerLocksByRotation = new Map<number, Map<PlayerId, SubPosition>>();
  for (const [rotationIndex, locks] of hardFieldPositionLocksByRotation.entries()) {
    plannerLocksByRotation.set(rotationIndex, new Map(locks));
  }

  const benchSetLookups = benchSets.map((pattern) => new Set(pattern));

  for (let r = 0; r < totalRotations; r++) {
    const assignments: Record<string, RotationAssignment> = {};
    const periodIndex = getPeriodForRotation(config.periodDivisions, r);

    for (let p = 0; p < playerPatterns.length; p++) {
      const playerId = playerPatterns[p].player.id;
      const isBenched = benchSetLookups[p].has(r);

      if (goalieMap.get(r) === playerId) {
        assignments[playerId] = RotationAssignment.Goalie;
      } else if (isBenched) {
        assignments[playerId] = RotationAssignment.Bench;
      } else {
        assignments[playerId] = RotationAssignment.Field;
      }
    }

    const rotation: Rotation = {
      index: r,
      periodIndex,
      assignments,
      teamStrength: 0,
      violations: [],
    };
    rotation.teamStrength = calculateRotationStrength(rotation, allPlayers);

    // Auto-assign field positions when usePositions is enabled
    if (config.usePositions && config.formation.length > 0 && playerMap) {
      const fieldPlayerIds = Object.entries(assignments)
        .filter(([, a]) => a === RotationAssignment.Field)
        .map(([id]) => id as PlayerId);
      const hardLocksForRotation = hardFieldPositionLocksByRotation.get(r);
      const softPrefsForRotation = softFieldPositionPrefsByRotation.get(r);

      const lockedSubPositions: Partial<Record<PlayerId, SubPosition>> = {};
      if (hardLocksForRotation) {
        for (const [playerId, subPos] of hardLocksForRotation.entries()) {
          if (!fieldPlayerIds.includes(playerId)) {
            throw new Error(
              `R${r + 1}: ${playerMap.get(playerId)?.name ?? 'Player'} has a hard position lock but is not assigned to FIELD.`,
            );
          }
          lockedSubPositions[playerId] = subPos;
        }
      }

      const preferredSubPositions: Partial<Record<PlayerId, SubPosition>> = {};
      if (softPrefsForRotation) {
        for (const [playerId, subPos] of softPrefsForRotation.entries()) {
          if (!fieldPlayerIds.includes(playerId)) continue;
          if (lockedSubPositions[playerId]) continue;
          preferredSubPositions[playerId] = subPos;
        }
      }

      rotation.fieldPositions = autoAssignPositions(
        fieldPlayerIds,
        config.formation,
        playerMap,
        positionHistory,
        {
          lockedSubPositions: Object.keys(lockedSubPositions).length
            ? lockedSubPositions
            : undefined,
          preferredSubPositions: Object.keys(preferredSubPositions).length
            ? preferredSubPositions
            : undefined,
        },
      );
      const continuityPlayers = positionContinuityPlayerIdsByRotation.get(r);
      if (continuityPlayers && continuityPlayers.size > 0) {
        const plannerLocks = plannerLocksByRotation.get(r) ?? new Map<PlayerId, SubPosition>();
        for (const playerId of continuityPlayers) {
          const assignedSubPosition = rotation.fieldPositions[playerId];
          if (assignedSubPosition) plannerLocks.set(playerId, assignedSubPosition);
        }
        if (plannerLocks.size > 0) plannerLocksByRotation.set(r, plannerLocks);
      }
      if (hardLocksForRotation) {
        for (const [playerId, subPos] of hardLocksForRotation.entries()) {
          if (rotation.fieldPositions[playerId] !== subPos) {
            throw new Error(
              `R${r + 1}: hard lock ${subPos} for ${playerMap.get(playerId)?.name ?? 'Player'} could not be satisfied.`,
            );
          }
        }
      }

      // Track position history for diversity in subsequent rotations
      for (const [playerId, subPos] of Object.entries(rotation.fieldPositions)) {
        if (!positionHistory!.has(playerId)) positionHistory!.set(playerId, new Map());
        const playerHist = positionHistory!.get(playerId)!;
        playerHist.set(subPos, (playerHist.get(subPos) ?? 0) + 1);
      }
    }

    rotations.push(rotation);
  }

  // Improve position diversity across the full schedule after initial seeding.
  if (config.usePositions && config.formation.length > 0 && playerMap) {
    optimizePositionAssignments(rotations, playerMap, {
      lockedPositionsByRotation: plannerLocksByRotation,
    });
  }

  const playerStats = calculatePlayerStats(rotations, allPlayers);

  const strengths = rotations.map((r) => r.teamStrength);
  const { avg, variance, min, max } = computeStrengthStats(strengths);

  return {
    rotations,
    playerStats,
    overallStats: {
      strengthVariance: variance,
      minStrength: min,
      maxStrength: max,
      avgStrength: Math.round(avg * 10) / 10,
      violations: [],
      isValid: true,
    },
    generatedAt: Date.now(),
  };
}

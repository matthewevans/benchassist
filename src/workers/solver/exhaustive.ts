import { RotationAssignment } from '@/types/domain.ts';
import type {
  Player,
  GoalieAssignment,
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
import { autoAssignPositions } from '@/utils/positions.ts';
import { optimizePositionAssignments } from './position-planner.ts';
import type { SolverContext, BenchPattern } from './types.ts';

interface PlayerConstraints {
  player: Player;
  cannotBench: Set<number>;
  mustBench: Set<number>;
}

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
  minPlayPercentage: number;
}): BenchPattern[] {
  const { constraints, totalRotations, maxConsecutive, enforceMinPlayTime, minPlayPercentage } =
    params;

  const minBench = constraints.mustBench.size;
  let maxBench = totalRotations - constraints.cannotBench.size;
  if (enforceMinPlayTime) {
    const maxBenchFromMinPlay = Math.floor(totalRotations * (1 - minPlayPercentage / 100));
    maxBench = Math.min(maxBench, maxBenchFromMinPlay);
  }
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
  minPlayPercentage: number;
  cancellation: { cancelled: boolean };
  onProgress: (percentage: number, message: string) => void;
}): { orderedPlayers: Player[]; benchSets: BenchPattern[] } | null {
  const {
    constraintsPerPlayer,
    totalRotations,
    benchSlotsPerRotation,
    maxConsecutive,
    enforceMinPlayTime,
    minPlayPercentage,
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
        minPlayPercentage,
      }),
    }))
    .sort((a, b) => a.patterns.length - b.patterns.length);

  if (playerPools.some((p) => p.patterns.length === 0)) return null;

  const benchCountPerRotation = new Array<number>(totalRotations).fill(0);
  const chosen: BenchPattern[] = new Array<BenchPattern>(playerPools.length);
  let found = false;
  let explored = 0;
  let lastProgressAt = Date.now();
  let lastReportedProgress = 30;

  onProgress(lastReportedProgress, searchingMessage('0'));

  function search(depth: number) {
    if (found) return;
    if (cancellation.cancelled) throw new Error('Cancelled');
    explored++;

    const now = Date.now();
    if (now - lastProgressAt >= 300) {
      const elapsedMs = now - lastProgressAt;
      const bump = Math.max(1, Math.floor(elapsedMs / 300));
      lastReportedProgress = Math.min(88, lastReportedProgress + bump);
      onProgress(lastReportedProgress, searchingMessage(explored.toLocaleString()));
      lastProgressAt = now;
    }

    const remainingPlayers = playerPools.length - depth;
    for (let r = 0; r < totalRotations; r++) {
      if (benchCountPerRotation[r] > benchSlotsPerRotation) return;
      if (benchCountPerRotation[r] + remainingPlayers < benchSlotsPerRotation) return;
    }

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
      if (found) return;

      for (const rotIndex of pattern) {
        benchCountPerRotation[rotIndex]--;
      }
    }
  }

  search(0);

  if (!found) return null;
  return {
    orderedPlayers: playerPools.map((p) => p.player),
    benchSets: chosen.map((set) => [...set]),
  };
}

export function exhaustiveSearch(ctx: SolverContext): RotationSchedule {
  const {
    players,
    config,
    goalieAssignments,
    manualOverrides,
    totalRotations,
    benchSlotsPerRotation,
    cancellation,
  } = ctx;

  const goalieMap = new Map<number, string>();
  const forcedBench = new Map<string, Set<number>>();

  if (config.useGoalie) {
    ctx.onProgress(5, 'game:solver.calculating_goalie');

    // Resolve goalie assignments per period
    const goaliePerPeriod = resolveGoalieAssignments(players, config.periods, goalieAssignments);
    const playerNameById = new Map(players.map((p) => [p.id, p.name]));

    if (config.goalieRestAfterPeriod) {
      for (let period = 0; period < config.periods - 1; period++) {
        if (goaliePerPeriod[period] === goaliePerPeriod[period + 1]) {
          const goalieName = playerNameById.get(goaliePerPeriod[period]) ?? 'Player';
          throw new Error(
            `${goalieName} is assigned goalie in periods ${period + 1} and ${period + 2}. Goalie rest requires them to bench first rotation of period ${period + 2}.`,
          );
        }
      }
    }

    // Build goalie map: rotationIndex -> playerId
    for (let period = 0; period < config.periods; period++) {
      const goalieId = goaliePerPeriod[period];
      for (let rot = 0; rot < config.rotationsPerPeriod; rot++) {
        const rotIndex = period * config.rotationsPerPeriod + rot;
        if (config.goaliePlayFullPeriod) {
          goalieMap.set(rotIndex, goalieId);
        } else if (rot === 0) {
          goalieMap.set(rotIndex, goalieId);
        }
      }
    }

    // Build forced bench set from goalie rest rule
    if (config.goalieRestAfterPeriod) {
      for (let period = 0; period < config.periods; period++) {
        const goalieId = goaliePerPeriod[period];
        const nextPeriodFirstRot = (period + 1) * config.rotationsPerPeriod;
        if (nextPeriodFirstRot < totalRotations) {
          if (!forcedBench.has(goalieId)) forcedBench.set(goalieId, new Set());
          forcedBench.get(goalieId)!.add(nextPeriodFirstRot);
        }
      }
    }
  }

  // Build forced assignments from manual overrides
  const forcedAssignments = new Map<string, Map<number, RotationAssignment>>();
  for (const override of manualOverrides) {
    if (!forcedAssignments.has(override.playerId)) {
      forcedAssignments.set(override.playerId, new Map());
    }
    forcedAssignments.get(override.playerId)!.set(override.rotationIndex, override.assignment);
  }

  ctx.onProgress(10, 'game:solver.generating_patterns');

  // For each player, determine how many rotations they should bench
  const benchCounts = calculateBenchCounts(players, totalRotations, benchSlotsPerRotation, config);

  // Ensure bench counts accommodate forced bench rotations (e.g. goalie rest)
  for (const player of players) {
    const fb = forcedBench.get(player.id);
    const current = benchCounts.get(player.id) ?? 0;
    if (fb && fb.size > current) {
      const increase = fb.size - current;
      benchCounts.set(player.id, fb.size);

      // Redistribute: reduce bench from other players (most benched first)
      let remaining = increase;
      const others = [...benchCounts.entries()]
        .filter(([id]) => id !== player.id)
        .sort(([, a], [, b]) => b - a);

      for (const [otherId, otherCount] of others) {
        if (remaining <= 0) break;
        const minBench = forcedBench.get(otherId)?.size ?? 0;
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

  const constraintsPerPlayer: PlayerConstraints[] = players.map((player) => {
    const cannotBench = new Set<number>();
    for (const [rotIndex, goalieId] of goalieMap.entries()) {
      if (goalieId === player.id) cannotBench.add(rotIndex);
    }
    const forcedOverrides = forcedAssignments.get(player.id);
    if (forcedOverrides) {
      for (const [rotIndex, assignment] of forcedOverrides.entries()) {
        if (assignment === RotationAssignment.Field || assignment === RotationAssignment.Goalie) {
          cannotBench.add(rotIndex);
        }
      }
    }

    const mustBench = new Set<number>();
    const fb = forcedBench.get(player.id);
    if (fb) {
      for (const idx of fb) mustBench.add(idx);
    }
    if (forcedOverrides) {
      for (const [rotIndex, assignment] of forcedOverrides.entries()) {
        if (assignment === RotationAssignment.Bench) mustBench.add(rotIndex);
      }
    }

    return { player, cannotBench, mustBench };
  });

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
    );

    while (patterns.length === 0 && targetBenchCount > mustBench.size) {
      targetBenchCount--;
      patterns = generateBenchPatterns(
        totalRotations,
        targetBenchCount,
        cannotBench,
        mustBench,
        maxConsecutive,
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
      19,
      10 + Math.floor(((i + 1) / constraintsPerPlayer.length) * 9),
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
  ctx.onProgress(20, searchingMessage(totalCombinations.toLocaleString()));

  // Sort players by number of patterns (ascending) for better pruning
  playerPatterns.sort((a, b) => a.patterns.length - b.patterns.length);

  // Search for the best combination
  let bestBenchSets: BenchPattern[] | null = null;
  let bestScore = Infinity;
  let combinations = 0;

  const currentBenchSets: BenchPattern[] = new Array<BenchPattern>(players.length);
  const benchCountPerRotation = new Array<number>(totalRotations).fill(0);

  const searchStartTime = Date.now();
  const SEARCH_TIMEOUT_MS = 10_000;
  let lastProgressAt = searchStartTime;
  let lastReportedProgress = 20;
  let nodesVisited = 0;

  function search(depth: number) {
    if (cancellation.cancelled) throw new Error('Cancelled');
    if (Date.now() - searchStartTime > SEARCH_TIMEOUT_MS && bestBenchSets) return;
    nodesVisited++;

    const now = Date.now();
    if (now - lastProgressAt >= 300) {
      const elapsedMs = now - searchStartTime;
      const comboProgress =
        totalCombinations > 0 ? 20 + Math.floor((combinations / totalCombinations) * 68) : 20;
      const timeProgress = 20 + Math.floor(elapsedMs / 300);
      const nodeProgress = 20 + Math.floor(Math.log10(nodesVisited + 1) * 8);
      const progress = Math.min(
        88,
        Math.max(lastReportedProgress, comboProgress, timeProgress, nodeProgress),
      );
      if (progress > lastReportedProgress) {
        lastReportedProgress = progress;
      }
      ctx.onProgress(lastReportedProgress, searchingMessage(combinations.toLocaleString()));
      lastProgressAt = now;
    }

    if (depth === playerPatterns.length) {
      // Validate: each rotation must have exactly benchSlotsPerRotation benched
      for (let r = 0; r < totalRotations; r++) {
        if (benchCountPerRotation[r] !== benchSlotsPerRotation) return;
      }

      // Score this solution
      const score = scoreSolution(playerPatterns, currentBenchSets, totalRotations);
      combinations++;

      if (score < bestScore) {
        bestScore = score;
        bestBenchSets = currentBenchSets.map((s) => [...s]);
      }
      return;
    }

    const { patterns } = playerPatterns[depth];

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

      // Apply pattern
      currentBenchSets[depth] = pattern;
      for (const rotIndex of pattern) {
        benchCountPerRotation[rotIndex]++;
      }

      search(depth + 1);

      // Undo
      for (const rotIndex of pattern) {
        benchCountPerRotation[rotIndex]--;
      }
    }
  }

  search(0);

  if (!bestBenchSets) {
    const fallback = findFallbackFeasibleBenchSets({
      constraintsPerPlayer,
      totalRotations,
      benchSlotsPerRotation,
      maxConsecutive,
      enforceMinPlayTime: config.enforceMinPlayTime,
      minPlayPercentage: config.minPlayPercentage,
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
        players,
        config,
        totalRotations,
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

  ctx.onProgress(95, 'game:solver.building_schedule');

  return buildSchedule(playerPatterns, bestBenchSets, goalieMap, players, config, totalRotations);
}

function resolveGoalieAssignments(
  players: Player[],
  periods: number,
  assignments: GoalieAssignment[],
): string[] {
  const goalieEligible = players.filter((p) => p.canPlayGoalie);
  const result: string[] = [];

  for (let period = 0; period < periods; period++) {
    const assignment = assignments.find((a) => a.periodIndex === period);
    if (assignment && assignment.playerId !== 'auto') {
      result.push(assignment.playerId);
    } else {
      // Auto-assign: pick the eligible player who has goalied the least
      const counts = new Map<string, number>();
      for (const id of result) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }

      const sorted = [...goalieEligible].sort(
        (a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0),
      );

      // Don't use the same goalie as the previous period if we have alternatives
      const prevGoalie = result[result.length - 1];
      const candidate = sorted.find((p) => p.id !== prevGoalie) ?? sorted[0];

      if (!candidate) {
        throw new Error(`No goalie-eligible player available for period ${period + 1}`);
      }
      result.push(candidate.id);
    }
  }

  return result;
}

function calculateBenchCounts(
  players: Player[],
  totalRotations: number,
  benchSlotsPerRotation: number,
  config: { skillBalance: boolean; enforceMinPlayTime: boolean; minPlayPercentage: number },
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

      if (config.enforceMinPlayTime) {
        const maxBench = Math.floor(totalRotations * (1 - config.minPlayPercentage / 100));
        benchCount = Math.min(benchCount, maxBench);
      }

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

function generateBenchPatterns(
  totalRotations: number,
  benchCount: number,
  cannotBench: Set<number>,
  mustBench: Set<number>,
  maxConsecutive: number,
): BenchPattern[] {
  if (mustBench.size > benchCount) return [];
  for (const idx of mustBench) {
    if (cannotBench.has(idx)) return [];
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

  function isValidPattern(pattern: number[]): boolean {
    if (maxConsecutive >= totalRotations) return true;
    const sorted = [...pattern].sort((a, b) => a - b);
    let consecutive = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        consecutive++;
        if (consecutive > maxConsecutive) return false;
      } else {
        consecutive = 1;
      }
    }
    return true;
  }

  function choose(start: number, chosen: number[]) {
    if (chosen.length === remaining) {
      const fullPattern = [...mustBenchArr, ...chosen].sort((a, b) => a - b);
      if (isValidPattern(fullPattern)) {
        results.push(fullPattern);
      }
      return;
    }

    const slotsNeeded = remaining - chosen.length;
    for (let i = start; i <= availableSlots.length - slotsNeeded; i++) {
      chosen.push(availableSlots[i]);
      choose(i + 1, chosen);
      chosen.pop();
    }
  }

  choose(0, []);
  return results;
}

function scoreSolution(
  playerPatterns: { player: Player; patterns: BenchPattern[] }[],
  benchSets: BenchPattern[],
  totalRotations: number,
): number {
  const benchSetLookups = benchSets.map((pattern) => new Set(pattern));
  const strengths: number[] = [];
  for (let r = 0; r < totalRotations; r++) {
    let strength = 0;
    for (let p = 0; p < playerPatterns.length; p++) {
      if (!benchSetLookups[p].has(r)) {
        strength += playerPatterns[p].player.skillRanking;
      }
    }
    strengths.push(strength);
  }

  const avg = strengths.reduce((s, v) => s + v, 0) / strengths.length;
  return strengths.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / strengths.length;
}

function buildSchedule(
  playerPatterns: { player: Player; patterns: BenchPattern[] }[],
  benchSets: BenchPattern[],
  goalieMap: Map<number, string>,
  allPlayers: Player[],
  config: {
    rotationsPerPeriod: number;
    periods: number;
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

  for (let r = 0; r < totalRotations; r++) {
    const assignments: Record<string, RotationAssignment> = {};
    const periodIndex = Math.floor(r / config.rotationsPerPeriod);

    for (let p = 0; p < playerPatterns.length; p++) {
      const playerId = playerPatterns[p].player.id;
      const isBenched = benchSets[p].includes(r);

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
        .map(([id]) => id);
      rotation.fieldPositions = autoAssignPositions(
        fieldPlayerIds,
        config.formation,
        playerMap,
        positionHistory,
      );

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
    optimizePositionAssignments(rotations, playerMap);
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

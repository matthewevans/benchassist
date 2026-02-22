import type {
  Player,
  GameConfig,
  GoalieAssignment,
  PlayerStats,
  PlayerId,
} from '@/types/domain.ts';
import { resolveGoalieAssignments, generateBenchPatterns } from './exhaustive.ts';
import {
  generateBalancedDivisionCandidates,
  evaluateDivisionCandidate,
  type OptimizationSuggestion,
} from '@/utils/divisionOptimizer.ts';
import {
  getTotalRotationsFromDivisions,
  getPeriodOffsets,
  getPeriodForRotation,
} from '@/utils/rotationLayout.ts';

const MIN_GAP_IMPROVEMENT_PP = 5;
const MAX_PER_PERIOD = 2;

/**
 * Checks whether increasing period divisions can meaningfully reduce the
 * play-time gap. Runs after a successful solve inside the worker.
 *
 * Returns the best feasible suggestion, or null if no improvement ≥5pp exists.
 */
export function checkOptimizationFeasibility(params: {
  currentDivisions: number[];
  players: Player[];
  config: GameConfig;
  goalieAssignments: GoalieAssignment[];
  currentPlayerStats: Record<string, PlayerStats>;
  currentRotationIndex?: number;
}): OptimizationSuggestion | null {
  const { currentDivisions, players, config, goalieAssignments, currentPlayerStats } = params;
  const currentRotationIndex = params.currentRotationIndex ?? 0;

  const benchSlotsPerRotation = players.length - config.fieldSize;
  if (benchSlotsPerRotation <= 0) return null;

  // Compute current gap from solved player stats
  const stats = Object.values(currentPlayerStats);
  if (stats.length === 0) return null;

  const currentMaxPercent = Math.max(...stats.map((s) => s.playPercentage));
  const currentMinPercent = Math.min(...stats.map((s) => s.playPercentage));
  const currentGap = currentMaxPercent - currentMinPercent;

  if (currentGap < MIN_GAP_IMPROVEMENT_PP) return null;

  const currentExtraCount = stats.filter((s) => s.playPercentage === currentMaxPercent).length;

  // Determine locked periods (already played/started) for live games
  let lockedPeriods: Set<number> | undefined;
  if (currentRotationIndex > 0) {
    lockedPeriods = new Set<number>();
    for (let p = 0; p < config.periods; p++) {
      const periodStartRotation = getPeriodOffsets(currentDivisions)[p];
      if (periodStartRotation != null && periodStartRotation < currentRotationIndex) {
        lockedPeriods.add(p);
      }
    }
    // Also lock the period we're currently in (its first rotation has started)
    const currentPeriod = getPeriodForRotation(currentDivisions, currentRotationIndex);
    lockedPeriods.add(currentPeriod);
  }

  // Generate candidates
  const candidates = generateBalancedDivisionCandidates(
    config.periods,
    currentDivisions,
    MAX_PER_PERIOD,
    lockedPeriods,
  );

  if (candidates.length === 0) return null;

  // Evaluate candidates. They arrive in ascending total-rotation order from
  // the generator, so the first feasible match uses the fewest extra divisions.
  const evaluated = candidates
    .map((candidate) => ({
      candidate,
      evaluation: evaluateDivisionCandidate(candidate, players.length, config.fieldSize),
    }))
    .filter((e) => currentGap - e.evaluation.gap >= MIN_GAP_IMPROVEMENT_PP);

  // Check feasibility for each candidate, fewest divisions first
  for (const { candidate, evaluation } of evaluated) {
    if (isDivisionFeasible(candidate, players, config, goalieAssignments)) {
      return {
        suggestedDivisions: candidate,
        currentGap,
        currentMaxPercent,
        suggestedGap: evaluation.gap,
        currentExtraCount,
        suggestedExtraCount: evaluation.extraPlayerCount,
        suggestedMaxPercent: evaluation.maxPlayPercent,
        suggestedMinPercent: evaluation.minPlayPercent,
      };
    }
  }

  return null;
}

/**
 * Quick feasibility check: verifies that goalie assignments, bench counts,
 * and bench patterns all succeed for the given division config.
 */
function isDivisionFeasible(
  candidateDivisions: number[],
  players: Player[],
  config: GameConfig,
  goalieAssignments: GoalieAssignment[],
): boolean {
  try {
    const totalRotations = getTotalRotationsFromDivisions(candidateDivisions);
    const benchSlotsPerRotation = players.length - config.fieldSize;
    if (benchSlotsPerRotation <= 0) return true;

    const periodOffsets = getPeriodOffsets(candidateDivisions);
    const maxConsecutive = config.noConsecutiveBench ? config.maxConsecutiveBench : totalRotations;

    // 1. Check goalie assignments
    let goaliePerPeriod: string[] = [];
    if (config.useGoalie) {
      goaliePerPeriod = resolveGoalieAssignments(
        players,
        config.periods,
        goalieAssignments,
        new Map<number, Set<PlayerId>>(),
      );

      // Verify goalie rest is possible
      if (config.goalieRestAfterPeriod) {
        for (let period = 0; period < config.periods - 1; period++) {
          if (goaliePerPeriod[period] === goaliePerPeriod[period + 1]) {
            return false;
          }
        }
      }
    }

    // 2. Build goalie map (rotation → playerId)
    const goalieMap = new Map<number, string>();
    if (config.useGoalie) {
      for (let period = 0; period < config.periods; period++) {
        const goalieId = goaliePerPeriod[period];
        const periodStart = periodOffsets[period] ?? 0;
        const periodDivision = candidateDivisions[period] ?? 1;
        for (let rot = 0; rot < periodDivision; rot++) {
          const rotIndex = periodStart + rot;
          if (config.goaliePlayFullPeriod || rot === 0) {
            goalieMap.set(rotIndex, goalieId);
          }
        }
      }
    }

    // 3. Build forced bench from goalie rest
    const forcedBench = new Map<string, Set<number>>();
    if (config.useGoalie && config.goalieRestAfterPeriod) {
      for (let period = 0; period < config.periods; period++) {
        const goalieId = goaliePerPeriod[period];
        const nextPeriodFirstRot = periodOffsets[period + 1];
        if (nextPeriodFirstRot != null && nextPeriodFirstRot < totalRotations) {
          if (!forcedBench.has(goalieId)) forcedBench.set(goalieId, new Set());
          forcedBench.get(goalieId)!.add(nextPeriodFirstRot);
        }
      }
    }

    // 4. Capacity check: verify a valid bench-count distribution exists.
    //    For each player compute min required (forced benches) and max feasible
    //    bench count (largest count with valid patterns given their constraints).
    //    A distribution exists iff sum(min) <= totalBenchSlots <= sum(max).
    const totalBenchSlots = totalRotations * benchSlotsPerRotation;
    let sumMinRequired = 0;
    let sumMaxFeasible = 0;

    for (const player of players) {
      const cannotBench = new Set<number>();
      for (const [rotIndex, goalieId] of goalieMap.entries()) {
        if (goalieId === player.id) cannotBench.add(rotIndex);
      }

      const mustBench = new Set<number>();
      const fb = forcedBench.get(player.id);
      if (fb) for (const idx of fb) mustBench.add(idx);

      const minRequired = mustBench.size;
      sumMinRequired += minRequired;

      // Search downward from upper bound for max feasible bench count
      const upperBound = totalRotations - cannotBench.size;
      let maxFeasible = 0;
      for (let count = upperBound; count >= minRequired; count--) {
        const patterns = generateBenchPatterns(
          totalRotations,
          count,
          cannotBench,
          mustBench,
          maxConsecutive,
        );
        if (patterns.length > 0) {
          maxFeasible = count;
          break;
        }
      }

      if (maxFeasible < minRequired) return false;
      sumMaxFeasible += maxFeasible;
    }

    return sumMinRequired <= totalBenchSlots && totalBenchSlots <= sumMaxFeasible;
  } catch {
    return false;
  }
}

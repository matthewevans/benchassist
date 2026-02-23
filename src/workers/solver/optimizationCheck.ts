import type { Player, GameConfig, GoalieAssignment, PlayerStats } from '@/types/domain.ts';
import {
  generateBalancedDivisionCandidates,
  evaluateDivisionCandidate,
  getOptimizationOptionKey,
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
  const { currentDivisions, players, config, currentPlayerStats } = params;
  const currentRotationIndex = params.currentRotationIndex ?? 0;
  const currentTotalRotations = getTotalRotationsFromDivisions(currentDivisions);

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
  // the generator, so we preserve that order in the returned option list.
  const evaluated = candidates
    .map((candidate) => ({
      candidate,
      evaluation: evaluateDivisionCandidate(candidate, players.length, config.fieldSize),
      totalRotations: getTotalRotationsFromDivisions(candidate),
    }))
    .map((entry) => ({
      ...entry,
      improvement: Math.round((currentGap - entry.evaluation.gap) * 10) / 10,
    }))
    .filter((entry) => entry.improvement >= MIN_GAP_IMPROVEMENT_PP);

  const options: OptimizationSuggestion['options'] = evaluated.map(
    ({ candidate, evaluation, totalRotations, improvement }) => {
      let periodsChanged = 0;
      for (let i = 0; i < Math.max(candidate.length, currentDivisions.length); i++) {
        if ((candidate[i] ?? 1) !== (currentDivisions[i] ?? 1)) periodsChanged++;
      }

      return {
        periodDivisions: candidate,
        totalRotations,
        addedRotations: Math.max(0, totalRotations - currentTotalRotations),
        periodsChanged,
        expectedGap: evaluation.gap,
        expectedMaxPercent: evaluation.maxPlayPercent,
        expectedMinPercent: evaluation.minPlayPercent,
        expectedExtraCount: evaluation.extraPlayerCount,
        gapImprovement: improvement,
      };
    },
  );

  if (options.length === 0) return null;

  options.sort((a, b) => {
    if (a.addedRotations !== b.addedRotations) return a.addedRotations - b.addedRotations;
    if (a.periodsChanged !== b.periodsChanged) return a.periodsChanged - b.periodsChanged;
    if (a.totalRotations !== b.totalRotations) return a.totalRotations - b.totalRotations;
    if (a.expectedGap !== b.expectedGap) return a.expectedGap - b.expectedGap;
    return getOptimizationOptionKey(a.periodDivisions).localeCompare(
      getOptimizationOptionKey(b.periodDivisions),
    );
  });

  return {
    currentGap,
    currentMaxPercent,
    currentMinPercent,
    currentExtraCount,
    currentTotalRotations,
    options,
  };
}

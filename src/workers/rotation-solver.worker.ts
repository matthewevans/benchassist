import type { SolverRequest, SolverResponse } from '@/types/solver.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type {
  Rotation,
  RotationSchedule,
  Player,
  GoalieAssignment,
  ManualOverride,
  GameConfig,
} from '@/types/domain.ts';
import { exhaustiveSearch } from './solver/exhaustive.ts';
import {
  calculatePlayerStats,
  computeStrengthStats,
  calculateRotationStrength,
} from '@/utils/stats.ts';
import { validateGoalieAssignments } from '@/utils/validation.ts';
import {
  normalizePeriodDivisions,
  getTotalRotationsFromDivisions,
  getPeriodForRotation,
  getPeriodRange,
} from '@/utils/rotationLayout.ts';

let currentRequestId: string | null = null;
let currentCancellation: { cancelled: boolean } | null = null;

export function mergeSchedules(
  existingRotations: Rotation[],
  newSchedule: RotationSchedule,
  startFromRotation: number,
  players: Player[],
): RotationSchedule {
  const played = existingRotations.slice(0, startFromRotation);
  const firstNewRotationIndex = newSchedule.rotations[0]?.index ?? 0;
  const isFutureOnlySchedule =
    startFromRotation > 0 &&
    newSchedule.rotations.length > 0 &&
    firstNewRotationIndex >= startFromRotation;
  const future = isFutureOnlySchedule
    ? newSchedule.rotations
    : newSchedule.rotations.slice(startFromRotation);
  const merged = [...played, ...future];

  const playerStats = calculatePlayerStats(merged, players);
  const strengths = merged.map((r) => r.teamStrength);
  const { avg, variance, min, max } = computeStrengthStats(strengths);

  return {
    rotations: merged,
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

interface MidGameSolveWindow {
  config: GameConfig;
  periodDivisions: number[];
  goalieAssignments: GoalieAssignment[];
  manualOverrides: ManualOverride[];
  startFromRotation: number;
  startPeriodIndex: number;
}

function buildRotationWeights(periodDivisions: number[]): number[] {
  return periodDivisions.flatMap((division) =>
    Array.from({ length: division }, () => 1 / division),
  );
}

export function buildMidGameMinPlayInputs(params: {
  config: GameConfig;
  players: Player[];
  periodDivisions: number[];
  startFromRotation: number;
  existingRotations: Rotation[];
}): {
  rotationWeights: number[];
  maxBenchWeightByPlayer: Record<string, number>;
} {
  const { config, players, periodDivisions, startFromRotation, existingRotations } = params;
  const fullRotationWeights = buildRotationWeights(periodDivisions);
  const safeStart = Math.max(
    0,
    Math.min(Math.floor(startFromRotation) || 0, fullRotationWeights.length),
  );

  const fullTotalWeight = fullRotationWeights.reduce((sum, weight) => sum + weight, 0);
  const fullMaxBenchWeight = fullTotalWeight * (1 - config.minPlayPercentage / 100);
  const maxBenchWeightByPlayer: Record<string, number> = {};

  for (const player of players) {
    let usedBenchWeight = 0;
    for (let rotationIndex = 0; rotationIndex < safeStart; rotationIndex++) {
      const assignment = existingRotations[rotationIndex]?.assignments[player.id];
      if (assignment === RotationAssignment.Bench) {
        usedBenchWeight += fullRotationWeights[rotationIndex] ?? 0;
      }
    }
    maxBenchWeightByPlayer[player.id] = Math.max(0, fullMaxBenchWeight - usedBenchWeight);
  }

  return {
    rotationWeights: fullRotationWeights.slice(safeStart),
    maxBenchWeightByPlayer,
  };
}

function getTrailingBenchStreak(
  existingRotations: Rotation[],
  playerId: string,
  fromIndex: number,
): number {
  let streak = 0;
  for (let i = fromIndex; i >= 0; i--) {
    const assignment = existingRotations[i]?.assignments[playerId];
    if (assignment === RotationAssignment.Bench) {
      streak++;
      continue;
    }
    break;
  }
  return streak;
}

function findGoalieForPeriod(
  existingRotations: Rotation[],
  periodDivisions: number[],
  periodIndex: number,
): string | null {
  const range = getPeriodRange(periodDivisions, periodIndex);
  if (!range) return null;
  for (let i = range.start; i < range.endExclusive; i++) {
    const rotation = existingRotations[i];
    if (!rotation) continue;
    const goalie = Object.entries(rotation.assignments).find(
      ([, assignment]) => assignment === RotationAssignment.Goalie,
    );
    if (goalie) return goalie[0];
  }
  return null;
}

export function buildMidGameSolveWindow(params: {
  config: GameConfig;
  periodDivisions: number[];
  goalieAssignments: GoalieAssignment[];
  manualOverrides: ManualOverride[];
  startFromRotation: number;
  existingRotations: Rotation[];
  players: Player[];
}): MidGameSolveWindow | null {
  const {
    config,
    periodDivisions,
    goalieAssignments,
    manualOverrides,
    startFromRotation,
    existingRotations,
    players,
  } = params;

  const safeStart = Math.max(0, Math.floor(startFromRotation) || 0);
  const totalRotations = getTotalRotationsFromDivisions(periodDivisions);
  if (safeStart <= 0 || safeStart >= totalRotations) return null;

  const startPeriodIndex = getPeriodForRotation(periodDivisions, safeStart);
  const startRange = getPeriodRange(periodDivisions, startPeriodIndex);
  if (!startRange) return null;

  const startWithinPeriod = safeStart - startRange.start;

  // If goalie is only forced on the first rotation of each period, a mid-period
  // solve window would incorrectly force a goalie for the already-started period.
  if (config.useGoalie && !config.goaliePlayFullPeriod && startWithinPeriod > 0) {
    return null;
  }

  const firstPeriodRemaining = startRange.endExclusive - safeStart;
  if (firstPeriodRemaining <= 0) return null;
  const remainingPeriodDivisions = [
    firstPeriodRemaining,
    ...periodDivisions.slice(startPeriodIndex + 1),
  ];

  const periodEndExclusive = startPeriodIndex + remainingPeriodDivisions.length;
  let windowGoalieAssignments = goalieAssignments
    .filter((assignment) => {
      return (
        assignment.periodIndex >= startPeriodIndex && assignment.periodIndex < periodEndExclusive
      );
    })
    .map((assignment) => ({
      ...assignment,
      periodIndex: assignment.periodIndex - startPeriodIndex,
    }));

  if (config.useGoalie) {
    const hasExplicitStartPeriodGoalie = windowGoalieAssignments.some(
      (assignment) => assignment.periodIndex === 0 && assignment.playerId !== 'auto',
    );
    if (!hasExplicitStartPeriodGoalie) {
      const existingStartPeriodGoalie = findGoalieForPeriod(
        existingRotations,
        periodDivisions,
        startPeriodIndex,
      );
      if (existingStartPeriodGoalie) {
        windowGoalieAssignments = [
          {
            periodIndex: 0,
            playerId: existingStartPeriodGoalie,
          },
          ...windowGoalieAssignments.filter((assignment) => assignment.periodIndex !== 0),
        ];
      }
    }
  }

  const nextManualOverrides = manualOverrides
    .filter((override) => override.rotationIndex >= safeStart)
    .map((override) => ({
      ...override,
      rotationIndex: override.rotationIndex - safeStart,
    }));

  if (config.noConsecutiveBench && config.maxConsecutiveBench > 0) {
    for (const player of players) {
      const trailingBenchStreak = getTrailingBenchStreak(
        existingRotations,
        player.id,
        safeStart - 1,
      );
      if (trailingBenchStreak >= config.maxConsecutiveBench) {
        nextManualOverrides.push({
          playerId: player.id,
          rotationIndex: 0,
          assignment: RotationAssignment.Field,
          lockMode: 'hard',
        });
      }
    }
  }

  if (config.useGoalie && config.goalieRestAfterPeriod && safeStart === startRange.start) {
    const previousPeriodGoalie =
      startPeriodIndex > 0
        ? findGoalieForPeriod(existingRotations, periodDivisions, startPeriodIndex - 1)
        : null;
    if (previousPeriodGoalie) {
      nextManualOverrides.push({
        playerId: previousPeriodGoalie,
        rotationIndex: 0,
        assignment: RotationAssignment.Bench,
        lockMode: 'hard',
      });
    }
  }

  const overrideByKey = new Map<string, ManualOverride>();
  for (const override of nextManualOverrides) {
    overrideByKey.set(`${override.playerId}:${override.rotationIndex}`, override);
  }

  return {
    config: {
      ...config,
      periods: remainingPeriodDivisions.length,
    },
    periodDivisions: remainingPeriodDivisions,
    goalieAssignments: windowGoalieAssignments,
    manualOverrides: [...overrideByKey.values()],
    startFromRotation: safeStart,
    startPeriodIndex,
  };
}

function remapWindowScheduleToGlobal(
  schedule: RotationSchedule,
  startFromRotation: number,
  startPeriodIndex: number,
): RotationSchedule {
  return {
    ...schedule,
    rotations: schedule.rotations.map((rotation, localRotationIndex) => ({
      ...rotation,
      index: startFromRotation + localRotationIndex,
      periodIndex: startPeriodIndex + rotation.periodIndex,
    })),
  };
}

function isInfeasibleScheduleError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('no valid rotation schedule') ||
    normalized.includes('no valid rotation schedule found') ||
    normalized.includes('no valid bench pattern') ||
    normalized.includes('violate current constraints')
  );
}

function buildScheduleFromRotations(rotations: Rotation[], players: Player[]): RotationSchedule {
  const recalculatedRotations = rotations.map((rotation) => ({
    ...rotation,
    teamStrength: calculateRotationStrength(rotation, players),
  }));
  const playerStats = calculatePlayerStats(recalculatedRotations, players);
  const strengths = recalculatedRotations.map((rotation) => rotation.teamStrength);
  const { avg, variance, min, max } = computeStrengthStats(strengths);

  return {
    rotations: recalculatedRotations,
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

self.onmessage = (e: MessageEvent<SolverRequest>) => {
  const request = e.data;

  switch (request.type) {
    case 'SOLVE': {
      currentRequestId = request.payload.requestId;
      const cancellation = { cancelled: false };
      currentCancellation = cancellation;

      try {
        const {
          players,
          config,
          absentPlayerIds,
          goalieAssignments,
          manualOverrides,
          periodDivisions,
          startFromRotation,
          existingRotations,
          allowConstraintRelaxation,
        } = request.payload;

        const onProgress = (percentage: number, message: string) => {
          const response: SolverResponse = {
            type: 'PROGRESS',
            payload: { requestId: request.payload.requestId, percentage, message },
          };
          self.postMessage(response);
        };

        onProgress(1, 'game:solver.initializing');

        const activePlayers = players.filter((p) => !absentPlayerIds.includes(p.id));
        const basePeriodDivisions = normalizePeriodDivisions(
          periodDivisions,
          config.periods,
          config.rotationsPerPeriod,
        );
        const benchSlotsPerRotation = activePlayers.length - config.fieldSize;

        if (benchSlotsPerRotation < 0) {
          throw new Error(
            `Not enough players: ${activePlayers.length} available, ${config.fieldSize} needed on field`,
          );
        }

        const requestedStartFromRotation = Math.max(0, Math.floor(startFromRotation ?? 0));
        const existingMidGameRotations = Array.isArray(existingRotations) ? existingRotations : [];
        const canMergeFromMidGame =
          requestedStartFromRotation > 0 && existingMidGameRotations.length > 0;
        const solveForConfig = (attemptConfig: GameConfig): RotationSchedule => {
          const midGameWindow = canMergeFromMidGame
            ? buildMidGameSolveWindow({
                config: attemptConfig,
                periodDivisions: basePeriodDivisions,
                goalieAssignments,
                manualOverrides,
                startFromRotation: requestedStartFromRotation,
                existingRotations: existingMidGameRotations,
                players: activePlayers,
              })
            : null;

          const solveConfig = midGameWindow?.config ?? attemptConfig;
          const solvePeriodDivisions = midGameWindow?.periodDivisions ?? basePeriodDivisions;
          const solveGoalieAssignments = midGameWindow?.goalieAssignments ?? goalieAssignments;
          const solveManualOverrides = midGameWindow?.manualOverrides ?? manualOverrides;
          const mergeStartFrom = midGameWindow?.startFromRotation ?? requestedStartFromRotation;
          const solveTotalRotations = getTotalRotationsFromDivisions(solvePeriodDivisions);
          const midGameMinPlay =
            midGameWindow && attemptConfig.enforceMinPlayTime
              ? buildMidGameMinPlayInputs({
                  config: attemptConfig,
                  players: activePlayers,
                  periodDivisions: basePeriodDivisions,
                  startFromRotation: midGameWindow.startFromRotation,
                  existingRotations: existingMidGameRotations,
                })
              : null;
          const solveRotationWeights = midGameMinPlay?.rotationWeights;

          if (solveRotationWeights && solveRotationWeights.length !== solveTotalRotations) {
            throw new Error('Period divisions do not match total rotations.');
          }

          const goalieAssignmentErrors = validateGoalieAssignments(
            activePlayers,
            solveConfig,
            solveGoalieAssignments,
          );
          if (goalieAssignmentErrors.length > 0) {
            throw new Error(goalieAssignmentErrors[0]);
          }

          const newSchedule = exhaustiveSearch({
            players: activePlayers,
            config: solveConfig,
            goalieAssignments: solveGoalieAssignments,
            manualOverrides: solveManualOverrides,
            periodDivisions: solvePeriodDivisions,
            rotationWeights: solveRotationWeights,
            maxBenchWeightByPlayer: midGameMinPlay?.maxBenchWeightByPlayer,
            totalRotations: solveTotalRotations,
            benchSlotsPerRotation,
            onProgress,
            cancellation,
          });

          return canMergeFromMidGame
            ? mergeSchedules(
                existingMidGameRotations,
                midGameWindow
                  ? remapWindowScheduleToGlobal(
                      newSchedule,
                      midGameWindow.startFromRotation,
                      midGameWindow.startPeriodIndex,
                    )
                  : newSchedule,
                Math.min(mergeStartFrom, existingMidGameRotations.length),
                activePlayers,
              )
            : newSchedule;
        };

        const relaxationCandidates: GameConfig[] = [];
        if (allowConstraintRelaxation === true) {
          if (config.noConsecutiveBench) {
            relaxationCandidates.push({
              ...config,
              noConsecutiveBench: false,
            });
          }
        }

        let schedule: RotationSchedule | null = null;
        let lastError: unknown = null;
        const attempts: GameConfig[] = [config, ...relaxationCandidates];

        for (const attempt of attempts) {
          try {
            schedule = solveForConfig(attempt);
            break;
          } catch (error) {
            lastError = error;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (!isInfeasibleScheduleError(errorMessage)) {
              throw error;
            }
          }
        }

        if (!schedule) {
          const canKeepExistingAsFallback =
            allowConstraintRelaxation === true && existingMidGameRotations.length > 0;
          if (canKeepExistingAsFallback) {
            schedule = buildScheduleFromRotations(existingMidGameRotations, activePlayers);
          } else {
            throw lastError ?? new Error('No valid rotation schedule found.');
          }
        }

        const response: SolverResponse = {
          type: 'SUCCESS',
          payload: { requestId: request.payload.requestId, schedule },
        };
        self.postMessage(response);
      } catch (error) {
        if ((error as Error).message === 'Cancelled') return;

        const response: SolverResponse = {
          type: 'ERROR',
          payload: {
            requestId: request.payload.requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
        self.postMessage(response);
      }

      currentRequestId = null;
      currentCancellation = null;
      break;
    }

    case 'CANCEL': {
      if (request.payload.requestId === currentRequestId && currentCancellation) {
        currentCancellation.cancelled = true;
      }
      break;
    }
  }
};

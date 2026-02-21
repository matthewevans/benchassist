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
import { calculatePlayerStats, computeStrengthStats } from '@/utils/stats.ts';
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
  const windowGoalieAssignments = goalieAssignments
    .filter((assignment) => {
      return (
        assignment.periodIndex >= startPeriodIndex && assignment.periodIndex < periodEndExclusive
      );
    })
    .map((assignment) => ({
      ...assignment,
      periodIndex: assignment.periodIndex - startPeriodIndex,
    }));

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
        const canMergeFromMidGame =
          requestedStartFromRotation > 0 && Array.isArray(existingRotations);
        const midGameWindow = canMergeFromMidGame
          ? buildMidGameSolveWindow({
              config,
              periodDivisions: basePeriodDivisions,
              goalieAssignments,
              manualOverrides,
              startFromRotation: requestedStartFromRotation,
              existingRotations,
              players: activePlayers,
            })
          : null;

        const solveConfig = midGameWindow?.config ?? config;
        const solvePeriodDivisions = midGameWindow?.periodDivisions ?? basePeriodDivisions;
        const solveGoalieAssignments = midGameWindow?.goalieAssignments ?? goalieAssignments;
        const solveManualOverrides = midGameWindow?.manualOverrides ?? manualOverrides;
        const mergeStartFrom = midGameWindow?.startFromRotation ?? requestedStartFromRotation;
        const solveTotalRotations = getTotalRotationsFromDivisions(solvePeriodDivisions);

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
          totalRotations: solveTotalRotations,
          benchSlotsPerRotation,
          onProgress,
          cancellation,
        });

        const schedule = canMergeFromMidGame
          ? mergeSchedules(
              existingRotations,
              midGameWindow
                ? remapWindowScheduleToGlobal(
                    newSchedule,
                    midGameWindow.startFromRotation,
                    midGameWindow.startPeriodIndex,
                  )
                : newSchedule,
              Math.min(mergeStartFrom, existingRotations.length),
              activePlayers,
            )
          : newSchedule;

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

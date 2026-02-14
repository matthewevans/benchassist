import type { SolverRequest, SolverResponse } from '@/types/solver.ts';
import type { Rotation, RotationSchedule, Player } from '@/types/domain.ts';
import { exhaustiveSearch } from './solver/exhaustive.ts';
import { calculatePlayerStats } from '@/utils/stats.ts';

let currentRequestId: string | null = null;
let currentCancellation: { cancelled: boolean } | null = null;

export function mergeSchedules(
  existingRotations: Rotation[],
  newSchedule: RotationSchedule,
  startFromRotation: number,
  players: Player[],
): RotationSchedule {
  const played = existingRotations.slice(0, startFromRotation);
  const future = newSchedule.rotations.slice(startFromRotation);
  const merged = [...played, ...future];

  const playerStats = calculatePlayerStats(merged, players);
  const strengths = merged.map((r) => r.teamStrength);
  const avg = strengths.length > 0
    ? strengths.reduce((s, v) => s + v, 0) / strengths.length
    : 0;
  const variance = strengths.length > 0
    ? strengths.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / strengths.length
    : 0;

  return {
    rotations: merged,
    playerStats,
    overallStats: {
      strengthVariance: variance,
      minStrength: Math.min(...strengths),
      maxStrength: Math.max(...strengths),
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
        const { players, config, absentPlayerIds, goalieAssignments, manualOverrides, startFromRotation, existingRotations } = request.payload;

        const activePlayers = players.filter((p) => !absentPlayerIds.includes(p.id));
        const totalRotations = config.periods * config.rotationsPerPeriod;
        const benchSlotsPerRotation = activePlayers.length - config.fieldSize;

        if (benchSlotsPerRotation < 0) {
          throw new Error(
            `Not enough players: ${activePlayers.length} available, ${config.fieldSize} needed on field`,
          );
        }

        const onProgress = (percentage: number, message: string) => {
          const response: SolverResponse = {
            type: 'PROGRESS',
            payload: { requestId: request.payload.requestId, percentage, message },
          };
          self.postMessage(response);
        };

        const newSchedule = exhaustiveSearch({
          players: activePlayers,
          config,
          goalieAssignments,
          manualOverrides,
          totalRotations,
          benchSlotsPerRotation,
          onProgress,
          cancellation,
        });

        const schedule = startFromRotation && startFromRotation > 0 && existingRotations
          ? mergeSchedules(existingRotations, newSchedule, startFromRotation, activePlayers)
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

import type { SolverRequest, SolverResponse } from '@/types/solver.ts';
import { exhaustiveSearch, setCancelled } from './solver/exhaustive.ts';

let currentRequestId: string | null = null;

self.onmessage = (e: MessageEvent<SolverRequest>) => {
  const request = e.data;

  switch (request.type) {
    case 'SOLVE': {
      currentRequestId = request.payload.requestId;
      setCancelled(false);

      try {
        const { players, config, absentPlayerIds, goalieAssignments, manualOverrides } = request.payload;

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

        const schedule = exhaustiveSearch({
          players: activePlayers,
          config,
          goalieAssignments,
          manualOverrides,
          totalRotations,
          benchSlotsPerRotation,
          onProgress,
        });

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
      break;
    }

    case 'CANCEL': {
      if (request.payload.requestId === currentRequestId) {
        setCancelled(true);
      }
      break;
    }
  }
};

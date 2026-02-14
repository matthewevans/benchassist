import type { Player, GameConfig, GoalieAssignment, ManualOverride, RotationSchedule } from './domain.ts';

export type SolverRequest =
  | {
      type: 'SOLVE';
      payload: {
        requestId: string;
        players: Player[];
        config: GameConfig;
        absentPlayerIds: string[];
        goalieAssignments: GoalieAssignment[];
        manualOverrides: ManualOverride[];
        startFromRotation?: number; // for mid-game re-solve
      };
    }
  | {
      type: 'CANCEL';
      payload: { requestId: string };
    };

export type SolverResponse =
  | {
      type: 'PROGRESS';
      payload: {
        requestId: string;
        percentage: number;
        message: string;
      };
    }
  | {
      type: 'SUCCESS';
      payload: {
        requestId: string;
        schedule: RotationSchedule;
      };
    }
  | {
      type: 'ERROR';
      payload: {
        requestId: string;
        error: string;
      };
    };

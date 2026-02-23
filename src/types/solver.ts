import type {
  Player,
  GameConfig,
  GoalieAssignment,
  ManualOverride,
  PlayerId,
  Rotation,
  RotationSchedule,
  SubPosition,
} from './domain.ts';
import type { OptimizationSuggestion } from '@/utils/divisionOptimizer.ts';

export interface PositionContinuityPreference {
  rotationIndex: number;
  playerId: PlayerId;
  fieldPosition: SubPosition;
}

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
        positionContinuityPreferences?: PositionContinuityPreference[];
        periodDivisions?: number[]; // per-period rotation counts (defaults from config)
        startFromRotation?: number; // for mid-game re-solve
        existingRotations?: Rotation[]; // played rotations to preserve
        allowConstraintRelaxation?: boolean; // for live regenerate fallback behavior
        skipOptimizationCheck?: boolean; // skip post-solve optimization detection
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
        optimizationSuggestion?: OptimizationSuggestion;
      };
    }
  | {
      type: 'ERROR';
      payload: {
        requestId: string;
        error: string;
      };
    };

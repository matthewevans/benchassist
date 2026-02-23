import type { Player, GameConfig, GoalieAssignment, ManualOverride } from '@/types/domain.ts';
import type { PositionContinuityPreference } from '@/types/solver.ts';

export interface SolverContext {
  players: Player[];
  config: GameConfig;
  goalieAssignments: GoalieAssignment[];
  manualOverrides: ManualOverride[];
  positionContinuityPreferences?: PositionContinuityPreference[];
  periodDivisions?: number[];
  rotationWeights?: number[];
  maxBenchWeightByPlayer?: Record<string, number>;
  totalRotations: number;
  benchSlotsPerRotation: number;
  onProgress: (percentage: number, message: string) => void;
  cancellation: { cancelled: boolean };
  /** Override primary search timeout (default 12s) */
  searchTimeoutMs?: number;
  /** Override primary search node limit (exhaustive solver only) */
  searchNodeLimit?: number;
  /** Stop after finding any valid combination instead of optimizing */
  feasibilityOnly?: boolean;
}

// A bench pattern is an array of rotation indices where a player sits out
export type BenchPattern = number[];

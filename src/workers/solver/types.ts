import type { Player, GameConfig, GoalieAssignment, ManualOverride } from '@/types/domain.ts';

export interface SolverContext {
  players: Player[];
  config: GameConfig;
  goalieAssignments: GoalieAssignment[];
  manualOverrides: ManualOverride[];
  periodDivisions?: number[];
  rotationWeights?: number[];
  maxBenchWeightByPlayer?: Record<string, number>;
  totalRotations: number;
  benchSlotsPerRotation: number;
  onProgress: (percentage: number, message: string) => void;
  cancellation: { cancelled: boolean };
}

// A bench pattern is an array of rotation indices where a player sits out
export type BenchPattern = number[];

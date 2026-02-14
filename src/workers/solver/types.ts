import type { Player, GameConfig, GoalieAssignment, ManualOverride, RotationAssignment } from '@/types/domain.ts';

export interface SolverContext {
  players: Player[];
  config: GameConfig;
  goalieAssignments: GoalieAssignment[];
  manualOverrides: ManualOverride[];
  totalRotations: number;
  benchSlotsPerRotation: number;
  onProgress: (percentage: number, message: string) => void;
}

// A bench pattern is an array of rotation indices where a player sits out
export type BenchPattern = number[];

// A complete solution assigns assignments to each player per rotation
export interface Solution {
  assignments: Record<string, RotationAssignment>[];
  score: number;
}

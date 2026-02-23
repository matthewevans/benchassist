import type { HighsSolution } from 'highs';
import type { Player } from '@/types/domain.ts';
import type { PreparedConstraints } from './constraintPreparation.ts';

/**
 * Map a HiGHS non-optimal status to a user-friendly error message.
 * Performs post-hoc conflict detection for infeasible models.
 */
export function mapMipError(
  solution: HighsSolution,
  players: Player[],
  constraints: PreparedConstraints,
  totalRotations: number,
  benchSlotsPerRotation: number,
): Error {
  if (solution.Status === 'Infeasible') {
    const conflicts = detectConflicts(players, constraints, totalRotations, benchSlotsPerRotation);
    if (conflicts.length > 0) {
      return new Error(`No valid rotation schedule: ${conflicts.join(' ')}`);
    }
    return new Error(
      'No valid rotation schedule found. Constraint combination is infeasible. ' +
        'Check no-consecutive-bench, minimum play time, and goalie rest settings.',
    );
  }

  if (solution.Status === 'Time limit reached') {
    return new Error(
      'No valid rotation schedule found within search limit. ' +
        'Add hard locks or relax constraints and try again.',
    );
  }

  return new Error(`Solver error: ${solution.Status}`);
}

function detectConflicts(
  players: Player[],
  constraints: PreparedConstraints,
  totalRotations: number,
  benchSlotsPerRotation: number,
): string[] {
  const conflicts: string[] = [];

  // Check per-player mustBench/cannotBench overlap
  for (const player of players) {
    const must = constraints.mustBench.get(player.id);
    const cannot = constraints.cannotBench.get(player.id);
    if (must && cannot) {
      const overlap = [...must].filter((r) => cannot.has(r));
      if (overlap.length > 0) {
        const rotLabels = overlap
          .sort((a, b) => a - b)
          .map((r) => `R${r + 1}`)
          .join(', ');
        conflicts.push(`${player.name}: conflict on ${rotLabels} (must bench and cannot bench).`);
      }
    }
  }

  // Check per-rotation forced bench overflow
  for (let r = 0; r < totalRotations; r++) {
    let forcedBenchCount = 0;
    let canBenchCount = 0;
    const forcedPlayers: string[] = [];

    for (const player of players) {
      const must = constraints.mustBench.get(player.id);
      const cannot = constraints.cannotBench.get(player.id);
      if (must?.has(r)) {
        forcedBenchCount++;
        forcedPlayers.push(player.name);
      }
      if (!cannot?.has(r)) {
        canBenchCount++;
      }
    }

    if (forcedBenchCount > benchSlotsPerRotation) {
      conflicts.push(
        `R${r + 1}: ${forcedBenchCount} players are forced to bench ` +
          `(max allowed ${benchSlotsPerRotation}). Forced: ${forcedPlayers.join(', ')}.`,
      );
    } else if (canBenchCount < benchSlotsPerRotation) {
      conflicts.push(
        `R${r + 1}: only ${canBenchCount} players can bench, ` +
          `but ${benchSlotsPerRotation} bench slots are required.`,
      );
    }
  }

  return conflicts;
}

import { describe, expect, it } from 'vitest';
import type { HighsSolution } from 'highs';
import type { Player } from '@/types/domain.ts';
import type { PreparedConstraints } from './constraintPreparation.ts';
import { mapMipError } from './mipErrorMapper.ts';

const players: Player[] = [
  {
    id: 'p1',
    name: 'Rin',
    skillRanking: 5,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p2',
    name: 'Niko',
    skillRanking: 2,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p3',
    name: 'Mika',
    skillRanking: 3,
    canPlayGoalie: false,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
];

function makeConstraints(): PreparedConstraints {
  return {
    goalieMap: new Map<number, string>(),
    cannotBench: new Map<string, Set<number>>(),
    mustBench: new Map<string, Set<number>>(),
    hardFieldPositionLocksByRotation: new Map(),
    softFieldPositionPrefsByRotation: new Map(),
    softOverrides: [],
    maxBenchWeightByPlayer: new Map(),
    rotationWeights: [1, 1],
    totalRotationWeight: 2,
    normalizedPeriodDivisions: [1, 1],
  };
}

describe('mapMipError', () => {
  it('reports overlap conflicts for mustBench/cannotBench', () => {
    const constraints = makeConstraints();
    constraints.mustBench.set(players[0].id, new Set([0]));
    constraints.cannotBench.set(players[0].id, new Set([0]));

    const error = mapMipError(
      { Status: 'Infeasible' } as HighsSolution,
      players,
      constraints,
      2,
      1,
    );

    expect(error.message).toContain('No valid rotation schedule');
    expect(error.message).toContain('R1');
    expect(error.message).toContain('must bench and cannot bench');
  });

  it('reports forced-bench overflow conflicts per rotation', () => {
    const constraints = makeConstraints();
    constraints.mustBench.set(players[0].id, new Set([0]));
    constraints.mustBench.set(players[1].id, new Set([0]));
    constraints.cannotBench.set(players[0].id, new Set());
    constraints.cannotBench.set(players[1].id, new Set());
    constraints.cannotBench.set(players[2].id, new Set());

    const error = mapMipError(
      { Status: 'Infeasible' } as HighsSolution,
      players,
      constraints,
      2,
      1,
    );

    expect(error.message).toContain('R1');
    expect(error.message).toContain('forced to bench');
    expect(error.message).toContain('max allowed 1');
  });

  it('reports when too few players can bench for required slots', () => {
    const constraints = makeConstraints();
    constraints.cannotBench.set(players[0].id, new Set([0]));
    constraints.cannotBench.set(players[1].id, new Set([0]));
    constraints.cannotBench.set(players[2].id, new Set());

    const error = mapMipError(
      { Status: 'Infeasible' } as HighsSolution,
      players,
      constraints,
      2,
      2,
    );

    expect(error.message).toContain('R1');
    expect(error.message).toContain('only 1 players can bench');
    expect(error.message).toContain('2 bench slots are required');
  });

  it('returns a generic infeasible message when no concrete conflicts are detected', () => {
    const error = mapMipError(
      { Status: 'Infeasible' } as HighsSolution,
      players,
      makeConstraints(),
      2,
      1,
    );

    expect(error.message).toContain('Constraint combination is infeasible');
  });

  it('returns the time limit guidance message', () => {
    const error = mapMipError(
      { Status: 'Time limit reached' } as HighsSolution,
      players,
      makeConstraints(),
      2,
      1,
    );

    expect(error.message).toContain('within search limit');
    expect(error.message).toContain('relax constraints');
  });

  it('returns the raw solver status for unknown statuses', () => {
    const error = mapMipError(
      { Status: 'Unknown status' } as HighsSolution,
      players,
      makeConstraints(),
      2,
      1,
    );

    expect(error.message).toBe('Solver error: Unknown status');
  });
});

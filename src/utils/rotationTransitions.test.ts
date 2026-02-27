import { RotationAssignment } from '@/types/domain.ts';
import type { PlayerId, Rotation, SubPosition } from '@/types/domain.ts';
import { getRotationTransitions } from '@/utils/rotationTransitions.ts';

function makeRotation(
  assignments: Record<string, RotationAssignment>,
  fieldPositions?: Record<string, SubPosition>,
): Rotation {
  return {
    index: 0,
    periodIndex: 0,
    assignments: assignments as Record<PlayerId, RotationAssignment>,
    fieldPositions: fieldPositions as Record<PlayerId, SubPosition> | undefined,
    teamStrength: 0,
    violations: [],
  };
}

describe('getRotationTransitions', () => {
  it('returns empty array when nextRotation is undefined', () => {
    const current = makeRotation({ p1: RotationAssignment.Field });
    expect(getRotationTransitions(current, undefined)).toEqual([]);
  });

  it('classifies bench-to-field as "in"', () => {
    const current = makeRotation({ p1: RotationAssignment.Bench });
    const next = makeRotation({ p1: RotationAssignment.Field });

    const transitions = getRotationTransitions(current, next);
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({ playerId: 'p1', kind: 'in' });
  });

  it('classifies field-to-bench as "out"', () => {
    const current = makeRotation({ p1: RotationAssignment.Field });
    const next = makeRotation({ p1: RotationAssignment.Bench });

    const transitions = getRotationTransitions(current, next);
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({ playerId: 'p1', kind: 'out' });
  });

  it('classifies field-to-goalie as "role"', () => {
    const current = makeRotation({ p1: RotationAssignment.Field });
    const next = makeRotation({ p1: RotationAssignment.Goalie });

    const transitions = getRotationTransitions(current, next);
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({ playerId: 'p1', kind: 'role' });
  });

  it('classifies goalie-to-bench as "out"', () => {
    const current = makeRotation({ p1: RotationAssignment.Goalie });
    const next = makeRotation({ p1: RotationAssignment.Bench });

    const transitions = getRotationTransitions(current, next);
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({ playerId: 'p1', kind: 'out' });
  });

  it('classifies same-assignment-different-position as "position"', () => {
    const current = makeRotation({ p1: RotationAssignment.Field }, { p1: 'CM' as SubPosition });
    const next = makeRotation({ p1: RotationAssignment.Field }, { p1: 'LW' as SubPosition });

    const transitions = getRotationTransitions(current, next);
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({
      playerId: 'p1',
      kind: 'position',
      fromPos: 'CM',
      toPos: 'LW',
    });
  });

  it('excludes players with no changes', () => {
    const current = makeRotation({
      p1: RotationAssignment.Field,
      p2: RotationAssignment.Bench,
    });
    const next = makeRotation({
      p1: RotationAssignment.Field,
      p2: RotationAssignment.Field,
    });

    const transitions = getRotationTransitions(current, next);
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({ playerId: 'p2', kind: 'in' });
  });

  it('includes players that only appear in one rotation', () => {
    const current = makeRotation({ p1: RotationAssignment.Field });
    const next = makeRotation({
      p1: RotationAssignment.Field,
      p2: RotationAssignment.Field,
    });

    const transitions = getRotationTransitions(current, next);
    // p2 goes from undefined → Field. undefined !== Bench, so it's classified as 'role'
    expect(transitions).toHaveLength(1);
    expect(transitions[0]).toMatchObject({ playerId: 'p2', kind: 'role' });
  });

  it('returns multiple transitions for several changing players', () => {
    const current = makeRotation({
      p1: RotationAssignment.Field,
      p2: RotationAssignment.Bench,
      p3: RotationAssignment.Goalie,
    });
    const next = makeRotation({
      p1: RotationAssignment.Bench,
      p2: RotationAssignment.Field,
      p3: RotationAssignment.Goalie,
    });

    const transitions = getRotationTransitions(current, next);
    expect(transitions).toHaveLength(2);
    expect(transitions.find((t) => t.playerId === 'p1')?.kind).toBe('out');
    expect(transitions.find((t) => t.playerId === 'p2')?.kind).toBe('in');
  });
});

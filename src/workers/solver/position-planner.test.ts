import { describe, it, expect, beforeEach } from 'vitest';
import { RotationAssignment } from '@/types/domain.ts';
import type { Player, Position, Rotation, SubPosition } from '@/types/domain.ts';
import { playerFactory, resetFactories } from '@/test/factories.ts';
import { optimizePositionAssignments } from './position-planner.ts';

const SUB_POSITION_GROUP: Record<SubPosition, Position> = {
  LB: 'DEF',
  CB: 'DEF',
  RB: 'DEF',
  LCB: 'DEF',
  RCB: 'DEF',
  LM: 'MID',
  CM: 'MID',
  RM: 'MID',
  LCM: 'MID',
  RCM: 'MID',
  LW: 'FWD',
  RW: 'FWD',
  ST: 'FWD',
  CF: 'FWD',
};

beforeEach(() => {
  resetFactories();
});

function buildFieldRotation(
  index: number,
  fieldPositions: Record<string, SubPosition>,
  players: Player[],
): Rotation {
  const assignments: Rotation['assignments'] = {};
  for (const player of players) {
    assignments[player.id] = RotationAssignment.Field;
  }
  return {
    index,
    periodIndex: 0,
    assignments,
    fieldPositions,
    teamStrength: 0,
    violations: [],
  };
}

function countNoPreferenceGroupRepeatPenalty(rotations: Rotation[], players: Player[]): number {
  let penalty = 0;

  for (const player of players) {
    const groupCounts = new Map<Position, number>();
    for (const rotation of rotations) {
      const subPos = rotation.fieldPositions?.[player.id];
      if (!subPos) continue;
      const group = SUB_POSITION_GROUP[subPos];
      groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    }

    for (const count of groupCounts.values()) {
      penalty += count * (count - 1);
    }
  }

  return penalty;
}

describe('optimizePositionAssignments', () => {
  it('reduces no-preference position-group stickiness across the schedule', () => {
    const players = playerFactory
      .buildList(3)
      .map((player) => ({ ...player, primaryPosition: null, secondaryPositions: [] }));
    const playerMap = new Map(players.map((player) => [player.id, player]));

    const rotations: Rotation[] = [
      buildFieldRotation(
        0,
        { [players[0].id]: 'CB', [players[1].id]: 'CM', [players[2].id]: 'ST' },
        players,
      ),
      buildFieldRotation(
        1,
        { [players[0].id]: 'CB', [players[1].id]: 'CM', [players[2].id]: 'ST' },
        players,
      ),
      buildFieldRotation(
        2,
        { [players[0].id]: 'CB', [players[1].id]: 'CM', [players[2].id]: 'ST' },
        players,
      ),
    ];

    const beforePenalty = countNoPreferenceGroupRepeatPenalty(rotations, players);
    const beforeSlotSets = rotations.map((rotation) =>
      Object.values(rotation.fieldPositions ?? {}).sort(),
    );

    optimizePositionAssignments(rotations, playerMap, { timeoutMs: 50 });

    const afterPenalty = countNoPreferenceGroupRepeatPenalty(rotations, players);
    const afterSlotSets = rotations.map((rotation) =>
      Object.values(rotation.fieldPositions ?? {}).sort(),
    );

    expect(afterPenalty).toBeLessThan(beforePenalty);

    // Swaps should preserve the exact set of slots used in each rotation.
    expect(afterSlotSets).toEqual(beforeSlotSets);
  });

  it('does nothing when rotations have no field positions', () => {
    const players = playerFactory.buildList(2);
    const playerMap = new Map(players.map((player) => [player.id, player]));

    const rotations: Rotation[] = [
      {
        index: 0,
        periodIndex: 0,
        assignments: {
          [players[0].id]: RotationAssignment.Field,
          [players[1].id]: RotationAssignment.Bench,
        },
        teamStrength: 0,
        violations: [],
      },
    ];

    optimizePositionAssignments(rotations, playerMap, { timeoutMs: 50 });

    expect(rotations[0].fieldPositions).toBeUndefined();
  });

  it('preserves hard-locked positions during optimization swaps', () => {
    const players = playerFactory
      .buildList(3)
      .map((player) => ({ ...player, primaryPosition: null, secondaryPositions: [] }));
    const playerMap = new Map(players.map((player) => [player.id, player]));

    const rotations: Rotation[] = [
      buildFieldRotation(
        0,
        { [players[0].id]: 'CB', [players[1].id]: 'CM', [players[2].id]: 'ST' },
        players,
      ),
      buildFieldRotation(
        1,
        { [players[0].id]: 'CB', [players[1].id]: 'CM', [players[2].id]: 'ST' },
        players,
      ),
    ];

    const locks = new Map<number, Map<string, SubPosition>>([
      [0, new Map([[players[0].id, 'CB']])],
      [1, new Map([[players[0].id, 'CB']])],
    ]);

    optimizePositionAssignments(rotations, playerMap, {
      timeoutMs: 50,
      lockedPositionsByRotation: locks,
    });

    expect(rotations[0].fieldPositions?.[players[0].id]).toBe('CB');
    expect(rotations[1].fieldPositions?.[players[0].id]).toBe('CB');
  });
});

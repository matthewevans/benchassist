import { describe, expect, it } from 'vitest';
import { RotationAssignment } from '@/types/domain.ts';
import { gameConfigFactory, playerFactory } from '@/test/factories.ts';
import type { GoalieAssignment, PlayerId } from '@/types/domain.ts';
import {
  buildDirectEntrySlots,
  buildGoalieDraft,
  compileDirectEntryOverrides,
  makeDirectEntryCellKey,
  type DirectEntryDraft,
} from './directEntry.ts';

describe('buildDirectEntrySlots', () => {
  it('builds only goalie and field slots from config', () => {
    const config = gameConfigFactory.build({
      fieldSize: 7,
      useGoalie: true,
      usePositions: true,
      formation: [
        { position: 'DEF', count: 2 },
        { position: 'MID', count: 3 },
        { position: 'FWD', count: 1 },
      ],
    });

    const slots = buildDirectEntrySlots(config);
    expect(slots[0].assignment).toBe(RotationAssignment.Goalie);
    expect(slots.filter((slot) => slot.assignment === RotationAssignment.Field)).toHaveLength(6);
    expect(slots.filter((slot) => slot.assignment === RotationAssignment.Bench)).toHaveLength(0);
  });
});

describe('buildGoalieDraft', () => {
  const periodDivisions = [2, 3]; // period 0: rotations 0-1, period 1: rotations 2-4

  it('populates goalie cells for explicitly assigned periods', () => {
    const assignments: GoalieAssignment[] = [
      { periodIndex: 0, playerId: 'player-1' as PlayerId },
      { periodIndex: 1, playerId: 'auto' },
    ];

    const draft = buildGoalieDraft(assignments, periodDivisions);

    expect(draft[makeDirectEntryCellKey(0, 'goalie:0')]).toEqual({
      playerId: 'player-1',
      lockMode: 'hard',
    });
    expect(draft[makeDirectEntryCellKey(1, 'goalie:0')]).toEqual({
      playerId: 'player-1',
      lockMode: 'hard',
    });
    expect(draft[makeDirectEntryCellKey(2, 'goalie:0')]).toBeUndefined();
  });

  it('returns empty draft when all assignments are auto', () => {
    const assignments: GoalieAssignment[] = [
      { periodIndex: 0, playerId: 'auto' },
      { periodIndex: 1, playerId: 'auto' },
    ];

    expect(buildGoalieDraft(assignments, periodDivisions)).toEqual({});
  });
});

describe('compileDirectEntryOverrides', () => {
  it('compiles assigned cells into manual overrides', () => {
    const players = [playerFactory.build({ name: 'A' }), playerFactory.build({ name: 'B' })];
    const slots = [
      {
        id: 'field:cb:0',
        label: 'CB',
        assignment: RotationAssignment.Field,
        fieldPosition: 'CB' as const,
      },
    ];
    const draft: DirectEntryDraft = {
      [makeDirectEntryCellKey(0, 'field:cb:0')]: { playerId: players[0].id, lockMode: 'hard' },
    };

    const result = compileDirectEntryOverrides({
      slots,
      totalRotations: 1,
      draft,
      players,
    });

    expect(result.errors).toHaveLength(0);
    expect(result.overrides).toEqual([
      {
        playerId: players[0].id,
        rotationIndex: 0,
        assignment: RotationAssignment.Field,
        lockMode: 'hard',
        fieldPosition: 'CB',
      },
    ]);
  });

  it('detects duplicate players in the same rotation', () => {
    const player = playerFactory.build({ name: 'A' });
    const slots = [
      {
        id: 'field:0',
        label: 'Field 1',
        assignment: RotationAssignment.Field,
      },
      {
        id: 'field:1',
        label: 'Field 2',
        assignment: RotationAssignment.Field,
      },
    ];
    const draft: DirectEntryDraft = {
      [makeDirectEntryCellKey(0, 'field:0')]: { playerId: player.id, lockMode: 'hard' },
      [makeDirectEntryCellKey(0, 'field:1')]: { playerId: player.id, lockMode: 'hard' },
    };

    const result = compileDirectEntryOverrides({
      slots,
      totalRotations: 1,
      draft,
      players: [player],
    });

    expect(result.errors).toHaveLength(1);
    expect(result.overrides).toHaveLength(1);
  });
});

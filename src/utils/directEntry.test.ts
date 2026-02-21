import { describe, expect, it } from 'vitest';
import { RotationAssignment } from '@/types/domain.ts';
import { gameConfigFactory, playerFactory } from '@/test/factories.ts';
import {
  buildDirectEntrySlots,
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

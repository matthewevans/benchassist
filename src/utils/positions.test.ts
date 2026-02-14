import { describe, it, expect, beforeEach } from 'vitest';
import { deriveSubPositions, autoAssignPositions, getAssignmentDisplay } from './positions.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type { FormationSlot, Player, SubPosition } from '@/types/domain.ts';
import { playerFactory, resetFactories } from '@/test/factories.ts';

beforeEach(() => {
  resetFactories();
});

describe('deriveSubPositions', () => {
  it('derives 7v7 formation (2-3-1)', () => {
    const formation: FormationSlot[] = [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 1 },
    ];
    expect(deriveSubPositions(formation)).toEqual(['LB', 'RB', 'LM', 'CM', 'RM', 'ST']);
  });

  it('derives 11v11 formation (4-4-2)', () => {
    const formation: FormationSlot[] = [
      { position: 'DEF', count: 4 },
      { position: 'MID', count: 4 },
      { position: 'FWD', count: 2 },
    ];
    expect(deriveSubPositions(formation)).toEqual([
      'LB',
      'LCB',
      'RCB',
      'RB',
      'LM',
      'LCM',
      'RCM',
      'RM',
      'LW',
      'RW',
    ]);
  });

  it('derives 9v9 formation (3-3-2)', () => {
    const formation: FormationSlot[] = [
      { position: 'DEF', count: 3 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 2 },
    ];
    expect(deriveSubPositions(formation)).toEqual(['LB', 'CB', 'RB', 'LM', 'CM', 'RM', 'LW', 'RW']);
  });

  it('handles single-player lines', () => {
    const formation: FormationSlot[] = [
      { position: 'DEF', count: 1 },
      { position: 'MID', count: 1 },
      { position: 'FWD', count: 1 },
    ];
    expect(deriveSubPositions(formation)).toEqual(['CB', 'CM', 'ST']);
  });

  it('returns empty for empty formation', () => {
    expect(deriveSubPositions([])).toEqual([]);
  });

  it('handles 3 forwards (4-3-3)', () => {
    const formation: FormationSlot[] = [
      { position: 'DEF', count: 4 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 3 },
    ];
    expect(deriveSubPositions(formation)).toEqual([
      'LB',
      'LCB',
      'RCB',
      'RB',
      'LM',
      'CM',
      'RM',
      'LW',
      'ST',
      'RW',
    ]);
  });
});

describe('autoAssignPositions', () => {
  function buildPlayersWithPositions(positions: (string | null)[]): Player[] {
    return positions.map((pos) =>
      playerFactory.build({ primaryPosition: pos as Player['primaryPosition'] }),
    );
  }

  it('assigns players to matching positions based on primaryPosition', () => {
    const players = buildPlayersWithPositions(['DEF', 'MID', 'FWD']);
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const formation: FormationSlot[] = [
      { position: 'DEF', count: 1 },
      { position: 'MID', count: 1 },
      { position: 'FWD', count: 1 },
    ];

    const result = autoAssignPositions(
      players.map((p) => p.id),
      formation,
      playerMap,
    );

    expect(result[players[0].id]).toBe('CB'); // DEF player gets CB
    expect(result[players[1].id]).toBe('CM'); // MID player gets CM
    expect(result[players[2].id]).toBe('ST'); // FWD player gets ST
  });

  it('fills unmatched players into remaining slots', () => {
    const players = buildPlayersWithPositions([null, null, null]);
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const formation: FormationSlot[] = [
      { position: 'DEF', count: 1 },
      { position: 'MID', count: 1 },
      { position: 'FWD', count: 1 },
    ];

    const result = autoAssignPositions(
      players.map((p) => p.id),
      formation,
      playerMap,
    );

    // All three get assigned (order may vary but all slots filled)
    const assigned = Object.values(result);
    expect(assigned).toHaveLength(3);
    expect(assigned).toContain('CB');
    expect(assigned).toContain('CM');
    expect(assigned).toContain('ST');
  });

  it('handles more players than slots gracefully', () => {
    const players = buildPlayersWithPositions([null, null, null, null]);
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const formation: FormationSlot[] = [
      { position: 'DEF', count: 1 },
      { position: 'MID', count: 1 },
    ];

    const result = autoAssignPositions(
      players.map((p) => p.id),
      formation,
      playerMap,
    );

    // Only 2 slots available, so only 2 players assigned
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('prioritizes primary position matches over fill-in', () => {
    const defPlayer = playerFactory.build({ primaryPosition: 'DEF' });
    const midPlayer = playerFactory.build({ primaryPosition: 'MID' });
    const nullPlayer = playerFactory.build({ primaryPosition: null });
    const players = [nullPlayer, defPlayer, midPlayer]; // null player is first
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const formation: FormationSlot[] = [
      { position: 'DEF', count: 1 },
      { position: 'MID', count: 1 },
      { position: 'FWD', count: 1 },
    ];

    const result = autoAssignPositions(
      players.map((p) => p.id),
      formation,
      playerMap,
    );

    // DEF and MID players should get their preferred positions
    expect(result[defPlayer.id]).toBe('CB');
    expect(result[midPlayer.id]).toBe('CM');
    // null player gets remaining FWD slot
    expect(result[nullPlayer.id]).toBe('ST');
  });

  describe('position diversity', () => {
    function trackHistory(
      history: Map<string, Map<SubPosition, number>>,
      fieldPositions: Record<string, SubPosition>,
    ) {
      for (const [playerId, subPos] of Object.entries(fieldPositions)) {
        if (!history.has(playerId)) history.set(playerId, new Map());
        const playerHist = history.get(playerId)!;
        playerHist.set(subPos, (playerHist.get(subPos) ?? 0) + 1);
      }
    }

    it('swaps sub-positions within a position group across rotations', () => {
      const players = buildPlayersWithPositions(['DEF', 'DEF']);
      const playerMap = new Map(players.map((p) => [p.id, p]));
      const formation: FormationSlot[] = [{ position: 'DEF', count: 2 }];
      const history = new Map<string, Map<SubPosition, number>>();

      const first = autoAssignPositions(
        players.map((p) => p.id),
        formation,
        playerMap,
        history,
      );
      expect(Object.values(first).sort()).toEqual(['LB', 'RB']);
      trackHistory(history, first);

      const second = autoAssignPositions(
        players.map((p) => p.id),
        formation,
        playerMap,
        history,
      );
      // Players should have swapped sub-positions
      expect(second[players[0].id]).not.toBe(first[players[0].id]);
      expect(second[players[1].id]).not.toBe(first[players[1].id]);
    });

    it('assigns across position groups for diversity', () => {
      const defPlayer = playerFactory.build({ primaryPosition: 'DEF' });
      const nullPlayer = playerFactory.build({ primaryPosition: null });
      const playerMap = new Map([defPlayer, nullPlayer].map((p) => [p.id, p]));
      const formation: FormationSlot[] = [
        { position: 'DEF', count: 1 },
        { position: 'MID', count: 1 },
      ];

      // Simulate: defPlayer already played CB once
      const history = new Map<string, Map<SubPosition, number>>([
        [defPlayer.id, new Map([['CB', 1] as [SubPosition, number]])],
      ]);

      const result = autoAssignPositions(
        [defPlayer.id, nullPlayer.id],
        formation,
        playerMap,
        history,
      );

      // DEF player should get CM (cost 0) over CB (cost 1)
      expect(result[defPlayer.id]).toBe('CM');
      expect(result[nullPlayer.id]).toBe('CB');
    });

    it('spreads positions across multiple rotations', () => {
      const players = buildPlayersWithPositions([null, null, null]);
      const playerMap = new Map(players.map((p) => [p.id, p]));
      const formation: FormationSlot[] = [
        { position: 'DEF', count: 1 },
        { position: 'MID', count: 1 },
        { position: 'FWD', count: 1 },
      ];
      const history = new Map<string, Map<SubPosition, number>>();

      // Run 3 rotations — each player should get each position exactly once
      const assignments: Record<string, SubPosition>[] = [];
      for (let i = 0; i < 3; i++) {
        const result = autoAssignPositions(
          players.map((p) => p.id),
          formation,
          playerMap,
          history,
        );
        assignments.push(result);
        trackHistory(history, result);
      }

      // Each player should have played 3 different positions
      for (const player of players) {
        const positions = assignments.map((a) => a[player.id]);
        expect(new Set(positions).size).toBe(3);
      }
    });
  });
});

describe('getAssignmentDisplay', () => {
  it('returns Bench for bench assignment', () => {
    const display = getAssignmentDisplay(RotationAssignment.Bench, undefined, true);
    expect(display.label).toBe('Bench');
  });

  it('returns GK for goalie assignment', () => {
    const display = getAssignmentDisplay(RotationAssignment.Goalie, undefined, true);
    expect(display.label).toBe('GK');
  });

  it('returns Field when usePositions is false', () => {
    const display = getAssignmentDisplay(RotationAssignment.Field, 'LB', false);
    expect(display.label).toBe('Field');
  });

  it('returns sub-position when usePositions is true', () => {
    const display = getAssignmentDisplay(RotationAssignment.Field, 'LB', true);
    expect(display.label).toBe('LB');
  });

  it('returns Field when usePositions is true but no fieldPosition', () => {
    const display = getAssignmentDisplay(RotationAssignment.Field, undefined, true);
    expect(display.label).toBe('Field');
  });

  it('uses purple class for DEF positions', () => {
    const display = getAssignmentDisplay(RotationAssignment.Field, 'CB', true);
    expect(display.className).toContain('purple');
  });

  it('uses green class for MID positions', () => {
    const display = getAssignmentDisplay(RotationAssignment.Field, 'CM', true);
    expect(display.className).toContain('green');
  });

  it('uses orange class for FWD positions', () => {
    const display = getAssignmentDisplay(RotationAssignment.Field, 'ST', true);
    expect(display.className).toContain('orange');
  });
});

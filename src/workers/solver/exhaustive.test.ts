import { describe, it, expect } from 'vitest';
import { exhaustiveSearch } from './exhaustive.ts';
import { RotationAssignment } from '@/types/domain.ts';
import { buildRoster, gameConfigFactory, playerFactory } from '@/test/factories.ts';

describe('exhaustiveSearch', () => {
  it('produces a valid schedule where every rotation has the correct number of field players', () => {
    const players = buildRoster(9);
    const config = gameConfigFactory.build({ fieldSize: 7 });
    const totalRotations = config.periods * config.rotationsPerPeriod;

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [],
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    for (const rotation of schedule.rotations) {
      const onField = Object.values(rotation.assignments).filter(
        (a) => a === RotationAssignment.Field || a === RotationAssignment.Goalie,
      );
      expect(onField).toHaveLength(config.fieldSize);
    }
  });

  it('assigns exactly one goalie per rotation', () => {
    const players = buildRoster(9);
    const config = gameConfigFactory.build({ fieldSize: 7 });
    const totalRotations = config.periods * config.rotationsPerPeriod;

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [],
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    for (const rotation of schedule.rotations) {
      const goalies = Object.values(rotation.assignments).filter(
        (a) => a === RotationAssignment.Goalie,
      );
      expect(goalies).toHaveLength(1);
    }
  });

  it('respects the no-consecutive-bench rule', () => {
    const players = buildRoster(9);
    const config = gameConfigFactory.build({
      fieldSize: 7,
      noConsecutiveBench: true,
      maxConsecutiveBench: 1,
    });
    const totalRotations = config.periods * config.rotationsPerPeriod;

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [],
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    for (const player of players) {
      let consecutiveBench = 0;
      for (const rotation of schedule.rotations) {
        if (rotation.assignments[player.id] === RotationAssignment.Bench) {
          consecutiveBench++;
          expect(consecutiveBench).toBeLessThanOrEqual(1);
        } else {
          consecutiveBench = 0;
        }
      }
    }
  });

  it('ensures every player meets minimum play percentage', () => {
    const players = buildRoster(9);
    const config = gameConfigFactory.build({
      fieldSize: 7,
      enforceMinPlayTime: true,
      minPlayPercentage: 50,
    });
    const totalRotations = config.periods * config.rotationsPerPeriod;

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [],
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    for (const player of players) {
      const stats = schedule.playerStats[player.id];
      expect(stats.playPercentage).toBeGreaterThanOrEqual(50);
    }
  });

  it('enforces minimum play percentage with non-uniform period divisions', () => {
    const players = buildRoster(4, { goalieCount: 0 });
    const config = gameConfigFactory.build({
      fieldSize: 2,
      periods: 2,
      rotationsPerPeriod: 2,
      useGoalie: false,
      noConsecutiveBench: false,
      enforceMinPlayTime: true,
      minPlayPercentage: 50,
      skillBalance: false,
    });
    const periodDivisions = [1, 3];
    const totalRotations = periodDivisions.reduce((sum, division) => sum + division, 0);

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [],
      periodDivisions,
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    expect(schedule.rotations.filter((r) => r.periodIndex === 0)).toHaveLength(1);
    expect(schedule.rotations.filter((r) => r.periodIndex === 1)).toHaveLength(3);

    for (const player of players) {
      expect(schedule.playerStats[player.id].playPercentage).toBeGreaterThanOrEqual(50);
    }
  });

  it('enforces goalie rest after their period when rule is enabled', () => {
    const players = buildRoster(10, { goalieCount: 3 });
    const config = gameConfigFactory.build({
      fieldSize: 7,
      periods: 2,
      rotationsPerPeriod: 2,
      goaliePlayFullPeriod: true,
      goalieRestAfterPeriod: true,
    });
    const totalRotations = config.periods * config.rotationsPerPeriod;

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [],
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    const period1Goalie = Object.entries(schedule.rotations[0].assignments).find(
      ([, a]) => a === RotationAssignment.Goalie,
    );

    if (period1Goalie && schedule.rotations.length > 2) {
      expect(schedule.rotations[2].assignments[period1Goalie[0]]).toBe(RotationAssignment.Bench);
    }
  });

  it('produces balanced team strength across rotations', () => {
    const players = buildRoster(10);
    const config = gameConfigFactory.build({ fieldSize: 7, skillBalance: true });
    const totalRotations = config.periods * config.rotationsPerPeriod;

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [],
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    const strengths = schedule.rotations.map((r) => r.teamStrength);
    const range = Math.max(...strengths) - Math.min(...strengths);

    expect(range).toBeLessThanOrEqual(4);
  });

  it('throws when constraints are impossible', () => {
    const players = buildRoster(3);
    const config = gameConfigFactory.build({ fieldSize: 7 });
    const totalRotations = config.periods * config.rotationsPerPeriod;

    expect(() =>
      exhaustiveSearch({
        players,
        config,
        goalieAssignments: [],
        manualOverrides: [],
        totalRotations,
        benchSlotsPerRotation: players.length - config.fieldSize,
        onProgress: () => {},
        cancellation: { cancelled: false },
      }),
    ).toThrow();
  });

  it('surfaces specific constraint conflicts in the error message', () => {
    const players = buildRoster(8, { goalieCount: 2 });
    const config = gameConfigFactory.build({
      fieldSize: 7,
      periods: 2,
      rotationsPerPeriod: 2,
      useGoalie: true,
      goaliePlayFullPeriod: true,
      goalieRestAfterPeriod: true,
    });
    const totalRotations = config.periods * config.rotationsPerPeriod;
    const fixedGoalie = players[0];

    expect(() =>
      exhaustiveSearch({
        players,
        config,
        goalieAssignments: [
          { periodIndex: 0, playerId: fixedGoalie.id },
          { periodIndex: 1, playerId: fixedGoalie.id },
        ],
        manualOverrides: [],
        totalRotations,
        benchSlotsPerRotation: players.length - config.fieldSize,
        onProgress: () => {},
        cancellation: { cancelled: false },
      }),
    ).toThrow(/Goalie rest requires/);
  });

  it('handles a minimal roster (field size equals roster size)', () => {
    const players = buildRoster(7, { goalieCount: 2 });
    const config = gameConfigFactory.build({
      fieldSize: 7,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      goalieRestAfterPeriod: false,
    });
    const totalRotations = config.periods * config.rotationsPerPeriod;

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [],
      totalRotations,
      benchSlotsPerRotation: 0,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    for (const player of players) {
      expect(schedule.playerStats[player.id].playPercentage).toBe(100);
    }
  });

  it('produces a valid schedule with no goalie assignments when useGoalie is false', () => {
    const players = buildRoster(9, { goalieCount: 0 });
    const config = gameConfigFactory.build({
      fieldSize: 7,
      useGoalie: false,
      goaliePlayFullPeriod: false,
      goalieRestAfterPeriod: false,
    });
    const totalRotations = config.periods * config.rotationsPerPeriod;

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [],
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    for (const rotation of schedule.rotations) {
      const assignments = Object.values(rotation.assignments);
      const goalies = assignments.filter((a) => a === RotationAssignment.Goalie);
      const onField = assignments.filter((a) => a === RotationAssignment.Field);
      expect(goalies).toHaveLength(0);
      expect(onField).toHaveLength(config.fieldSize);
    }
  });

  it('respects manual goalie assignments', () => {
    const players = buildRoster(9, { goalieCount: 3 });
    const config = gameConfigFactory.build({ fieldSize: 7, periods: 2 });
    const totalRotations = config.periods * config.rotationsPerPeriod;
    const assignedGoalie = players[0];

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [{ periodIndex: 0, playerId: assignedGoalie.id }],
      manualOverrides: [],
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    const period1Rotations = schedule.rotations.filter((r) => r.periodIndex === 0);
    for (const rotation of period1Rotations) {
      expect(rotation.assignments[assignedGoalie.id]).toBe(RotationAssignment.Goalie);
    }
  });

  it('applies a hard goalie lock to every rotation in the period when full-period goalie is enabled', () => {
    const players = buildRoster(9, { goalieCount: 3 });
    const config = gameConfigFactory.build({
      fieldSize: 7,
      periods: 2,
      rotationsPerPeriod: 2,
      useGoalie: true,
      goaliePlayFullPeriod: true,
      goalieRestAfterPeriod: false,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      skillBalance: false,
    });
    const totalRotations = config.periods * config.rotationsPerPeriod;
    const lockedGoalie = players[1];

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [
        {
          playerId: lockedGoalie.id,
          rotationIndex: 1,
          assignment: RotationAssignment.Goalie,
          lockMode: 'hard',
        },
      ],
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    const period1Rotations = schedule.rotations.filter((r) => r.periodIndex === 0);
    expect(period1Rotations).toHaveLength(2);
    for (const rotation of period1Rotations) {
      expect(rotation.assignments[lockedGoalie.id]).toBe(RotationAssignment.Goalie);
    }
  });

  it('solves 13-player 7v7 with 1 rotation per period and explicit goalies', () => {
    const players = buildRoster(13, { goalieCount: 4 });
    const config = gameConfigFactory.build({
      fieldSize: 7,
      periods: 4,
      rotationsPerPeriod: 1,
      useGoalie: true,
      goaliePlayFullPeriod: true,
      goalieRestAfterPeriod: true,
      noConsecutiveBench: true,
      maxConsecutiveBench: 1,
      enforceMinPlayTime: true,
      minPlayPercentage: 50,
      skillBalance: true,
    });
    const totalRotations = config.periods * config.rotationsPerPeriod;
    const goalies = players.filter((p) => p.canPlayGoalie);

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [
        { periodIndex: 0, playerId: goalies[0].id },
        { periodIndex: 1, playerId: goalies[1].id },
        { periodIndex: 2, playerId: goalies[2].id },
        { periodIndex: 3, playerId: goalies[3].id },
      ],
      manualOverrides: [],
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    expect(schedule.rotations).toHaveLength(totalRotations);
  });

  it('solves 13-player 7v7 with hard pre-game locks and auto goalie selection', () => {
    const players = buildRoster(13, { goalieCount: 8 });
    const config = gameConfigFactory.build({
      fieldSize: 7,
      periods: 4,
      rotationsPerPeriod: 1,
      useGoalie: true,
      usePositions: true,
      formation: [
        { position: 'DEF', count: 2 },
        { position: 'MID', count: 3 },
        { position: 'FWD', count: 1 },
      ],
      goaliePlayFullPeriod: true,
      goalieRestAfterPeriod: true,
      noConsecutiveBench: true,
      maxConsecutiveBench: 1,
      enforceMinPlayTime: true,
      minPlayPercentage: 50,
      skillBalance: true,
    });
    const totalRotations = config.periods * config.rotationsPerPeriod;

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [
        {
          playerId: players[0].id,
          rotationIndex: 0,
          assignment: RotationAssignment.Goalie,
          lockMode: 'hard',
        },
        {
          playerId: players[1].id,
          rotationIndex: 0,
          assignment: RotationAssignment.Field,
          fieldPosition: 'LB',
          lockMode: 'hard',
        },
        {
          playerId: players[2].id,
          rotationIndex: 0,
          assignment: RotationAssignment.Field,
          fieldPosition: 'CM',
          lockMode: 'hard',
        },
      ],
      totalRotations,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    expect(schedule.rotations).toHaveLength(totalRotations);
    expect(schedule.rotations[0].assignments[players[0].id]).toBe(RotationAssignment.Goalie);
    expect(schedule.rotations[0].assignments[players[1].id]).toBe(RotationAssignment.Field);
    expect(schedule.rotations[0].assignments[players[2].id]).toBe(RotationAssignment.Field);
    expect(schedule.rotations[0].fieldPositions?.[players[1].id]).toBe('LB');
    expect(schedule.rotations[0].fieldPositions?.[players[2].id]).toBe('CM');
  });

  it('respects hard-locked field sub-positions', () => {
    const players = [
      playerFactory.build({ name: 'A', canPlayGoalie: false, primaryPosition: 'DEF' }),
      playerFactory.build({ name: 'B', canPlayGoalie: false, primaryPosition: 'MID' }),
      playerFactory.build({ name: 'C', canPlayGoalie: false, primaryPosition: 'FWD' }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 2,
      periods: 1,
      rotationsPerPeriod: 1,
      useGoalie: false,
      usePositions: true,
      formation: [
        { position: 'DEF', count: 1 },
        { position: 'MID', count: 1 },
      ],
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
    });

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [
        {
          playerId: players[0].id,
          rotationIndex: 0,
          assignment: RotationAssignment.Field,
          lockMode: 'hard',
          fieldPosition: 'CB',
        },
      ],
      totalRotations: 1,
      benchSlotsPerRotation: 1,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    expect(schedule.rotations[0].fieldPositions?.[players[0].id]).toBe('CB');
  });

  it('applies position continuity preferences without forcing bench/field assignment', () => {
    const players = [
      playerFactory.build({ name: 'A', canPlayGoalie: false, primaryPosition: null }),
      playerFactory.build({ name: 'B', canPlayGoalie: false, primaryPosition: null }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 2,
      periods: 1,
      rotationsPerPeriod: 1,
      useGoalie: false,
      usePositions: true,
      formation: [{ position: 'DEF', count: 2 }],
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      skillBalance: false,
    });

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [],
      positionContinuityPreferences: [
        {
          playerId: players[0].id,
          rotationIndex: 0,
          fieldPosition: 'RB',
        },
      ],
      totalRotations: 1,
      benchSlotsPerRotation: 0,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    expect(schedule.rotations[0].fieldPositions?.[players[0].id]).toBe('RB');
  });

  it('keeps continuity-preferred players pinned through post-assignment diversity swaps', () => {
    const players = [
      playerFactory.build({ name: 'A', canPlayGoalie: false, primaryPosition: null }),
      playerFactory.build({ name: 'B', canPlayGoalie: false, primaryPosition: null }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 2,
      periods: 1,
      rotationsPerPeriod: 2,
      useGoalie: false,
      usePositions: true,
      formation: [{ position: 'DEF', count: 2 }],
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      skillBalance: false,
    });

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [],
      positionContinuityPreferences: [
        {
          playerId: players[0].id,
          rotationIndex: 0,
          fieldPosition: 'LB',
        },
        {
          playerId: players[0].id,
          rotationIndex: 1,
          fieldPosition: 'LB',
        },
      ],
      totalRotations: 2,
      benchSlotsPerRotation: 0,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    expect(schedule.rotations[0].fieldPositions?.[players[0].id]).toBe('LB');
    expect(schedule.rotations[1].fieldPositions?.[players[0].id]).toBe('LB');
  });

  it('does not auto-assign goalie to players hard-locked as field in goalie rotations', () => {
    const players = buildRoster(4, { goalieCount: 2 });
    const config = gameConfigFactory.build({
      fieldSize: 3,
      periods: 1,
      rotationsPerPeriod: 2,
      useGoalie: true,
      goaliePlayFullPeriod: false,
      goalieRestAfterPeriod: false,
      usePositions: true,
      formation: [
        { position: 'DEF', count: 1 },
        { position: 'MID', count: 1 },
      ],
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      skillBalance: false,
    });

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [
        {
          playerId: players[0].id,
          rotationIndex: 0,
          assignment: RotationAssignment.Field,
          lockMode: 'hard',
          fieldPosition: 'CB',
        },
      ],
      totalRotations: 2,
      benchSlotsPerRotation: players.length - config.fieldSize,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    const goalieId = Object.entries(schedule.rotations[0].assignments).find(
      ([, assignment]) => assignment === RotationAssignment.Goalie,
    )?.[0];

    expect(schedule.rotations[0].assignments[players[0].id]).toBe(RotationAssignment.Field);
    expect(schedule.rotations[0].fieldPositions?.[players[0].id]).toBe('CB');
    expect(goalieId).not.toBe(players[0].id);
  });

  it('throws when manual goalie assignment conflicts with a hard non-goalie lock', () => {
    const players = buildRoster(4, { goalieCount: 2 });
    const config = gameConfigFactory.build({
      fieldSize: 3,
      periods: 1,
      rotationsPerPeriod: 2,
      useGoalie: true,
      goaliePlayFullPeriod: false,
      goalieRestAfterPeriod: false,
      usePositions: true,
      formation: [
        { position: 'DEF', count: 1 },
        { position: 'MID', count: 1 },
      ],
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      skillBalance: false,
    });

    expect(() =>
      exhaustiveSearch({
        players,
        config,
        goalieAssignments: [{ periodIndex: 0, playerId: players[0].id }],
        manualOverrides: [
          {
            playerId: players[0].id,
            rotationIndex: 0,
            assignment: RotationAssignment.Field,
            lockMode: 'hard',
            fieldPosition: 'CB',
          },
        ],
        totalRotations: 2,
        benchSlotsPerRotation: players.length - config.fieldSize,
        onProgress: () => {},
        cancellation: { cancelled: false },
      }),
    ).toThrow(/cannot be goalie in period 1/i);
  });

  it('prefers feasible soft assignment overrides', () => {
    const players = [
      playerFactory.build({ name: 'A', canPlayGoalie: false, skillRanking: 3 }),
      playerFactory.build({ name: 'B', canPlayGoalie: false, skillRanking: 3 }),
      playerFactory.build({ name: 'C', canPlayGoalie: false, skillRanking: 3 }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 2,
      periods: 1,
      rotationsPerPeriod: 1,
      useGoalie: false,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      skillBalance: false,
    });

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [
        {
          playerId: players[0].id,
          rotationIndex: 0,
          assignment: RotationAssignment.Bench,
          lockMode: 'soft',
        },
      ],
      totalRotations: 1,
      benchSlotsPerRotation: 1,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    expect(schedule.rotations[0].assignments[players[0].id]).toBe(RotationAssignment.Bench);
  });

  it('does not fail on infeasible soft overrides', () => {
    const players = [
      playerFactory.build({ name: 'A', canPlayGoalie: false }),
      playerFactory.build({ name: 'B', canPlayGoalie: false }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 2,
      periods: 1,
      rotationsPerPeriod: 1,
      useGoalie: false,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      skillBalance: false,
    });

    const schedule = exhaustiveSearch({
      players,
      config,
      goalieAssignments: [],
      manualOverrides: [
        {
          playerId: players[0].id,
          rotationIndex: 0,
          assignment: RotationAssignment.Bench,
          lockMode: 'soft',
        },
      ],
      totalRotations: 1,
      benchSlotsPerRotation: 0,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    expect(schedule.rotations).toHaveLength(1);
    expect(schedule.rotations[0].assignments[players[0].id]).toBe(RotationAssignment.Field);
  });
});

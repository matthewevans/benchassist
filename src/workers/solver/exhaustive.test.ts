import { describe, it, expect } from 'vitest';
import { exhaustiveSearch } from './exhaustive.ts';
import { RotationAssignment } from '@/types/domain.ts';
import { buildRoster, gameConfigFactory } from '@/test/factories.ts';

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
    const config = gameConfigFactory.build({ fieldSize: 7, balancePriority: 'balanced' });
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
});

import { describe, it, expect, vi } from 'vitest';
import {
  mergeSchedules,
  buildMidGameSolveWindow,
  buildMidGameMinPlayInputs,
} from './rotation-solver.worker.ts';
import { exhaustiveSearch } from './solver/exhaustive.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type { SolverResponse } from '@/types/solver.ts';
import {
  playerFactory,
  gameConfigFactory,
  buildRotation,
  buildSchedule,
} from '@/test/factories.ts';

describe('mergeSchedules', () => {
  it('preserves played rotations and replaces future ones', () => {
    const p1 = playerFactory.build({ name: 'A', skillRanking: 3 });
    const p2 = playerFactory.build({ name: 'B', skillRanking: 2 });
    const p3 = playerFactory.build({ name: 'C', skillRanking: 4 });

    // Existing schedule: 4 rotations, all three players
    const existingRotations = [
      buildRotation(0, {
        [p1.id]: RotationAssignment.Field,
        [p2.id]: RotationAssignment.Goalie,
        [p3.id]: RotationAssignment.Field,
      }),
      buildRotation(1, {
        [p1.id]: RotationAssignment.Field,
        [p2.id]: RotationAssignment.Goalie,
        [p3.id]: RotationAssignment.Bench,
      }),
      buildRotation(2, {
        [p1.id]: RotationAssignment.Bench,
        [p2.id]: RotationAssignment.Goalie,
        [p3.id]: RotationAssignment.Field,
      }),
      buildRotation(3, {
        [p1.id]: RotationAssignment.Field,
        [p2.id]: RotationAssignment.Goalie,
        [p3.id]: RotationAssignment.Field,
      }),
    ];

    // New schedule from solver (p3 removed, only p1 and p2)
    const newRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(1, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(2, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(3, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie }),
    ];
    const newSchedule = buildSchedule(newRotations, [p1, p2]);

    const result = mergeSchedules(existingRotations, newSchedule, 2, [p1, p2]);

    // First two rotations should be from existing (played)
    expect(result.rotations[0]).toBe(existingRotations[0]);
    expect(result.rotations[1]).toBe(existingRotations[1]);

    // Last two rotations should be from new schedule (future)
    expect(result.rotations[2]).toBe(newRotations[2]);
    expect(result.rotations[3]).toBe(newRotations[3]);

    expect(result.rotations).toHaveLength(4);
  });

  it('recalculates player stats across merged rotations', () => {
    const p1 = playerFactory.build({ name: 'A', skillRanking: 3 });
    const p2 = playerFactory.build({ name: 'B', skillRanking: 2 });

    // Played: p1 on field, p2 benched
    const existingRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
      buildRotation(1, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }),
    ];

    // Future: p1 on field, p2 on field (no bench since only 2 players)
    const newRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
      buildRotation(1, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }),
      buildRotation(2, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
      buildRotation(3, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }),
    ];
    const newSchedule = buildSchedule(newRotations, [p1, p2]);

    const result = mergeSchedules(existingRotations, newSchedule, 2, [p1, p2]);

    // Stats should reflect all 4 rotations (2 played + 2 future)
    expect(result.playerStats[p1.id].totalRotations).toBe(4);
    expect(result.playerStats[p2.id].totalRotations).toBe(4);

    // p1: field(0), bench(1), field(2), bench(3) → 2 played, 2 benched
    expect(result.playerStats[p1.id].rotationsPlayed).toBe(2);
    expect(result.playerStats[p1.id].rotationsBenched).toBe(2);
    expect(result.playerStats[p1.id].playPercentage).toBe(50);
  });

  it('recalculates overall stats from merged rotations', () => {
    const p1 = playerFactory.build({ name: 'A', skillRanking: 5 });
    const p2 = playerFactory.build({ name: 'B', skillRanking: 1 });

    const existingRotations = [
      {
        index: 0,
        periodIndex: 0,
        assignments: { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench },
        teamStrength: 5,
        violations: [] as string[],
      },
    ];

    const newRotations = [
      {
        index: 0,
        periodIndex: 0,
        assignments: { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field },
        teamStrength: 1,
        violations: [] as string[],
      },
      {
        index: 1,
        periodIndex: 0,
        assignments: { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench },
        teamStrength: 5,
        violations: [] as string[],
      },
    ];
    const newSchedule = buildSchedule(newRotations, [p1, p2]);

    const result = mergeSchedules(existingRotations, newSchedule, 1, [p1, p2]);

    // Merged: [strength 5, strength 5]
    expect(result.overallStats.minStrength).toBe(5);
    expect(result.overallStats.maxStrength).toBe(5);
    expect(result.overallStats.avgStrength).toBe(5);
    expect(result.overallStats.strengthVariance).toBe(0);
  });

  it('handles startFromRotation at the beginning (returns new schedule as-is)', () => {
    const p1 = playerFactory.build({ name: 'A', skillRanking: 3 });

    const existingRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field }),
      buildRotation(1, { [p1.id]: RotationAssignment.Field }),
    ];

    const newRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field }),
      buildRotation(1, { [p1.id]: RotationAssignment.Field }),
    ];
    const newSchedule = buildSchedule(newRotations, [p1]);

    // startFromRotation=0 shouldn't normally call mergeSchedules (the worker checks),
    // but if it did, it should return only new rotations (0 played sliced)
    const result = mergeSchedules(existingRotations, newSchedule, 0, [p1]);

    expect(result.rotations).toHaveLength(2);
    expect(result.rotations[0]).toBe(newRotations[0]);
    expect(result.rotations[1]).toBe(newRotations[1]);
  });

  it('accepts a partial future schedule when mid-game solving returns only remaining rotations', () => {
    const p1 = playerFactory.build({ name: 'A', skillRanking: 3 });
    const p2 = playerFactory.build({ name: 'B', skillRanking: 2 });

    const existingRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
      buildRotation(1, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }),
      buildRotation(2, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
      buildRotation(3, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }),
      buildRotation(4, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
    ];

    const futureRotations = [
      {
        ...buildRotation(0, {
          [p1.id]: RotationAssignment.Field,
          [p2.id]: RotationAssignment.Bench,
        }),
        index: 3,
        periodIndex: 3,
      },
      {
        ...buildRotation(1, {
          [p1.id]: RotationAssignment.Bench,
          [p2.id]: RotationAssignment.Field,
        }),
        index: 4,
        periodIndex: 3,
      },
    ];
    const partialFutureSchedule = buildSchedule(futureRotations, [p1, p2]);

    const result = mergeSchedules(existingRotations, partialFutureSchedule, 3, [p1, p2]);

    expect(result.rotations).toHaveLength(5);
    expect(result.rotations[0]).toBe(existingRotations[0]);
    expect(result.rotations[1]).toBe(existingRotations[1]);
    expect(result.rotations[2]).toBe(existingRotations[2]);
    expect(result.rotations[3]).toBe(futureRotations[0]);
    expect(result.rotations[4]).toBe(futureRotations[1]);
  });
});

describe('buildMidGameSolveWindow', () => {
  it('builds a remaining-window solve plan from a period boundary and remaps constraints', () => {
    const p1 = playerFactory.build({ name: 'A', canPlayGoalie: false });
    const p2 = playerFactory.build({ name: 'B', canPlayGoalie: true });
    const p3 = playerFactory.build({ name: 'C', canPlayGoalie: true });

    const config = gameConfigFactory.build({
      periods: 4,
      rotationsPerPeriod: 1,
      fieldSize: 2,
      noConsecutiveBench: true,
      maxConsecutiveBench: 1,
      goaliePlayFullPeriod: true,
      goalieRestAfterPeriod: true,
      useGoalie: true,
    });

    const existingRotations = [
      buildRotation(0, {
        [p1.id]: RotationAssignment.Field,
        [p2.id]: RotationAssignment.Goalie,
        [p3.id]: RotationAssignment.Bench,
      }),
      buildRotation(1, {
        [p1.id]: RotationAssignment.Bench,
        [p2.id]: RotationAssignment.Field,
        [p3.id]: RotationAssignment.Goalie,
      }),
      buildRotation(2, {
        [p1.id]: RotationAssignment.Bench,
        [p2.id]: RotationAssignment.Goalie,
        [p3.id]: RotationAssignment.Field,
      }),
      buildRotation(3, {
        [p1.id]: RotationAssignment.Field,
        [p2.id]: RotationAssignment.Bench,
        [p3.id]: RotationAssignment.Goalie,
      }),
      buildRotation(4, {
        [p1.id]: RotationAssignment.Goalie,
        [p2.id]: RotationAssignment.Field,
        [p3.id]: RotationAssignment.Bench,
      }),
    ];

    const window = buildMidGameSolveWindow({
      config,
      periodDivisions: [1, 1, 1, 2],
      goalieAssignments: [
        { periodIndex: 0, playerId: p2.id },
        { periodIndex: 1, playerId: p3.id },
        { periodIndex: 2, playerId: p2.id },
        { periodIndex: 3, playerId: p1.id },
      ],
      manualOverrides: [
        { playerId: p3.id, rotationIndex: 1, assignment: RotationAssignment.Field },
        { playerId: p3.id, rotationIndex: 4, assignment: RotationAssignment.Bench },
      ],
      startFromRotation: 3,
      existingRotations,
      players: [p1, p2, p3],
    });

    expect(window).not.toBeNull();
    expect(window?.startPeriodIndex).toBe(3);
    expect(window?.periodDivisions).toEqual([2]);
    expect(window?.config.periods).toBe(1);
    expect(window?.goalieAssignments).toEqual([{ periodIndex: 0, playerId: p1.id }]);
    expect(window?.manualOverrides).toEqual(
      expect.arrayContaining([
        { playerId: p3.id, rotationIndex: 1, assignment: RotationAssignment.Bench },
        { playerId: p1.id, rotationIndex: 0, assignment: RotationAssignment.Field },
        { playerId: p2.id, rotationIndex: 0, assignment: RotationAssignment.Bench },
      ]),
    );
  });

  it('falls back to full-game solve for mid-period windows when goalie only plays first rotation', () => {
    const p1 = playerFactory.build({ name: 'A', canPlayGoalie: true });
    const p2 = playerFactory.build({ name: 'B', canPlayGoalie: true });

    const config = gameConfigFactory.build({
      periods: 4,
      rotationsPerPeriod: 1,
      fieldSize: 1,
      useGoalie: true,
      goaliePlayFullPeriod: false,
    });

    const existingRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Goalie, [p2.id]: RotationAssignment.Bench }),
      buildRotation(1, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(2, { [p1.id]: RotationAssignment.Goalie, [p2.id]: RotationAssignment.Bench }),
      buildRotation(3, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(4, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
    ];

    const window = buildMidGameSolveWindow({
      config,
      periodDivisions: [1, 1, 1, 2],
      goalieAssignments: [],
      manualOverrides: [],
      startFromRotation: 4,
      existingRotations,
      players: [p1, p2],
    });

    expect(window).toBeNull();
  });

  it('pins the first remaining period goalie to the existing live schedule when auto-assigned', () => {
    const p1 = playerFactory.build({ name: 'A', canPlayGoalie: true });
    const p2 = playerFactory.build({ name: 'B', canPlayGoalie: true });
    const p3 = playerFactory.build({ name: 'C', canPlayGoalie: false });
    const p4 = playerFactory.build({ name: 'D', canPlayGoalie: false });
    const p5 = playerFactory.build({ name: 'E', canPlayGoalie: false });
    const p6 = playerFactory.build({ name: 'F', canPlayGoalie: false });

    const config = gameConfigFactory.build({
      periods: 4,
      rotationsPerPeriod: 1,
      fieldSize: 4,
      useGoalie: true,
      goaliePlayFullPeriod: true,
      goalieRestAfterPeriod: true,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
    });

    const existingRotations = [
      buildRotation(0, {
        [p1.id]: RotationAssignment.Field,
        [p2.id]: RotationAssignment.Goalie,
        [p3.id]: RotationAssignment.Field,
        [p4.id]: RotationAssignment.Field,
        [p5.id]: RotationAssignment.Bench,
        [p6.id]: RotationAssignment.Bench,
      }),
      buildRotation(1, {
        [p1.id]: RotationAssignment.Goalie,
        [p2.id]: RotationAssignment.Field,
        [p3.id]: RotationAssignment.Bench,
        [p4.id]: RotationAssignment.Field,
        [p5.id]: RotationAssignment.Field,
        [p6.id]: RotationAssignment.Bench,
      }),
      buildRotation(2, {
        [p1.id]: RotationAssignment.Field,
        [p2.id]: RotationAssignment.Goalie,
        [p3.id]: RotationAssignment.Bench,
        [p4.id]: RotationAssignment.Field,
        [p5.id]: RotationAssignment.Bench,
        [p6.id]: RotationAssignment.Field,
      }),
      buildRotation(3, {
        [p1.id]: RotationAssignment.Goalie,
        [p2.id]: RotationAssignment.Field,
        [p3.id]: RotationAssignment.Field,
        [p4.id]: RotationAssignment.Bench,
        [p5.id]: RotationAssignment.Field,
        [p6.id]: RotationAssignment.Bench,
      }),
      buildRotation(4, {
        [p1.id]: RotationAssignment.Goalie,
        [p2.id]: RotationAssignment.Field,
        [p3.id]: RotationAssignment.Bench,
        [p4.id]: RotationAssignment.Bench,
        [p5.id]: RotationAssignment.Field,
        [p6.id]: RotationAssignment.Field,
      }),
      buildRotation(5, {
        [p1.id]: RotationAssignment.Goalie,
        [p2.id]: RotationAssignment.Field,
        [p3.id]: RotationAssignment.Field,
        [p4.id]: RotationAssignment.Bench,
        [p5.id]: RotationAssignment.Bench,
        [p6.id]: RotationAssignment.Field,
      }),
      buildRotation(6, {
        [p1.id]: RotationAssignment.Goalie,
        [p2.id]: RotationAssignment.Field,
        [p3.id]: RotationAssignment.Field,
        [p4.id]: RotationAssignment.Bench,
        [p5.id]: RotationAssignment.Field,
        [p6.id]: RotationAssignment.Bench,
      }),
    ];
    existingRotations[0].periodIndex = 0;
    existingRotations[1].periodIndex = 1;
    existingRotations[2].periodIndex = 2;
    existingRotations[3].periodIndex = 3;
    existingRotations[4].periodIndex = 3;
    existingRotations[5].periodIndex = 3;
    existingRotations[6].periodIndex = 3;

    const window = buildMidGameSolveWindow({
      config,
      periodDivisions: [1, 1, 1, 4],
      goalieAssignments: [],
      manualOverrides: [],
      startFromRotation: 2,
      existingRotations,
      players: [p1, p2, p3, p4, p5, p6],
    });

    expect(window).not.toBeNull();
    expect(window?.goalieAssignments).toEqual(
      expect.arrayContaining([{ periodIndex: 0, playerId: p2.id }]),
    );

    const schedule = exhaustiveSearch({
      players: [p1, p2, p3, p4, p5, p6],
      config: window!.config,
      goalieAssignments: window!.goalieAssignments,
      manualOverrides: window!.manualOverrides,
      periodDivisions: window!.periodDivisions,
      totalRotations: 5,
      benchSlotsPerRotation: 2,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    expect(schedule.rotations).toHaveLength(5);
  });
});

describe('buildMidGameMinPlayInputs', () => {
  it('keeps mid-game regenerate feasible when future period divisions increase', () => {
    const players = [
      playerFactory.build({ name: 'A', canPlayGoalie: false }),
      playerFactory.build({ name: 'B', canPlayGoalie: false }),
      playerFactory.build({ name: 'C', canPlayGoalie: false }),
      playerFactory.build({ name: 'D', canPlayGoalie: false }),
      playerFactory.build({ name: 'E', canPlayGoalie: false }),
      playerFactory.build({ name: 'F', canPlayGoalie: false }),
    ];

    const config = gameConfigFactory.build({
      periods: 4,
      rotationsPerPeriod: 1,
      fieldSize: 4,
      useGoalie: false,
      noConsecutiveBench: false,
      enforceMinPlayTime: true,
      minPlayPercentage: 75,
      skillBalance: false,
    });

    const periodDivisions = [1, 1, 1, 4];
    const existingRotations = [
      buildRotation(0, {
        [players[0].id]: RotationAssignment.Field,
        [players[1].id]: RotationAssignment.Field,
        [players[2].id]: RotationAssignment.Field,
        [players[3].id]: RotationAssignment.Field,
        [players[4].id]: RotationAssignment.Bench,
        [players[5].id]: RotationAssignment.Bench,
      }),
      buildRotation(1, {
        [players[0].id]: RotationAssignment.Field,
        [players[1].id]: RotationAssignment.Field,
        [players[2].id]: RotationAssignment.Field,
        [players[3].id]: RotationAssignment.Field,
        [players[4].id]: RotationAssignment.Bench,
        [players[5].id]: RotationAssignment.Bench,
      }),
    ];

    const minPlayInputs = buildMidGameMinPlayInputs({
      config,
      players,
      periodDivisions,
      startFromRotation: 2,
      existingRotations,
    });

    expect(minPlayInputs.rotationWeights).toEqual([1, 0.25, 0.25, 0.25, 0.25]);
    expect(minPlayInputs.maxBenchWeightByPlayer[players[0].id]).toBeCloseTo(1, 6);
    expect(minPlayInputs.maxBenchWeightByPlayer[players[4].id]).toBe(0);

    const schedule = exhaustiveSearch({
      players,
      config: { ...config, periods: 2 },
      goalieAssignments: [],
      manualOverrides: [],
      periodDivisions: [1, 4],
      rotationWeights: minPlayInputs.rotationWeights,
      maxBenchWeightByPlayer: minPlayInputs.maxBenchWeightByPlayer,
      totalRotations: 5,
      benchSlotsPerRotation: 2,
      onProgress: () => {},
      cancellation: { cancelled: false },
    });

    expect(schedule.rotations).toHaveLength(5);
  });
});

describe('worker solver fallback', () => {
  it('retries with min-play relaxed when live regenerate allows constraint relaxation', () => {
    const players = [
      playerFactory.build({ name: 'A', canPlayGoalie: false }),
      playerFactory.build({ name: 'B', canPlayGoalie: false }),
      playerFactory.build({ name: 'C', canPlayGoalie: false }),
    ];
    const config = gameConfigFactory.build({
      periods: 1,
      rotationsPerPeriod: 2,
      fieldSize: 2,
      useGoalie: false,
      noConsecutiveBench: false,
      enforceMinPlayTime: true,
      minPlayPercentage: 80,
      skillBalance: false,
    });

    const posted: SolverResponse[] = [];
    const originalPostMessage = self.postMessage;
    const mockPostMessage = vi.fn((message: SolverResponse) => {
      posted.push(message);
    });
    self.postMessage = mockPostMessage as typeof self.postMessage;

    try {
      (self.onmessage as ((event: MessageEvent) => void) | null)?.({
        data: {
          type: 'SOLVE',
          payload: {
            requestId: 'req-relax',
            players,
            config,
            absentPlayerIds: [],
            goalieAssignments: [],
            manualOverrides: [],
            periodDivisions: [2],
            allowConstraintRelaxation: true,
          },
        },
      } as MessageEvent);
    } finally {
      self.postMessage = originalPostMessage;
    }

    expect(posted.some((message) => message.type === 'SUCCESS')).toBe(true);
    expect(posted.some((message) => message.type === 'ERROR')).toBe(false);
  });

  it('returns an error without relaxation when min-play constraints are infeasible', () => {
    const players = [
      playerFactory.build({ name: 'A', canPlayGoalie: false }),
      playerFactory.build({ name: 'B', canPlayGoalie: false }),
      playerFactory.build({ name: 'C', canPlayGoalie: false }),
    ];
    const config = gameConfigFactory.build({
      periods: 1,
      rotationsPerPeriod: 2,
      fieldSize: 2,
      useGoalie: false,
      noConsecutiveBench: false,
      enforceMinPlayTime: true,
      minPlayPercentage: 80,
      skillBalance: false,
    });

    const posted: SolverResponse[] = [];
    const originalPostMessage = self.postMessage;
    const mockPostMessage = vi.fn((message: SolverResponse) => {
      posted.push(message);
    });
    self.postMessage = mockPostMessage as typeof self.postMessage;

    try {
      (self.onmessage as ((event: MessageEvent) => void) | null)?.({
        data: {
          type: 'SOLVE',
          payload: {
            requestId: 'req-no-relax',
            players,
            config,
            absentPlayerIds: [],
            goalieAssignments: [],
            manualOverrides: [],
            periodDivisions: [2],
            allowConstraintRelaxation: false,
          },
        },
      } as MessageEvent);
    } finally {
      self.postMessage = originalPostMessage;
    }

    expect(posted.some((message) => message.type === 'ERROR')).toBe(true);
  });
});

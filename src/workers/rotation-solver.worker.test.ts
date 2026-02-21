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
        {
          playerId: p3.id,
          rotationIndex: 1,
          assignment: RotationAssignment.Field,
          lockMode: 'hard',
        },
        {
          playerId: p3.id,
          rotationIndex: 4,
          assignment: RotationAssignment.Bench,
          lockMode: 'hard',
        },
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
        {
          playerId: p3.id,
          rotationIndex: 1,
          assignment: RotationAssignment.Bench,
          lockMode: 'hard',
        },
        {
          playerId: p1.id,
          rotationIndex: 0,
          assignment: RotationAssignment.Field,
          lockMode: 'hard',
        },
        {
          playerId: p2.id,
          rotationIndex: 0,
          assignment: RotationAssignment.Bench,
          lockMode: 'hard',
        },
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
  it('retries with no-consecutive-bench relaxed when live regenerate allows relaxation', () => {
    const players = [
      playerFactory.build({ name: 'A', canPlayGoalie: false }),
      playerFactory.build({ name: 'B', canPlayGoalie: false }),
      playerFactory.build({ name: 'C', canPlayGoalie: false }),
      playerFactory.build({ name: 'D', canPlayGoalie: false }),
    ];
    const config = gameConfigFactory.build({
      periods: 2,
      rotationsPerPeriod: 1,
      fieldSize: 2,
      useGoalie: false,
      noConsecutiveBench: true,
      maxConsecutiveBench: 1,
      enforceMinPlayTime: false,
      skillBalance: false,
    });
    const existingRotations = [
      buildRotation(0, {
        [players[0].id]: RotationAssignment.Field,
        [players[1].id]: RotationAssignment.Field,
        [players[2].id]: RotationAssignment.Bench,
        [players[3].id]: RotationAssignment.Bench,
      }),
      buildRotation(1, {
        [players[0].id]: RotationAssignment.Field,
        [players[1].id]: RotationAssignment.Field,
        [players[2].id]: RotationAssignment.Bench,
        [players[3].id]: RotationAssignment.Bench,
      }),
    ];
    existingRotations[0].periodIndex = 0;
    existingRotations[1].periodIndex = 1;

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
            manualOverrides: [
              {
                playerId: players[0].id,
                rotationIndex: 1,
                assignment: RotationAssignment.Field,
                lockMode: 'hard',
              },
            ],
            periodDivisions: [1, 1],
            startFromRotation: 1,
            existingRotations,
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

  it('keeps existing schedule when all relaxed attempts are still infeasible', () => {
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
    const existingRotations = [
      buildRotation(0, {
        [players[0].id]: RotationAssignment.Field,
        [players[1].id]: RotationAssignment.Field,
        [players[2].id]: RotationAssignment.Bench,
      }),
      buildRotation(1, {
        [players[0].id]: RotationAssignment.Field,
        [players[1].id]: RotationAssignment.Bench,
        [players[2].id]: RotationAssignment.Field,
      }),
    ];
    existingRotations[0].periodIndex = 0;
    existingRotations[1].periodIndex = 0;

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
            requestId: 'req-keep-existing',
            players,
            config,
            absentPlayerIds: [],
            goalieAssignments: [],
            manualOverrides: [],
            periodDivisions: [2],
            startFromRotation: 0,
            existingRotations,
            allowConstraintRelaxation: true,
          },
        },
      } as MessageEvent);
    } finally {
      self.postMessage = originalPostMessage;
    }

    const success = posted.find((message) => message.type === 'SUCCESS');
    expect(success).toBeDefined();
    expect(posted.some((message) => message.type === 'ERROR')).toBe(false);
    const solvedSchedule = (success as Extract<SolverResponse, { type: 'SUCCESS' }>).payload
      .schedule;
    expect(solvedSchedule.rotations).toHaveLength(existingRotations.length);
    expect(solvedSchedule.rotations[0].assignments).toEqual(existingRotations[0].assignments);
    expect(solvedSchedule.rotations[1].assignments).toEqual(existingRotations[1].assignments);
  });

  it('keeps all players at or above 50% in the P4 split regenerate backup scenario', () => {
    const players = [
      playerFactory.build({
        id: '5f1263f5-143a-425f-84bf-0e4be8cd9a7b',
        name: 'Sloane',
        skillRanking: 4,
        canPlayGoalie: true,
      }),
      playerFactory.build({
        id: 'a8d30cb2-d986-4196-ae69-3ceb6ddfe5a2',
        name: 'Ella',
        skillRanking: 4,
        canPlayGoalie: true,
      }),
      playerFactory.build({
        id: '04c3162c-2241-4c24-9246-0b43fecf39ba',
        name: 'Averie',
        skillRanking: 3,
        canPlayGoalie: true,
      }),
      playerFactory.build({
        id: 'ac16468a-f3d7-49cc-903c-6789d49f757c',
        name: 'Kendall',
        skillRanking: 5,
        canPlayGoalie: true,
      }),
      playerFactory.build({
        id: '886f7cba-9f1e-4003-9b04-cc2a47b6cc44',
        name: 'Ava G',
        skillRanking: 4,
        canPlayGoalie: true,
      }),
      playerFactory.build({
        id: '0666d455-94a4-4375-bd90-09031d8f5427',
        name: 'Evalyn',
        skillRanking: 4,
        canPlayGoalie: true,
      }),
      playerFactory.build({
        id: 'c5a1bdc4-891d-44d7-a227-1db8340aa115',
        name: 'Holly',
        skillRanking: 5,
        canPlayGoalie: true,
      }),
      playerFactory.build({
        id: 'd3606e71-c6ab-4eee-810a-d612c07ca523',
        name: 'Paige',
        skillRanking: 5,
        canPlayGoalie: true,
      }),
      playerFactory.build({
        id: '3c58da20-6ac7-4f19-9c0f-e7c80191dd01',
        name: 'Denver',
        skillRanking: 5,
        canPlayGoalie: true,
      }),
      playerFactory.build({
        id: 'e9946de1-9d34-40c8-9c65-e7a7985509cd',
        name: 'Avee',
        skillRanking: 2,
        canPlayGoalie: false,
      }),
      playerFactory.build({
        id: '84381b62-dccb-44a2-9d0f-6f08c592a8d2',
        name: 'Lu',
        skillRanking: 4,
        canPlayGoalie: true,
      }),
      playerFactory.build({
        id: '298796f4-4526-4c28-b745-5322f9ba6ffd',
        name: 'Reagan',
        skillRanking: 1,
        canPlayGoalie: false,
      }),
      playerFactory.build({
        id: 'e2e924e3-830e-44da-93bb-18f7f8971d4c',
        name: 'Margot',
        skillRanking: 4,
        canPlayGoalie: true,
      }),
    ];

    const config = gameConfigFactory.build({
      periods: 4,
      rotationsPerPeriod: 1,
      fieldSize: 7,
      usePositions: true,
      formation: [
        { position: 'DEF', count: 2 },
        { position: 'MID', count: 3 },
        { position: 'FWD', count: 1 },
      ],
      useGoalie: true,
      noConsecutiveBench: true,
      maxConsecutiveBench: 1,
      enforceMinPlayTime: true,
      minPlayPercentage: 50,
      goaliePlayFullPeriod: true,
      goalieRestAfterPeriod: true,
      skillBalance: true,
    });

    const existingRotations = [
      buildRotation(0, {
        'a8d30cb2-d986-4196-ae69-3ceb6ddfe5a2': RotationAssignment.Goalie,
        'd3606e71-c6ab-4eee-810a-d612c07ca523': RotationAssignment.Field,
        '3c58da20-6ac7-4f19-9c0f-e7c80191dd01': RotationAssignment.Bench,
        'ac16468a-f3d7-49cc-903c-6789d49f757c': RotationAssignment.Bench,
        '5f1263f5-143a-425f-84bf-0e4be8cd9a7b': RotationAssignment.Bench,
        '04c3162c-2241-4c24-9246-0b43fecf39ba': RotationAssignment.Bench,
        '886f7cba-9f1e-4003-9b04-cc2a47b6cc44': RotationAssignment.Bench,
        '0666d455-94a4-4375-bd90-09031d8f5427': RotationAssignment.Bench,
        'c5a1bdc4-891d-44d7-a227-1db8340aa115': RotationAssignment.Field,
        'e9946de1-9d34-40c8-9c65-e7a7985509cd': RotationAssignment.Field,
        '84381b62-dccb-44a2-9d0f-6f08c592a8d2': RotationAssignment.Field,
        '298796f4-4526-4c28-b745-5322f9ba6ffd': RotationAssignment.Field,
        'e2e924e3-830e-44da-93bb-18f7f8971d4c': RotationAssignment.Field,
      }),
      buildRotation(1, {
        'a8d30cb2-d986-4196-ae69-3ceb6ddfe5a2': RotationAssignment.Bench,
        'd3606e71-c6ab-4eee-810a-d612c07ca523': RotationAssignment.Goalie,
        '3c58da20-6ac7-4f19-9c0f-e7c80191dd01': RotationAssignment.Field,
        'ac16468a-f3d7-49cc-903c-6789d49f757c': RotationAssignment.Field,
        '5f1263f5-143a-425f-84bf-0e4be8cd9a7b': RotationAssignment.Field,
        '04c3162c-2241-4c24-9246-0b43fecf39ba': RotationAssignment.Field,
        '886f7cba-9f1e-4003-9b04-cc2a47b6cc44': RotationAssignment.Field,
        '0666d455-94a4-4375-bd90-09031d8f5427': RotationAssignment.Field,
        'c5a1bdc4-891d-44d7-a227-1db8340aa115': RotationAssignment.Bench,
        'e9946de1-9d34-40c8-9c65-e7a7985509cd': RotationAssignment.Bench,
        '84381b62-dccb-44a2-9d0f-6f08c592a8d2': RotationAssignment.Bench,
        '298796f4-4526-4c28-b745-5322f9ba6ffd': RotationAssignment.Bench,
        'e2e924e3-830e-44da-93bb-18f7f8971d4c': RotationAssignment.Bench,
      }),
      buildRotation(2, {
        'a8d30cb2-d986-4196-ae69-3ceb6ddfe5a2': RotationAssignment.Field,
        'd3606e71-c6ab-4eee-810a-d612c07ca523': RotationAssignment.Bench,
        '3c58da20-6ac7-4f19-9c0f-e7c80191dd01': RotationAssignment.Goalie,
        'ac16468a-f3d7-49cc-903c-6789d49f757c': RotationAssignment.Bench,
        '5f1263f5-143a-425f-84bf-0e4be8cd9a7b': RotationAssignment.Bench,
        '04c3162c-2241-4c24-9246-0b43fecf39ba': RotationAssignment.Bench,
        '886f7cba-9f1e-4003-9b04-cc2a47b6cc44': RotationAssignment.Bench,
        '0666d455-94a4-4375-bd90-09031d8f5427': RotationAssignment.Bench,
        'c5a1bdc4-891d-44d7-a227-1db8340aa115': RotationAssignment.Field,
        'e9946de1-9d34-40c8-9c65-e7a7985509cd': RotationAssignment.Field,
        '84381b62-dccb-44a2-9d0f-6f08c592a8d2': RotationAssignment.Field,
        '298796f4-4526-4c28-b745-5322f9ba6ffd': RotationAssignment.Field,
        'e2e924e3-830e-44da-93bb-18f7f8971d4c': RotationAssignment.Field,
      }),
      buildRotation(3, {
        'a8d30cb2-d986-4196-ae69-3ceb6ddfe5a2': RotationAssignment.Field,
        'd3606e71-c6ab-4eee-810a-d612c07ca523': RotationAssignment.Field,
        '3c58da20-6ac7-4f19-9c0f-e7c80191dd01': RotationAssignment.Bench,
        'ac16468a-f3d7-49cc-903c-6789d49f757c': RotationAssignment.Goalie,
        '5f1263f5-143a-425f-84bf-0e4be8cd9a7b': RotationAssignment.Field,
        '04c3162c-2241-4c24-9246-0b43fecf39ba': RotationAssignment.Field,
        '886f7cba-9f1e-4003-9b04-cc2a47b6cc44': RotationAssignment.Field,
        '0666d455-94a4-4375-bd90-09031d8f5427': RotationAssignment.Field,
        'c5a1bdc4-891d-44d7-a227-1db8340aa115': RotationAssignment.Bench,
        'e9946de1-9d34-40c8-9c65-e7a7985509cd': RotationAssignment.Bench,
        '84381b62-dccb-44a2-9d0f-6f08c592a8d2': RotationAssignment.Bench,
        '298796f4-4526-4c28-b745-5322f9ba6ffd': RotationAssignment.Bench,
        'e2e924e3-830e-44da-93bb-18f7f8971d4c': RotationAssignment.Bench,
      }),
      buildRotation(4, {
        'a8d30cb2-d986-4196-ae69-3ceb6ddfe5a2': RotationAssignment.Field,
        'd3606e71-c6ab-4eee-810a-d612c07ca523': RotationAssignment.Field,
        '3c58da20-6ac7-4f19-9c0f-e7c80191dd01': RotationAssignment.Bench,
        'ac16468a-f3d7-49cc-903c-6789d49f757c': RotationAssignment.Goalie,
        '5f1263f5-143a-425f-84bf-0e4be8cd9a7b': RotationAssignment.Field,
        '04c3162c-2241-4c24-9246-0b43fecf39ba': RotationAssignment.Field,
        '886f7cba-9f1e-4003-9b04-cc2a47b6cc44': RotationAssignment.Field,
        '0666d455-94a4-4375-bd90-09031d8f5427': RotationAssignment.Field,
        'c5a1bdc4-891d-44d7-a227-1db8340aa115': RotationAssignment.Bench,
        'e9946de1-9d34-40c8-9c65-e7a7985509cd': RotationAssignment.Bench,
        '84381b62-dccb-44a2-9d0f-6f08c592a8d2': RotationAssignment.Bench,
        '298796f4-4526-4c28-b745-5322f9ba6ffd': RotationAssignment.Bench,
        'e2e924e3-830e-44da-93bb-18f7f8971d4c': RotationAssignment.Bench,
      }),
    ];
    existingRotations[0].periodIndex = 0;
    existingRotations[1].periodIndex = 1;
    existingRotations[2].periodIndex = 2;
    existingRotations[3].periodIndex = 3;
    existingRotations[4].periodIndex = 3;

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
            requestId: 'req-backup-p4',
            players,
            config,
            absentPlayerIds: [],
            goalieAssignments: [
              { periodIndex: 0, playerId: 'a8d30cb2-d986-4196-ae69-3ceb6ddfe5a2' },
              { periodIndex: 1, playerId: 'd3606e71-c6ab-4eee-810a-d612c07ca523' },
              { periodIndex: 2, playerId: '3c58da20-6ac7-4f19-9c0f-e7c80191dd01' },
              { periodIndex: 3, playerId: 'ac16468a-f3d7-49cc-903c-6789d49f757c' },
            ],
            manualOverrides: [],
            periodDivisions: [1, 1, 1, 2],
            startFromRotation: 3,
            existingRotations,
            allowConstraintRelaxation: true,
          },
        },
      } as MessageEvent);
    } finally {
      self.postMessage = originalPostMessage;
    }

    const success = posted.find((message) => message.type === 'SUCCESS');
    expect(success).toBeDefined();
    expect(posted.some((message) => message.type === 'ERROR')).toBe(false);

    const solvedSchedule = (success as Extract<SolverResponse, { type: 'SUCCESS' }>).payload
      .schedule;
    const minPlay = Math.min(
      ...Object.values(solvedSchedule.playerStats).map((s) => s.playPercentage),
    );
    expect(minPlay).toBeGreaterThanOrEqual(50);
  });
});

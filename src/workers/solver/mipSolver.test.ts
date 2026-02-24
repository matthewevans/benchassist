import { describe, it, expect, beforeAll } from 'vitest';
import highsLoader from 'highs';
import { Model } from 'lp-model';
import { buildPhase1Model } from './mipModelBuilder.ts';
import { extractBenchSets } from './mipSolutionExtractor.ts';
import { buildSchedule } from './exhaustive.ts';
import { prepareConstraints } from './constraintPreparation.ts';
import type { Player, GameConfig } from '@/types/domain.ts';
import type { SolverContext } from './types.ts';
import { playerFactory, gameConfigFactory } from '@/test/factories.ts';

type Highs = Awaited<ReturnType<typeof highsLoader>>;

function buildTrivialLP(): string {
  const model = new Model();
  const x = model.addVar({ vtype: 'BINARY', name: 'x' });
  model.addConstr([x], '>=', 1);
  model.setObjective([x], 'MINIMIZE');
  return model.toLPFormat();
}

/**
 * Regression: the highs JS wrapper (v1.8.0) captures stdout to parse
 * solutions via _Highs_writeSolutionPretty. Setting output_flag or
 * log_to_console to false suppresses that output, causing
 * "Unable to parse solution. Too few lines."
 *
 * Uses an isolated HiGHS instance — intentional errors corrupt WASM state.
 */
describe('HiGHS solve options', () => {
  let highs: Highs;
  beforeAll(async () => {
    highs = await highsLoader();
  });

  it('solves with default output options', { timeout: 15_000 }, () => {
    const solution = highs.solve(buildTrivialLP(), { time_limit: 5 });

    expect(solution.Status).toBe('Optimal');
    expect(solution.Columns['x']).toBeDefined();
    expect((solution.Columns['x'] as { Primal: number }).Primal).toBeCloseTo(1);
  });

  it('breaks with output_flag: false (regression guard)', { timeout: 15_000 }, () => {
    expect(() => highs.solve(buildTrivialLP(), { output_flag: false })).toThrow('Too few lines');
  });

  it('breaks with log_to_console: false (regression guard)', { timeout: 15_000 }, () => {
    expect(() => highs.solve(buildTrivialLP(), { log_to_console: false })).toThrow('Too few lines');
  });
});

// Representative config: 13 players, 7v7, 4 periods × 1 rotation
const players: Player[] = [
  {
    id: 'p1',
    name: 'Riley',
    skillRanking: 5,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p2',
    name: 'Jordan',
    skillRanking: 3,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p3',
    name: 'Casey',
    skillRanking: 2,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p4',
    name: 'Sky',
    skillRanking: 4,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p5',
    name: 'Harper',
    skillRanking: 1,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p6',
    name: 'Parker',
    skillRanking: 5,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p7',
    name: 'Morgan',
    skillRanking: 3,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p8',
    name: 'Quinn',
    skillRanking: 4,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p9',
    name: 'Dakota',
    skillRanking: 2,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p10',
    name: 'Emery',
    skillRanking: 1,
    canPlayGoalie: false,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p11',
    name: 'Blake',
    skillRanking: 5,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p12',
    name: 'Ariel',
    skillRanking: 2,
    canPlayGoalie: false,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p13',
    name: 'Tatum',
    skillRanking: 4,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
];

const config: GameConfig = {
  id: 'c1',
  teamId: 't1',
  name: 'Test',
  fieldSize: 7,
  periods: 4,
  periodDurationMinutes: 12,
  rotationsPerPeriod: 1,
  usePositions: false,
  formation: [],
  useGoalie: true,
  noConsecutiveBench: true,
  maxConsecutiveBench: 1,
  enforceMinPlayTime: true,
  minPlayPercentage: 50,
  goaliePlayFullPeriod: true,
  goalieRestAfterPeriod: true,
  skillBalance: true,
  createdAt: 0,
  updatedAt: 0,
};

function makeCtx(overrides?: Partial<SolverContext>): SolverContext {
  return {
    players,
    config,
    goalieAssignments: [],
    manualOverrides: [],
    periodDivisions: [1, 1, 1, 1],
    totalRotations: 4,
    benchSlotsPerRotation: 6,
    onProgress: () => {},
    cancellation: { cancelled: false },
    ...overrides,
  };
}

/** Solve using the single-phase MIP model. */
function solveModel(highs: Highs, ctx: SolverContext) {
  const constraints = prepareConstraints(ctx);
  const model = buildPhase1Model(ctx, constraints);
  const solution = highs.solve(model.lpString, { time_limit: 12 });
  expect(solution.Status).toBe('Optimal');

  const benchSets = extractBenchSets(solution, model, ctx.totalRotations);
  const playerPatterns = ctx.players.map((player) => ({ player, patterns: [] as number[][] }));

  return buildSchedule(
    playerPatterns,
    benchSets,
    constraints.goalieMap,
    constraints.hardFieldPositionLocksByRotation,
    constraints.softFieldPositionPrefsByRotation,
    constraints.positionContinuityPlayerIdsByRotation,
    ctx.players,
    { ...ctx.config, periodDivisions: constraints.normalizedPeriodDivisions },
    ctx.totalRotations,
  );
}

/** Phase 1 only (feasibility) — mirrors the worker's optimization trial-solve. */
function solveFeasibilityOnly(highs: Highs, ctx: SolverContext) {
  const constraints = prepareConstraints(ctx);
  const model = buildPhase1Model(ctx, constraints);
  const solution = highs.solve(model.lpString, {
    time_limit: 5,
    mip_rel_gap: 1e30,
  });
  expect(solution.Status).toBe('Optimal');

  const benchSets = extractBenchSets(solution, model, ctx.totalRotations);
  const playerPatterns = ctx.players.map((player) => ({ player, patterns: [] as number[][] }));

  return buildSchedule(
    playerPatterns,
    benchSets,
    constraints.goalieMap,
    constraints.hardFieldPositionLocksByRotation,
    constraints.softFieldPositionPrefsByRotation,
    constraints.positionContinuityPlayerIdsByRotation,
    ctx.players,
    { ...ctx.config, periodDivisions: constraints.normalizedPeriodDivisions },
    ctx.totalRotations,
  );
}

describe('mipSolve end-to-end', () => {
  let highs: Highs;
  beforeAll(async () => {
    highs = await highsLoader();
  });

  it('solves the base 13-player 7v7 config', { timeout: 30_000 }, () => {
    const schedule = solveModel(highs, makeCtx());

    expect(schedule.rotations).toHaveLength(4);
    expect(Object.keys(schedule.playerStats)).toHaveLength(13);
  });

  it('gives high-skill players more play time when skillBalance is on', { timeout: 30_000 }, () => {
    const schedule = solveModel(highs, makeCtx());

    const skill5 = players.filter((p) => p.skillRanking === 5);
    const skill1and2 = players.filter((p) => p.skillRanking <= 2);

    const avgPlayPct = (group: Player[]) =>
      group.reduce((sum, p) => sum + schedule.playerStats[p.id].playPercentage, 0) / group.length;

    const highSkillAvg = avgPlayPct(skill5);
    const lowSkillAvg = avgPlayPct(skill1and2);

    // High-skill players should play at least as much as low-skill players
    expect(highSkillAvg).toBeGreaterThanOrEqual(lowSkillAvg);
  });

  it('maintains reasonable strength balance across rotations', { timeout: 30_000 }, () => {
    const schedule = solveModel(highs, makeCtx());

    const strengths = schedule.rotations.map((r) => r.teamStrength);
    const maxStrength = Math.max(...strengths);
    const minStrength = Math.min(...strengths);

    // Strength range should be reasonable (not more than 8 points spread)
    expect(maxStrength - minStrength).toBeLessThanOrEqual(8);
  });
});

// Config with relaxed constraints — matches what the worker uses for optimization trial solves
const trialConfig: GameConfig = {
  ...config,
  noConsecutiveBench: false,
  skillBalance: false,
};

describe('optimization trial-solves (feasibilityOnly)', () => {
  let highs: Highs;
  beforeAll(async () => {
    highs = await highsLoader();
  });

  const trialDivisions: number[][] = [
    [1, 1, 2, 1],
    [1, 2, 2, 1],
    [2, 2, 2, 1],
    [2, 2, 2, 2],
  ];

  it(
    'solves multiple division candidates sequentially without WASM errors',
    { timeout: 60_000 },
    () => {
      for (const divisions of trialDivisions) {
        const totalRotations = divisions.reduce((a, b) => a + b, 0);
        const ctx = makeCtx({
          config: trialConfig,
          periodDivisions: divisions,
          totalRotations,
          feasibilityOnly: true,
          searchTimeoutMs: 5_000,
        });

        const schedule = solveFeasibilityOnly(highs, ctx);
        expect(schedule.rotations).toHaveLength(totalRotations);
        expect(Object.keys(schedule.playerStats)).toHaveLength(13);
      }
    },
  );

  it(
    'full solve with [2,1,1,1] divisions under relaxed trial constraints',
    { timeout: 60_000 },
    () => {
      const schedule = solveModel(
        highs,
        makeCtx({
          config: trialConfig,
          periodDivisions: [2, 1, 1, 1],
          totalRotations: 5,
        }),
      );
      expect(schedule.rotations).toHaveLength(5);
    },
  );

  it('produces better equity with more rotations', { timeout: 60_000 }, () => {
    const baseSchedule = solveFeasibilityOnly(highs, makeCtx({ config: trialConfig }));
    const baseStats = Object.values(baseSchedule.playerStats);
    const baseGap =
      Math.max(...baseStats.map((s) => s.playPercentage)) -
      Math.min(...baseStats.map((s) => s.playPercentage));

    const ctx8 = makeCtx({
      config: trialConfig,
      periodDivisions: [2, 2, 2, 2],
      totalRotations: 8,
    });
    const schedule8 = solveFeasibilityOnly(highs, ctx8);
    const stats8 = Object.values(schedule8.playerStats);
    const gap8 =
      Math.max(...stats8.map((s) => s.playPercentage)) -
      Math.min(...stats8.map((s) => s.playPercentage));

    expect(gap8).toBeLessThanOrEqual(baseGap);
  });
});

/**
 * Regression test for WASM crash when solving [1,1,1,2] divisions
 * with 9 players, fieldSize 5, full constraints (noConsecutiveBench + skillBalance).
 * Reproduces: "Unable to solve the problem. HiGHS error RuntimeError: Aborted()"
 *
 * Root cause: HiGHS WASM instance gets corrupted after certain solves, causing
 * subsequent solves on the same instance to crash with Emscripten abort().
 */
describe('9-player 5v5 with [1,1,1,2] divisions (WASM crash regression)', () => {
  const smallPlayers = playerFactory.buildList(9, {}, { transient: {} });
  const smallConfig = gameConfigFactory.build({
    fieldSize: 5,
    periods: 4,
    rotationsPerPeriod: 1,
    useGoalie: false,
    goaliePlayFullPeriod: false,
    goalieRestAfterPeriod: false,
  });

  function makeSmallCtx(overrides?: Partial<SolverContext>): SolverContext {
    return {
      players: smallPlayers,
      config: smallConfig,
      goalieAssignments: [],
      manualOverrides: [],
      periodDivisions: [1, 1, 1, 2],
      totalRotations: 5,
      benchSlotsPerRotation: 4,
      onProgress: () => {},
      cancellation: { cancelled: false },
      ...overrides,
    };
  }

  it('builds a valid LP model for [1,1,1,2]', () => {
    const ctx = makeSmallCtx();
    const constraints = prepareConstraints(ctx);
    const model = buildPhase1Model(ctx, constraints);
    expect(model.lpString).toContain('Minimize');
    expect(model.lpString).toContain('End');
  });

  it('solves [1,1,1,2] with full constraints on fresh instance', { timeout: 30_000 }, async () => {
    const freshHighs = await highsLoader();
    const schedule = solveModel(freshHighs, makeSmallCtx());
    expect(schedule.rotations).toHaveLength(5);
    expect(Object.keys(schedule.playerStats)).toHaveLength(9);
  });

  it('solves [1,1,1,1] on fresh instance', { timeout: 30_000 }, async () => {
    const freshHighs = await highsLoader();
    const schedule = solveModel(
      freshHighs,
      makeSmallCtx({ periodDivisions: [1, 1, 1, 1], totalRotations: 4 }),
    );
    expect(schedule.rotations).toHaveLength(4);
  });

  it('sequential solves on fresh instances both succeed', { timeout: 30_000 }, async () => {
    const highs1 = await highsLoader();
    const schedule1 = solveModel(highs1, makeSmallCtx());
    expect(schedule1.rotations).toHaveLength(5);

    const highs2 = await highsLoader();
    const schedule2 = solveModel(
      highs2,
      makeSmallCtx({ periodDivisions: [1, 1, 1, 1], totalRotations: 4 }),
    );
    expect(schedule2.rotations).toHaveLength(4);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameConfig, Player, RotationSchedule } from '@/types/domain.ts';
import type { PreparedConstraints } from './constraintPreparation.ts';
import type { SolverContext } from './types.ts';

const mocks = vi.hoisted(() => ({
  highsLoader: vi.fn(),
  solve: vi.fn(),
  prepareConstraints: vi.fn(),
  buildPhase1Model: vi.fn(),
  extractBenchSets: vi.fn(),
  buildSchedule: vi.fn(),
  mapMipError: vi.fn(),
}));

vi.mock('highs', () => ({
  default: mocks.highsLoader,
}));

vi.mock('./constraintPreparation.ts', () => ({
  prepareConstraints: mocks.prepareConstraints,
}));

vi.mock('./mipModelBuilder.ts', () => ({
  buildPhase1Model: mocks.buildPhase1Model,
}));

vi.mock('./mipSolutionExtractor.ts', () => ({
  extractBenchSets: mocks.extractBenchSets,
}));

vi.mock('./exhaustive.ts', () => ({
  buildSchedule: mocks.buildSchedule,
}));

vi.mock('./mipErrorMapper.ts', () => ({
  mapMipError: mocks.mapMipError,
}));

import { mipSolve } from './mipSolver.ts';

const players: Player[] = [
  {
    id: 'p1',
    name: 'Rin',
    skillRanking: 5,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
  {
    id: 'p2',
    name: 'Niko',
    skillRanking: 2,
    canPlayGoalie: true,
    primaryPosition: null,
    secondaryPositions: [],
    createdAt: 0,
  },
];

const config: GameConfig = {
  id: 'c1',
  teamId: 't1',
  name: 'Test Config',
  fieldSize: 1,
  periods: 1,
  periodDurationMinutes: 10,
  rotationsPerPeriod: 1,
  usePositions: false,
  formation: [],
  useGoalie: true,
  noConsecutiveBench: false,
  maxConsecutiveBench: 1,
  enforceMinPlayTime: false,
  minPlayPercentage: 50,
  goaliePlayFullPeriod: true,
  goalieRestAfterPeriod: false,
  skillBalance: false,
  createdAt: 0,
  updatedAt: 0,
};

const preparedConstraints: PreparedConstraints = {
  goalieMap: new Map<number, string>(),
  cannotBench: new Map<string, Set<number>>(),
  mustBench: new Map<string, Set<number>>(),
  hardFieldPositionLocksByRotation: new Map(),
  softFieldPositionPrefsByRotation: new Map(),
  positionContinuityPlayerIdsByRotation: new Map(),
  softOverrides: [],
  maxBenchWeightByPlayer: new Map(),
  rotationWeights: [1],
  totalRotationWeight: 1,
  normalizedPeriodDivisions: [1],
};

const phase1Model = {
  lpString: 'PHASE_1_LP',
  benchVarNames: [['b_0_0']],
  playerOrder: players,
};

const scheduleResult = {
  rotations: [],
  playerStats: {},
  overallStats: {
    strengthVariance: 0,
    minStrength: 0,
    maxStrength: 0,
    avgStrength: 0,
    violations: [],
    isValid: true,
  },
  generatedAt: 0,
} as RotationSchedule;

function makeContext(overrides?: Partial<SolverContext>): SolverContext {
  return {
    players,
    config,
    goalieAssignments: [],
    manualOverrides: [],
    periodDivisions: [1],
    totalRotations: 1,
    benchSlotsPerRotation: 1,
    onProgress: vi.fn(),
    cancellation: { cancelled: false },
    ...overrides,
  };
}

describe('mipSolve control flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.highsLoader.mockResolvedValue({ solve: mocks.solve });
    mocks.prepareConstraints.mockReturnValue(preparedConstraints);
    mocks.buildPhase1Model.mockReturnValue(phase1Model);
    mocks.extractBenchSets.mockReturnValue([[]]);
    mocks.buildSchedule.mockReturnValue(scheduleResult);
    mocks.mapMipError.mockReturnValue(new Error('Mapped solver error'));
  });

  it('solves with a single call and builds schedule', async () => {
    const solution = {
      Status: 'Optimal',
      Columns: { playMax: { Primal: 1 }, playMin: { Primal: 0 }, b_0_0: { Primal: 0 } },
    };
    mocks.solve.mockReturnValueOnce(solution);

    const schedule = await mipSolve(makeContext());

    expect(schedule).toBe(scheduleResult);
    expect(mocks.solve).toHaveBeenCalledTimes(1);
    expect(mocks.solve).toHaveBeenCalledWith('PHASE_1_LP', {
      time_limit: 12,
      mip_rel_gap: 0,
    });
    expect(mocks.extractBenchSets).toHaveBeenCalledWith(solution, phase1Model, 1);
  });

  it('accepts a time-limit solution when an incumbent exists', async () => {
    const solution = {
      Status: 'Time limit reached',
      Columns: { b_0_0: { Primal: 0 }, playMax: { Primal: 1 }, playMin: { Primal: 0 } },
    };
    mocks.solve.mockReturnValueOnce(solution);

    await mipSolve(makeContext());

    expect(mocks.mapMipError).not.toHaveBeenCalled();
    expect(mocks.extractBenchSets).toHaveBeenCalledWith(solution, phase1Model, 1);
  });

  it('uses feasibilityOnly options when set', async () => {
    const solution = {
      Status: 'Optimal',
      Columns: { playMax: { Primal: 1 }, playMin: { Primal: 0 }, b_0_0: { Primal: 0 } },
    };
    mocks.solve.mockReturnValueOnce(solution);

    await mipSolve(
      makeContext({
        feasibilityOnly: true,
        searchTimeoutMs: 5_000,
      }),
    );

    expect(mocks.solve).toHaveBeenCalledTimes(1);
    expect(mocks.solve).toHaveBeenCalledWith('PHASE_1_LP', {
      time_limit: 5,
      mip_rel_gap: 1e30,
    });
  });

  it('maps a non-feasible result to a domain error', async () => {
    const solution = { Status: 'Infeasible', Columns: {} };
    const mappedError = new Error('No valid rotation schedule');
    mocks.solve.mockReturnValueOnce(solution);
    mocks.mapMipError.mockReturnValueOnce(mappedError);

    await expect(mipSolve(makeContext())).rejects.toThrow('No valid rotation schedule');
    expect(mocks.mapMipError).toHaveBeenCalledWith(solution, players, preparedConstraints, 1, 1);
    expect(mocks.buildSchedule).not.toHaveBeenCalled();
  });

  it('returns Cancelled before building constraints when cancellation is pre-set', async () => {
    await expect(mipSolve(makeContext({ cancellation: { cancelled: true } }))).rejects.toThrow(
      'Cancelled',
    );

    expect(mocks.prepareConstraints).not.toHaveBeenCalled();
    expect(mocks.solve).not.toHaveBeenCalled();
  });
});

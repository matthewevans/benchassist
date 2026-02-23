import highsLoader from 'highs';
import type { HighsSolution } from 'highs';
import type { RotationSchedule } from '@/types/domain.ts';
import { buildSchedule } from './exhaustive.ts';
import type { SolverContext } from './types.ts';
import { prepareConstraints } from './constraintPreparation.ts';
import type { PreparedConstraints } from './constraintPreparation.ts';
import { buildPhase1Model } from './mipModelBuilder.ts';
import type { BuiltModel } from './mipModelBuilder.ts';
import { extractBenchSets } from './mipSolutionExtractor.ts';
import { mapMipError } from './mipErrorMapper.ts';

type Highs = Awaited<ReturnType<typeof highsLoader>>;

let _highs: Highs | null = null;
let _highsPromise: Promise<Highs> | null = null;

/**
 * Initialize the HiGHS WASM solver. Safe to call multiple times — returns
 * the same singleton promise. Call this at worker startup to hide latency.
 */
export function initHiGHS(): Promise<Highs> {
  if (_highs) return Promise.resolve(_highs);
  if (_highsPromise) return _highsPromise;
  _highsPromise = highsLoader({
    locateFile: (file: string) => `/${file}`,
  }).then((instance) => {
    _highs = instance;
    return instance;
  });
  return _highsPromise;
}

/** Reset the HiGHS singleton so the next call to initHiGHS reloads WASM. */
function resetHiGHS(): void {
  _highs = null;
  _highsPromise = null;
}

/**
 * Wrapper around highs.solve() that catches WASM RuntimeErrors (e.g. Aborted())
 * and converts them to a proper Error. Resets the HiGHS singleton on WASM crash
 * so subsequent calls reload a fresh instance.
 */
function safeSolve(
  highs: Highs,
  lpString: string,
  options: Record<string, unknown>,
): HighsSolution {
  try {
    return highs.solve(lpString, options);
  } catch (error) {
    if (error instanceof Error && !(error instanceof RangeError) && !(error instanceof TypeError)) {
      // WASM RuntimeError (Aborted, memory access, etc.) — reset the singleton
      resetHiGHS();
    }
    throw new Error(
      `No valid rotation schedule found. Solver crashed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Check whether a HiGHS solution has usable variable values.
 * Returns true for Optimal and Time-limit-with-incumbent.
 */
function hasFeasibleSolution(solution: HighsSolution): boolean {
  if (solution.Status === 'Optimal') return true;
  if (solution.Status === 'Time limit reached') {
    // Check if an incumbent (feasible integer solution) exists
    const firstCol = Object.values(solution.Columns)[0];
    return firstCol != null && 'Primal' in firstCol;
  }
  return false;
}

/**
 * Solve the rotation scheduling problem using HiGHS MIP.
 *
 * Single-phase weighted optimization:
 *   - Primary: minimize play time gap (equity)
 *   - Secondary: minimize strength L1 deviation (balance, when skillBalance on)
 *   - Tertiary: prefer benching low-skill players / respect soft overrides
 */
export async function mipSolve(ctx: SolverContext): Promise<RotationSchedule> {
  const { players, totalRotations, benchSlotsPerRotation, cancellation } = ctx;

  const highs = await initHiGHS();

  if (cancellation.cancelled) throw new Error('Cancelled');

  ctx.onProgress(2, 'game:solver.initializing');

  const constraints = prepareConstraints(ctx);

  if (cancellation.cancelled) throw new Error('Cancelled');

  ctx.onProgress(8, 'game:solver.generating_patterns');

  const model = buildPhase1Model(ctx, constraints);

  ctx.onProgress(12, JSON.stringify({ key: 'game:solver.searching', combinations: '0' }));

  const timeLimitSeconds = (ctx.searchTimeoutMs ?? 12_000) / 1000;
  // Note: do NOT pass output_flag or log_to_console options — the highs JS
  // wrapper (v1.8.0) captures stdout to parse solutions, so suppressing output
  // causes "Unable to parse solution. Too few lines." Worker console output is
  // invisible to the user.
  const solution = safeSolve(highs, model.lpString, {
    time_limit: timeLimitSeconds,
    mip_rel_gap: ctx.feasibilityOnly ? 1e30 : 0,
  });

  if (cancellation.cancelled) throw new Error('Cancelled');

  if (!hasFeasibleSolution(solution)) {
    throw mapMipError(solution, players, constraints, totalRotations, benchSlotsPerRotation);
  }

  ctx.onProgress(47, 'game:solver.building_schedule');

  return buildScheduleFromSolution(solution, model, ctx, constraints);
}

function buildScheduleFromSolution(
  solution: HighsSolution,
  builtModel: BuiltModel,
  ctx: SolverContext,
  constraints: PreparedConstraints,
): RotationSchedule {
  const benchSets = extractBenchSets(solution, builtModel, ctx.totalRotations);
  const playerPatterns = ctx.players.map((player) => ({ player, patterns: [] as number[][] }));

  return buildSchedule(
    playerPatterns,
    benchSets,
    constraints.goalieMap,
    constraints.hardFieldPositionLocksByRotation,
    constraints.softFieldPositionPrefsByRotation,
    ctx.players,
    {
      ...ctx.config,
      periodDivisions: constraints.normalizedPeriodDivisions,
    },
    ctx.totalRotations,
  );
}

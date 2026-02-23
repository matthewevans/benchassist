import type { HighsSolution } from 'highs';
import type { BenchPattern } from './types.ts';
import type { BuiltModel } from './mipModelBuilder.ts';

type MipSolution = Extract<HighsSolution, { Status: 'Optimal' }> | HighsSolution;

/**
 * Extract the optimal gap value (playMax - playMin) from a Phase 1 solution.
 */
export function extractGapValue(solution: MipSolution): number {
  const cols = solution.Columns;
  const playMax = cols['playMax'];
  const playMin = cols['playMin'];
  if (!playMax || !playMin || !('Primal' in playMax) || !('Primal' in playMin)) {
    throw new Error('Solution missing playMax/playMin variables');
  }
  return (playMax as { Primal: number }).Primal - (playMin as { Primal: number }).Primal;
}

/**
 * Extract bench patterns from a HiGHS MIP solution.
 * Returns one BenchPattern per player (sorted rotation indices where b[i][r] ≈ 1).
 */
export function extractBenchSets(
  solution: MipSolution,
  builtModel: BuiltModel,
  totalRotations: number,
): BenchPattern[] {
  const cols = solution.Columns;
  const benchSets: BenchPattern[] = [];

  for (let i = 0; i < builtModel.playerOrder.length; i++) {
    const pattern: number[] = [];
    for (let r = 0; r < totalRotations; r++) {
      const varName = builtModel.benchVarNames[i][r];
      const col = cols[varName];
      if (col && 'Primal' in col && (col as { Primal: number }).Primal > 0.5) {
        pattern.push(r);
      }
    }
    benchSets.push(pattern);
  }

  return benchSets;
}

/** Typed i18n keys for solver progress messages emitted from the web worker. */
export type SolverMessageKey =
  | 'game:solver.initializing'
  | 'game:solver.calculating_goalie'
  | 'game:solver.generating_patterns'
  | 'game:solver.building_schedule'
  | 'game:solver.checking_optimizations'
  | 'game:solver.complete';

/** A progress message with an optional interpolation count for "searching N combinations". */
export type SolverProgressMessage =
  | { key: SolverMessageKey }
  | { key: 'game:solver.searching'; count: string };

const SOLVER_MESSAGE_KEYS = new Set<string>([
  'game:solver.initializing',
  'game:solver.calculating_goalie',
  'game:solver.generating_patterns',
  'game:solver.building_schedule',
  'game:solver.checking_optimizations',
  'game:solver.complete',
  'game:solver.searching',
]);

export function isSolverMessageKey(s: string): boolean {
  return SOLVER_MESSAGE_KEYS.has(s);
}

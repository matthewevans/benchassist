import { getTotalRotationsFromDivisions } from '@/utils/rotationLayout.ts';

export interface OptimizationOption {
  periodDivisions: number[];
  totalRotations: number;
  addedRotations: number;
  periodsChanged: number;
  expectedGap: number;
  expectedMaxPercent: number;
  expectedMinPercent: number;
  expectedExtraCount: number;
  gapImprovement: number;
}

export interface OptimizationSuggestion {
  currentGap: number;
  currentMaxPercent: number;
  currentMinPercent: number;
  currentExtraCount: number;
  currentTotalRotations: number;
  options: OptimizationOption[];
}

export interface DivisionEvaluation {
  maxPlayPercent: number;
  minPlayPercent: number;
  gap: number;
  extraPlayerCount: number;
}

interface LegacyOptimizationSuggestion {
  suggestedDivisions: number[];
  currentGap: number;
  currentMaxPercent: number;
  suggestedGap: number;
  currentExtraCount: number;
  suggestedExtraCount: number;
  suggestedMaxPercent: number;
  suggestedMinPercent: number;
}

function normalizeDivisionCount(value: unknown): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(Number(value)));
}

function sanitizePeriodDivisions(divisions: unknown): number[] {
  if (!Array.isArray(divisions)) return [];
  return divisions.map((value) => normalizeDivisionCount(value));
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sortOptimizationOptions(options: OptimizationOption[]): OptimizationOption[] {
  return [...options].sort((a, b) => {
    if (a.addedRotations !== b.addedRotations) return a.addedRotations - b.addedRotations;
    if (a.periodsChanged !== b.periodsChanged) return a.periodsChanged - b.periodsChanged;
    if (a.totalRotations !== b.totalRotations) return a.totalRotations - b.totalRotations;
    if (a.expectedGap !== b.expectedGap) return a.expectedGap - b.expectedGap;
    if (a.expectedMaxPercent !== b.expectedMaxPercent) {
      return a.expectedMaxPercent - b.expectedMaxPercent;
    }
    return getOptimizationOptionKey(a.periodDivisions).localeCompare(
      getOptimizationOptionKey(b.periodDivisions),
    );
  });
}

export function getOptimizationOptionKey(periodDivisions: number[]): string {
  return periodDivisions.map((value) => normalizeDivisionCount(value)).join('-');
}

function countPeriodsChanged(candidate: number[], currentDivisions: number[]): number {
  const safeLength = Math.max(candidate.length, currentDivisions.length);
  let changed = 0;
  for (let i = 0; i < safeLength; i++) {
    const current = normalizeDivisionCount(currentDivisions[i]);
    const next = normalizeDivisionCount(candidate[i]);
    if (current !== next) changed++;
  }
  return changed;
}

/**
 * Backward compatibility for saved game snapshots that may still contain the
 * legacy single-option suggestion payload.
 */
export function normalizeOptimizationSuggestion(
  raw: unknown,
  currentDivisions?: number[],
): OptimizationSuggestion | null {
  if (!raw || typeof raw !== 'object') return null;

  const value = raw as Partial<OptimizationSuggestion> &
    Partial<LegacyOptimizationSuggestion> & {
      options?: unknown;
      currentMinPercent?: unknown;
    };

  const safeCurrentDivisions = sanitizePeriodDivisions(currentDivisions);
  const currentGap = toFiniteNumber(value.currentGap);
  const currentMaxPercent = toFiniteNumber(value.currentMaxPercent);
  const currentMinPercent =
    value.currentMinPercent != null
      ? toFiniteNumber(value.currentMinPercent)
      : currentMaxPercent - currentGap;
  const currentExtraCount = Math.max(0, Math.floor(toFiniteNumber(value.currentExtraCount)));
  const explicitCurrentTotalRotations = Number(
    (value as Partial<OptimizationSuggestion>).currentTotalRotations,
  );

  if (Array.isArray(value.options)) {
    const normalizedOptions = value.options
      .map((option) => {
        if (!option || typeof option !== 'object') return null;
        const candidate = option as Partial<OptimizationOption> & { periodDivisions?: unknown };
        const periodDivisions = sanitizePeriodDivisions(candidate.periodDivisions);
        if (periodDivisions.length === 0) return null;
        const expectedGap = toFiniteNumber(candidate.expectedGap);
        const parsedTotalRotations = Number(candidate.totalRotations);
        const totalRotations = Number.isFinite(parsedTotalRotations)
          ? Math.max(1, Math.floor(parsedTotalRotations))
          : getTotalRotationsFromDivisions(periodDivisions);
        const fallbackCurrentTotalRotations = safeCurrentDivisions.length
          ? getTotalRotationsFromDivisions(safeCurrentDivisions)
          : Math.max(1, totalRotations - 1);
        return {
          periodDivisions,
          totalRotations,
          addedRotations:
            candidate.addedRotations != null
              ? Math.max(0, Math.floor(toFiniteNumber(candidate.addedRotations)))
              : Math.max(
                  0,
                  totalRotations -
                    (Number.isFinite(explicitCurrentTotalRotations)
                      ? Math.max(1, Math.floor(explicitCurrentTotalRotations))
                      : fallbackCurrentTotalRotations),
                ),
          periodsChanged:
            candidate.periodsChanged != null
              ? Math.max(0, Math.floor(toFiniteNumber(candidate.periodsChanged)))
              : safeCurrentDivisions.length
                ? countPeriodsChanged(periodDivisions, safeCurrentDivisions)
                : periodDivisions.filter((value) => value !== 1).length,
          expectedGap,
          expectedMaxPercent: toFiniteNumber(candidate.expectedMaxPercent),
          expectedMinPercent: toFiniteNumber(candidate.expectedMinPercent),
          expectedExtraCount: Math.max(0, Math.floor(toFiniteNumber(candidate.expectedExtraCount))),
          gapImprovement:
            candidate.gapImprovement != null
              ? toFiniteNumber(candidate.gapImprovement)
              : Math.round((currentGap - expectedGap) * 10) / 10,
        } satisfies OptimizationOption;
      })
      .filter((option): option is OptimizationOption => option != null);

    if (normalizedOptions.length === 0) return null;

    const inferredCurrentTotalRotations = Number.isFinite(explicitCurrentTotalRotations)
      ? Math.max(1, Math.floor(explicitCurrentTotalRotations))
      : safeCurrentDivisions.length
        ? getTotalRotationsFromDivisions(safeCurrentDivisions)
        : Math.max(1, normalizedOptions[0].totalRotations - normalizedOptions[0].addedRotations);

    return {
      currentGap,
      currentMaxPercent,
      currentMinPercent,
      currentExtraCount,
      currentTotalRotations: inferredCurrentTotalRotations,
      options: sortOptimizationOptions(normalizedOptions),
    };
  }

  const legacy = value as Partial<LegacyOptimizationSuggestion>;
  const legacyDivisions = sanitizePeriodDivisions(legacy.suggestedDivisions);
  if (legacyDivisions.length === 0) return null;

  const expectedGap = toFiniteNumber(legacy.suggestedGap);
  const totalRotations = getTotalRotationsFromDivisions(legacyDivisions);
  const currentTotalRotations = Number.isFinite(explicitCurrentTotalRotations)
    ? Math.max(1, Math.floor(explicitCurrentTotalRotations))
    : safeCurrentDivisions.length
      ? getTotalRotationsFromDivisions(safeCurrentDivisions)
      : Math.max(1, totalRotations - 1);

  return {
    currentGap,
    currentMaxPercent,
    currentMinPercent,
    currentExtraCount,
    currentTotalRotations,
    options: [
      {
        periodDivisions: legacyDivisions,
        totalRotations,
        addedRotations: Math.max(0, totalRotations - currentTotalRotations),
        periodsChanged: safeCurrentDivisions.length
          ? countPeriodsChanged(legacyDivisions, safeCurrentDivisions)
          : legacyDivisions.filter((value) => value !== 1).length,
        expectedGap,
        expectedMaxPercent: toFiniteNumber(legacy.suggestedMaxPercent),
        expectedMinPercent: toFiniteNumber(legacy.suggestedMinPercent),
        expectedExtraCount: Math.max(0, Math.floor(toFiniteNumber(legacy.suggestedExtraCount))),
        gapImprovement: Math.round((currentGap - expectedGap) * 10) / 10,
      },
    ],
  };
}

/**
 * Generates all balanced division candidates.
 * "Balanced" means max diff of 1 between any two periods' division counts.
 * Locked periods are fixed at their current value.
 */
export function generateBalancedDivisionCandidates(
  periods: number,
  currentDivisions: number[],
  maxPerPeriod = 2,
  lockedPeriods?: Set<number>,
): number[][] {
  if (!Number.isFinite(periods) || periods <= 0) return [];

  const safePeriods = Math.floor(periods);
  const safeMaxPerPeriod = Math.max(1, Math.floor(maxPerPeriod) || 1);
  const locked = lockedPeriods ?? new Set<number>();
  const base = Array.from({ length: safePeriods }, (_, index) =>
    normalizeDivisionCount(currentDivisions[index]),
  );

  const working = [...base];
  const candidates: number[][] = [];

  function build(index: number) {
    if (index >= safePeriods) {
      let minValue = Infinity;
      let maxValue = -Infinity;
      let hasChange = false;
      for (let i = 0; i < safePeriods; i++) {
        const value = working[i];
        if (value < minValue) minValue = value;
        if (value > maxValue) maxValue = value;
        if (value !== base[i]) hasChange = true;
      }
      if (!hasChange || maxValue - minValue > 1) return;
      candidates.push([...working]);
      return;
    }

    const current = base[index];
    if (locked.has(index)) {
      working[index] = current;
      build(index + 1);
      return;
    }

    const maxValue = Math.max(current, safeMaxPerPeriod);
    for (let value = current; value <= maxValue; value++) {
      working[index] = value;
      build(index + 1);
    }
  }

  build(0);

  return candidates.sort((a, b) => {
    const totalA = getTotalRotationsFromDivisions(a);
    const totalB = getTotalRotationsFromDivisions(b);
    if (totalA !== totalB) return totalA - totalB;
    return getOptimizationOptionKey(a).localeCompare(getOptimizationOptionKey(b));
  });
}

/**
 * Evaluates the theoretical play percentage distribution for a division config.
 * Uses count-based estimation: playPercent = (1 - benchCount / totalRotations) * 100.
 */
export function evaluateDivisionCandidate(
  candidate: number[],
  playerCount: number,
  fieldSize: number,
): DivisionEvaluation {
  const benchSlotsPerRotation = playerCount - fieldSize;
  if (benchSlotsPerRotation <= 0) {
    return { maxPlayPercent: 100, minPlayPercent: 100, gap: 0, extraPlayerCount: 0 };
  }

  const totalRotations = getTotalRotationsFromDivisions(candidate);
  const totalBenchSlots = totalRotations * benchSlotsPerRotation;

  const perPlayer = Math.floor(totalBenchSlots / playerCount);
  const remainder = totalBenchSlots % playerCount;

  const minBenchCount = perPlayer;
  const maxBenchCount = perPlayer + (remainder > 0 ? 1 : 0);

  const maxPlayPercent = Math.round((1 - minBenchCount / totalRotations) * 1000) / 10;
  const minPlayPercent = Math.round((1 - maxBenchCount / totalRotations) * 1000) / 10;

  return {
    maxPlayPercent,
    minPlayPercent,
    gap: Math.round((maxPlayPercent - minPlayPercent) * 10) / 10,
    extraPlayerCount: remainder > 0 ? playerCount - remainder : 0,
  };
}

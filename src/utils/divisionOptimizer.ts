export interface OptimizationSuggestion {
  suggestedDivisions: number[];
  currentGap: number;
  currentMaxPercent: number;
  suggestedGap: number;
  currentExtraCount: number;
  suggestedExtraCount: number;
  suggestedMaxPercent: number;
  suggestedMinPercent: number;
}

export interface DivisionEvaluation {
  maxPlayPercent: number;
  minPlayPercent: number;
  gap: number;
  extraPlayerCount: number;
}

/**
 * Generates balanced division candidates by incrementing one period at a time.
 * "Balanced" means max diff of 1 between any two periods' division counts.
 * Returns candidates in ascending order of total rotations.
 */
export function generateBalancedDivisionCandidates(
  periods: number,
  currentDivisions: number[],
  maxPerPeriod = 2,
  lockedPeriods?: Set<number>,
): number[][] {
  const locked = lockedPeriods ?? new Set<number>();
  const candidates: number[][] = [];
  const current = currentDivisions.slice(0, periods);

  // Pad if shorter than periods
  while (current.length < periods) {
    current.push(1);
  }

  const working = [...current];

  for (;;) {
    // Find minimum value among unlocked periods
    let minValue = Infinity;
    for (let i = 0; i < periods; i++) {
      if (!locked.has(i) && working[i] < minValue) {
        minValue = working[i];
      }
    }

    if (!Number.isFinite(minValue) || minValue >= maxPerPeriod) break;

    // Increment the first unlocked period at the minimum value
    let incremented = false;
    for (let i = 0; i < periods; i++) {
      if (!locked.has(i) && working[i] === minValue) {
        working[i] = minValue + 1;
        incremented = true;
        break;
      }
    }

    if (!incremented) break;

    // Check balanced constraint: max diff ≤ 1 across ALL periods
    const maxVal = Math.max(...working);
    const minVal = Math.min(...working);
    if (maxVal - minVal > 1) break;

    candidates.push([...working]);
  }

  return candidates;
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

  const totalRotations = candidate.reduce((sum, d) => sum + Math.max(1, d), 0);
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

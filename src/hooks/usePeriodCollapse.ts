import { useState, useMemo, useCallback } from 'react';

interface UsePeriodCollapseParams {
  currentPeriodIndex: number;
  isLive: boolean;
  totalPeriods: number;
}

export function usePeriodCollapse({
  currentPeriodIndex,
  isLive,
  totalPeriods,
}: UsePeriodCollapseParams) {
  // Toggles are keyed to a specific period so stale overrides from a previous period
  // are automatically discarded when currentPeriodIndex changes — no effect needed.
  const [toggleState, setToggleState] = useState<{ forPeriod: number; toggles: Set<number> }>({
    forPeriod: currentPeriodIndex,
    toggles: new Set(),
  });

  // Derive collapsed periods: auto-collapse elapsed periods in live mode, XOR with user toggles
  // (only when those toggles were recorded for the current period).
  const collapsedPeriods = useMemo(() => {
    const result = new Set<number>();
    if (isLive) {
      for (let i = 0; i < totalPeriods; i++) {
        if (i < currentPeriodIndex) result.add(i);
      }
    }
    if (toggleState.forPeriod === currentPeriodIndex) {
      for (const p of toggleState.toggles) {
        if (result.has(p)) result.delete(p);
        else result.add(p);
      }
    }
    return result;
  }, [isLive, currentPeriodIndex, totalPeriods, toggleState]);

  const togglePeriod = useCallback(
    (periodIndex: number) => {
      setToggleState((prev) => {
        // If the period has changed since last toggle, start fresh (discard stale overrides)
        const base = prev.forPeriod === currentPeriodIndex ? prev.toggles : new Set<number>();
        const next = new Set(base);
        if (next.has(periodIndex)) next.delete(periodIndex);
        else next.add(periodIndex);
        return { forPeriod: currentPeriodIndex, toggles: next };
      });
    },
    [currentPeriodIndex],
  );

  return { collapsedPeriods, togglePeriod };
}

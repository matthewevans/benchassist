import { useState, useMemo, useCallback } from 'react';

interface UsePeriodCollapseParams {
  currentPeriodIndex: number;
  isLive: boolean;
}

export function usePeriodCollapse({ currentPeriodIndex, isLive }: UsePeriodCollapseParams) {
  const [userToggles, setUserToggles] = useState<Set<number>>(new Set());

  // Derive collapsed periods: auto-collapse past periods in live mode, XOR with user toggles
  const collapsedPeriods = useMemo(() => {
    const result = new Set<number>();
    if (isLive) {
      for (let i = 0; i < currentPeriodIndex; i++) {
        result.add(i);
      }
    }
    for (const p of userToggles) {
      if (result.has(p)) {
        result.delete(p);
      } else {
        result.add(p);
      }
    }
    return result;
  }, [isLive, currentPeriodIndex, userToggles]);

  const togglePeriod = useCallback((periodIndex: number) => {
    setUserToggles((prev) => {
      const next = new Set(prev);
      if (next.has(periodIndex)) next.delete(periodIndex);
      else next.add(periodIndex);
      return next;
    });
  }, []);

  return { collapsedPeriods, togglePeriod };
}

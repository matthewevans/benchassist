import { useState, useEffect, useCallback } from 'react';

interface UsePeriodCollapseParams {
  totalPeriods: number;
  currentPeriodIndex: number;
  isLive: boolean;
}

export function usePeriodCollapse({ currentPeriodIndex, isLive }: UsePeriodCollapseParams) {
  const [collapsedPeriods, setCollapsedPeriods] = useState<Set<number>>(new Set());

  // Auto-collapse all periods before the current one whenever period advances
  useEffect(() => {
    if (!isLive || currentPeriodIndex === 0) return;
    setCollapsedPeriods((prev) => {
      const next = new Set(prev);
      for (let i = 0; i < currentPeriodIndex; i++) {
        next.add(i);
      }
      return next;
    });
  }, [currentPeriodIndex, isLive]);

  const togglePeriod = useCallback((periodIndex: number) => {
    setCollapsedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(periodIndex)) {
        next.delete(periodIndex);
      } else {
        next.add(periodIndex);
      }
      return next;
    });
  }, []);

  return { collapsedPeriods, togglePeriod };
}

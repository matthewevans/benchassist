import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePeriodCollapseParams {
  totalPeriods: number;
  currentPeriodIndex: number;
  isLive: boolean;
}

export function usePeriodCollapse({ currentPeriodIndex, isLive }: UsePeriodCollapseParams) {
  const [collapsedPeriods, setCollapsedPeriods] = useState<Set<number>>(() => {
    if (!isLive) return new Set();
    const initial = new Set<number>();
    for (let i = 0; i < currentPeriodIndex; i++) {
      initial.add(i);
    }
    return initial;
  });

  const prevPeriodRef = useRef(currentPeriodIndex);

  useEffect(() => {
    if (!isLive) return;
    if (prevPeriodRef.current !== currentPeriodIndex && currentPeriodIndex > prevPeriodRef.current) {
      setCollapsedPeriods((prev) => {
        const next = new Set(prev);
        for (let i = prevPeriodRef.current; i < currentPeriodIndex; i++) {
          next.add(i);
        }
        return next;
      });
    }
    prevPeriodRef.current = currentPeriodIndex;
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

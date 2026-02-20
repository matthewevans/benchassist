import { renderHook, act } from '@testing-library/react';
import { usePeriodCollapse } from './usePeriodCollapse.ts';

describe('usePeriodCollapse', () => {
  it('starts with no periods collapsed in setup mode', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ currentPeriodIndex: 0, isLive: false, totalPeriods: 3 }),
    );
    expect(result.current.collapsedPeriods.size).toBe(0);
  });

  it('auto-collapses elapsed periods on initial load in live mode', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ currentPeriodIndex: 2, isLive: true, totalPeriods: 4 }),
    );
    expect(result.current.collapsedPeriods.has(0)).toBe(true);
    expect(result.current.collapsedPeriods.has(1)).toBe(true);
    expect(result.current.collapsedPeriods.has(2)).toBe(false);
    expect(result.current.collapsedPeriods.has(3)).toBe(true);
  });

  it('auto-collapses past and future periods when current period advances', () => {
    const { result, rerender } = renderHook(
      ({ currentPeriodIndex }) =>
        usePeriodCollapse({ currentPeriodIndex, isLive: true, totalPeriods: 3 }),
      { initialProps: { currentPeriodIndex: 0 } },
    );
    // Period 0 is current, periods 1 and 2 are future — all non-current collapsed
    expect(result.current.collapsedPeriods.has(0)).toBe(false);
    expect(result.current.collapsedPeriods.has(1)).toBe(true);
    expect(result.current.collapsedPeriods.has(2)).toBe(true);

    rerender({ currentPeriodIndex: 1 });
    expect(result.current.collapsedPeriods.has(0)).toBe(true);
    expect(result.current.collapsedPeriods.has(1)).toBe(false);
    expect(result.current.collapsedPeriods.has(2)).toBe(true);
  });

  it('toggles a period collapsed state', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ currentPeriodIndex: 2, isLive: true, totalPeriods: 4 }),
    );
    // Period 0 is auto-collapsed; toggle it open
    act(() => result.current.togglePeriod(0));
    expect(result.current.collapsedPeriods.has(0)).toBe(false);

    // Toggle it closed again
    act(() => result.current.togglePeriod(0));
    expect(result.current.collapsedPeriods.has(0)).toBe(true);
  });

  it('never auto-collapses the current period', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ currentPeriodIndex: 1, isLive: true, totalPeriods: 3 }),
    );
    expect(result.current.collapsedPeriods.has(1)).toBe(false);
  });

  it('allows manually collapsing the current period', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ currentPeriodIndex: 1, isLive: true, totalPeriods: 3 }),
    );
    // Period 1 is current — not auto-collapsed
    expect(result.current.collapsedPeriods.has(1)).toBe(false);

    // Manually collapse the current period
    act(() => result.current.togglePeriod(1));
    expect(result.current.collapsedPeriods.has(1)).toBe(true);
  });

  it('resets user toggles on period advance so the new current period is never stuck collapsed', () => {
    const { result, rerender } = renderHook(
      ({ currentPeriodIndex }) =>
        usePeriodCollapse({ currentPeriodIndex, isLive: true, totalPeriods: 3 }),
      { initialProps: { currentPeriodIndex: 0 } },
    );

    // User peeks at period 1 (manually expands a non-current period)
    act(() => result.current.togglePeriod(1));
    expect(result.current.collapsedPeriods.has(1)).toBe(false);

    // User clicks Next — advances to period 1
    rerender({ currentPeriodIndex: 1 });

    // Period 1 must be expanded (it's now current), not stuck collapsed due to stale toggle
    expect(result.current.collapsedPeriods.has(1)).toBe(false);
    expect(result.current.collapsedPeriods.has(0)).toBe(true);
  });

  it('does not auto-collapse when not live', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ currentPeriodIndex: 3, isLive: false, totalPeriods: 4 }),
    );
    expect(result.current.collapsedPeriods.size).toBe(0);
  });
});

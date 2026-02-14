import { renderHook, act } from '@testing-library/react';
import { usePeriodCollapse } from './usePeriodCollapse.ts';

describe('usePeriodCollapse', () => {
  it('starts with no periods collapsed in setup mode', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ currentPeriodIndex: 0, isLive: false }),
    );
    expect(result.current.collapsedPeriods.size).toBe(0);
  });

  it('auto-collapses elapsed periods on initial load in live mode', () => {
    const { result } = renderHook(() => usePeriodCollapse({ currentPeriodIndex: 2, isLive: true }));
    expect(result.current.collapsedPeriods.has(0)).toBe(true);
    expect(result.current.collapsedPeriods.has(1)).toBe(true);
    expect(result.current.collapsedPeriods.has(2)).toBe(false);
  });

  it('auto-collapses previous period when current period advances', () => {
    const { result, rerender } = renderHook(
      ({ currentPeriodIndex }) => usePeriodCollapse({ currentPeriodIndex, isLive: true }),
      { initialProps: { currentPeriodIndex: 0 } },
    );
    expect(result.current.collapsedPeriods.size).toBe(0);

    rerender({ currentPeriodIndex: 1 });
    expect(result.current.collapsedPeriods.has(0)).toBe(true);
    expect(result.current.collapsedPeriods.has(1)).toBe(false);
  });

  it('toggles a period collapsed state', () => {
    const { result } = renderHook(() => usePeriodCollapse({ currentPeriodIndex: 2, isLive: true }));
    // Period 0 is auto-collapsed; toggle it open
    act(() => result.current.togglePeriod(0));
    expect(result.current.collapsedPeriods.has(0)).toBe(false);

    // Toggle it closed again
    act(() => result.current.togglePeriod(0));
    expect(result.current.collapsedPeriods.has(0)).toBe(true);
  });

  it('never auto-collapses the current period', () => {
    const { result } = renderHook(() => usePeriodCollapse({ currentPeriodIndex: 1, isLive: true }));
    expect(result.current.collapsedPeriods.has(1)).toBe(false);
  });

  it('allows manually collapsing a non-auto period', () => {
    const { result } = renderHook(() => usePeriodCollapse({ currentPeriodIndex: 0, isLive: true }));
    // No auto-collapsed periods at index 0
    expect(result.current.collapsedPeriods.size).toBe(0);

    // Manually collapse period 0
    act(() => result.current.togglePeriod(0));
    expect(result.current.collapsedPeriods.has(0)).toBe(true);
  });

  it('does not auto-collapse when not live', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ currentPeriodIndex: 3, isLive: false }),
    );
    expect(result.current.collapsedPeriods.size).toBe(0);
  });
});

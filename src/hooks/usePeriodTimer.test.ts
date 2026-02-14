import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePeriodTimer } from './usePeriodTimer.ts';
import { gameFactory, gameConfigFactory } from '@/test/factories.ts';
import { resetFactories } from '@/test/factories.ts';
import type { Rotation } from '@/types/domain.ts';

function buildRotation(index: number, periodIndex: number): Rotation {
  return { index, periodIndex, assignments: {}, teamStrength: 0, violations: [] };
}

describe('usePeriodTimer', () => {
  const dispatch = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    resetFactories();
    dispatch.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with elapsed 0 when no timer state', () => {
    const game = gameFactory.build();
    const config = gameConfigFactory.build({ periodDurationMinutes: 25, rotationsPerPeriod: 2 });
    const rotation = buildRotation(0, 0);

    const { result } = renderHook(() => usePeriodTimer(game, config, rotation, dispatch));

    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.formattedElapsed).toBe('0:00');
    expect(result.current.formattedDuration).toBe('25:00');
    expect(result.current.progress).toBe(0);
    expect(result.current.isOvertime).toBe(false);
  });

  it('calculates correct markers for rotationsPerPeriod', () => {
    const game = gameFactory.build();
    const config = gameConfigFactory.build({ periodDurationMinutes: 30, rotationsPerPeriod: 3 });
    const rotation = buildRotation(0, 0);

    const { result } = renderHook(() => usePeriodTimer(game, config, rotation, dispatch));

    // 3 rotations per period → 2 markers at 1/3 and 2/3
    expect(result.current.markers).toHaveLength(2);
    expect(result.current.markers[0].progress).toBeCloseTo(1 / 3);
    expect(result.current.markers[1].progress).toBeCloseTo(2 / 3);
    expect(result.current.markers[0].timeMs).toBe(10 * 60 * 1000); // 10 min
    expect(result.current.markers[1].timeMs).toBe(20 * 60 * 1000); // 20 min
  });

  it('has no markers when rotationsPerPeriod is 1', () => {
    const game = gameFactory.build();
    const config = gameConfigFactory.build({ rotationsPerPeriod: 1 });
    const rotation = buildRotation(0, 0);

    const { result } = renderHook(() => usePeriodTimer(game, config, rotation, dispatch));

    expect(result.current.markers).toHaveLength(0);
  });

  it('dispatches START_PERIOD_TIMER on play', () => {
    const game = gameFactory.build();
    const config = gameConfigFactory.build();
    const rotation = buildRotation(0, 0);

    const { result } = renderHook(() => usePeriodTimer(game, config, rotation, dispatch));

    act(() => result.current.play());

    expect(dispatch).toHaveBeenCalledWith({
      type: 'START_PERIOD_TIMER',
      payload: { gameId: game.id, startedAt: expect.any(Number) },
    });
  });

  it('dispatches PAUSE_PERIOD_TIMER on pause with accumulated elapsed', () => {
    const now = Date.now();
    const game = gameFactory.build({
      periodTimerStartedAt: now - 5000, // started 5 seconds ago
      periodTimerPausedElapsed: 3000, // had 3 seconds from a prior run
    });
    const config = gameConfigFactory.build();
    const rotation = buildRotation(0, 0);

    const { result } = renderHook(() => usePeriodTimer(game, config, rotation, dispatch));

    act(() => result.current.pause());

    expect(dispatch).toHaveBeenCalledWith({
      type: 'PAUSE_PERIOD_TIMER',
      payload: {
        gameId: game.id,
        // Should be ~8000ms (3000 paused + 5000 running)
        pausedElapsed: expect.any(Number),
      },
    });
    const pausedElapsed = (dispatch.mock.calls[0][0] as { payload: { pausedElapsed: number } }).payload.pausedElapsed;
    expect(pausedElapsed).toBeGreaterThanOrEqual(7900);
    expect(pausedElapsed).toBeLessThanOrEqual(8200);
  });

  it('dispatches RESET_PERIOD_TIMER on reset', () => {
    const game = gameFactory.build({ periodTimerPausedElapsed: 5000 });
    const config = gameConfigFactory.build();
    const rotation = buildRotation(0, 0);

    const { result } = renderHook(() => usePeriodTimer(game, config, rotation, dispatch));

    act(() => result.current.reset());

    expect(dispatch).toHaveBeenCalledWith({
      type: 'RESET_PERIOD_TIMER',
      payload: { gameId: game.id },
    });
  });

  it('ticks elapsed when running', () => {
    const now = Date.now();
    const game = gameFactory.build({
      periodTimerStartedAt: now,
      periodTimerPausedElapsed: 0,
    });
    const config = gameConfigFactory.build({ periodDurationMinutes: 25 });
    const rotation = buildRotation(0, 0);

    const { result } = renderHook(() => usePeriodTimer(game, config, rotation, dispatch));

    expect(result.current.isRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedMs).toBeGreaterThanOrEqual(2900);
    expect(result.current.elapsedMs).toBeLessThanOrEqual(3200);
  });

  it('shows overtime when elapsed exceeds period duration', () => {
    const periodMs = 25 * 60 * 1000;
    const game = gameFactory.build({
      periodTimerStartedAt: null,
      periodTimerPausedElapsed: periodMs + 5000, // 5 seconds over
    });
    const config = gameConfigFactory.build({ periodDurationMinutes: 25 });
    const rotation = buildRotation(0, 0);

    const { result } = renderHook(() => usePeriodTimer(game, config, rotation, dispatch));

    expect(result.current.isOvertime).toBe(true);
    expect(result.current.progress).toBe(1); // capped at 1
  });

  it('formats time correctly', () => {
    const game = gameFactory.build({
      periodTimerStartedAt: null,
      periodTimerPausedElapsed: (12 * 60 + 34) * 1000, // 12:34
    });
    const config = gameConfigFactory.build({ periodDurationMinutes: 25 });
    const rotation = buildRotation(0, 0);

    const { result } = renderHook(() => usePeriodTimer(game, config, rotation, dispatch));

    expect(result.current.formattedElapsed).toBe('12:34');
  });

  it('calculates progress correctly', () => {
    const periodMs = 30 * 60 * 1000;
    const halfMs = periodMs / 2;
    const game = gameFactory.build({
      periodTimerStartedAt: null,
      periodTimerPausedElapsed: halfMs,
    });
    const config = gameConfigFactory.build({ periodDurationMinutes: 30 });
    const rotation = buildRotation(0, 0);

    const { result } = renderHook(() => usePeriodTimer(game, config, rotation, dispatch));

    expect(result.current.progress).toBeCloseTo(0.5);
  });
});

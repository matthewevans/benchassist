import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Game, GameConfig, Rotation } from '@/types/domain.ts';
import type { AppAction } from '@/context/AppContext.tsx';

export interface SubstitutionMarker {
  /** Progress ratio [0-1] within the period */
  progress: number;
  /** Absolute time in ms from period start */
  timeMs: number;
}

export interface UsePeriodTimerResult {
  /** Elapsed milliseconds in the current period */
  elapsedMs: number;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Formatted elapsed time (M:SS or MM:SS) */
  formattedElapsed: string;
  /** Formatted period duration */
  formattedDuration: string;
  /** Progress ratio [0-1] for current period */
  progress: number;
  /** Substitution markers (positions 0-1) */
  markers: SubstitutionMarker[];
  /** Current period index (0-based) */
  periodIndex: number;
  /** Whether timer has exceeded the period duration */
  isOvertime: boolean;
  /** Start or resume the timer */
  play: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Reset the timer to 0:00 */
  reset: () => void;
}

export function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

let audioCtx: AudioContext | null = null;

function playAlertSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch {
    // Audio not available — silent fallback
  }
}

export function usePeriodTimer(
  game: Game | undefined,
  config: GameConfig | undefined,
  currentRotation: Rotation | undefined,
  dispatch: React.Dispatch<AppAction>,
): UsePeriodTimerResult {
  const gameId = game?.id ?? '';
  const periodDurationMs = (config?.periodDurationMinutes ?? 0) * 60 * 1000;
  const periodIndex = currentRotation?.periodIndex ?? 0;
  const rotationsPerPeriod = config?.rotationsPerPeriod ?? 1;

  // Which rotation within this period (0-based)
  const withinPeriodIndex = (currentRotation?.index ?? 0) - periodIndex * rotationsPerPeriod;

  // Calculate current elapsed from persisted state
  function getElapsedMs(): number {
    if (!game) return 0;
    if (game.periodTimerStartedAt != null) {
      return game.periodTimerPausedElapsed + (Date.now() - game.periodTimerStartedAt);
    }
    return game.periodTimerPausedElapsed;
  }

  const [elapsedMs, setElapsedMs] = useState(getElapsedMs);
  const isRunning = game?.periodTimerStartedAt != null;

  // Track which markers we've already alerted for
  const alertedMarkersRef = useRef<Set<number>>(new Set());

  // Reset alerted markers when period changes
  const prevPeriodRef = useRef(periodIndex);
  useEffect(() => {
    if (prevPeriodRef.current !== periodIndex) {
      alertedMarkersRef.current.clear();
      prevPeriodRef.current = periodIndex;
    }
  }, [periodIndex]);

  // Sync elapsed when timer is externally reset (e.g., period boundary advance)
  useEffect(() => {
    if (!isRunning) {
      setElapsedMs(game?.periodTimerPausedElapsed ?? 0);
    }
  }, [isRunning, game?.periodTimerPausedElapsed]);

  // Tick the timer
  useEffect(() => {
    if (!isRunning) return;
    // Immediately sync on mount/resume
    setElapsedMs(getElapsedMs());
    const interval = setInterval(() => {
      setElapsedMs(getElapsedMs());
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, game?.periodTimerStartedAt, game?.periodTimerPausedElapsed]);

  // Substitution markers: R-1 markers for R rotations per period
  const markers: SubstitutionMarker[] = useMemo(() => {
    const result: SubstitutionMarker[] = [];
    for (let i = 0; i < rotationsPerPeriod - 1; i++) {
      const progress = (i + 1) / rotationsPerPeriod;
      result.push({
        progress,
        timeMs: progress * periodDurationMs,
      });
    }
    return result;
  }, [rotationsPerPeriod, periodDurationMs]);

  // Alert when crossing a substitution marker
  useEffect(() => {
    if (!isRunning) return;
    for (let i = 0; i < markers.length; i++) {
      // Only alert for markers the coach hasn't already advanced past
      if (i < withinPeriodIndex) continue;
      if (alertedMarkersRef.current.has(i)) continue;
      if (elapsedMs >= markers[i].timeMs) {
        alertedMarkersRef.current.add(i);
        playAlertSound();
      }
    }
  }, [elapsedMs, markers, isRunning, withinPeriodIndex]);

  const play = useCallback(() => {
    dispatch({
      type: 'START_PERIOD_TIMER',
      payload: { gameId, startedAt: Date.now() },
    });
  }, [dispatch, gameId]);

  const pause = useCallback(() => {
    const current = getElapsedMs();
    dispatch({
      type: 'PAUSE_PERIOD_TIMER',
      payload: { gameId, pausedElapsed: current },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, gameId, game?.periodTimerStartedAt, game?.periodTimerPausedElapsed]);

  const reset = useCallback(() => {
    alertedMarkersRef.current.clear();
    dispatch({
      type: 'RESET_PERIOD_TIMER',
      payload: { gameId },
    });
    setElapsedMs(0);
  }, [dispatch, gameId]);

  const progress = Math.min(elapsedMs / periodDurationMs, 1);
  const isOvertime = elapsedMs > periodDurationMs;

  return {
    elapsedMs,
    isRunning,
    formattedElapsed: formatTime(elapsedMs),
    formattedDuration: formatTime(periodDurationMs),
    progress,
    markers,
    periodIndex,
    isOvertime,
    play,
    pause,
    reset,
  };
}

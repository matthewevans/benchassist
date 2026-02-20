import { useEffect, useRef, useState } from 'react';

const MAX_PULL_DISTANCE = 110;
const ACTIVATION_DISTANCE = 72;
const MAX_START_Y = 120;

type PullState = 'idle' | 'pulling' | 'release' | 'checking';

type UsePullToCheckUpdateOptions = {
  onCheckForUpdate: () => Promise<void> | void;
  disabled?: boolean;
};

function getScrollableAncestor(element: Element | null): HTMLElement | null {
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);
    const hasScrollableOverflow = /(auto|scroll)/.test(style.overflowY);
    const canScroll = current.scrollHeight > current.clientHeight;

    if (hasScrollableOverflow && canScroll) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function canStartPullGesture(target: EventTarget | null, touchY: number) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (touchY > MAX_START_Y) {
    return false;
  }

  const scrollableAncestor = getScrollableAncestor(target);
  if (scrollableAncestor) {
    return scrollableAncestor.scrollTop <= 0;
  }

  return window.scrollY <= 0;
}

export function usePullToCheckUpdate({ onCheckForUpdate, disabled }: UsePullToCheckUpdateOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [pullState, setPullState] = useState<PullState>('idle');

  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const isPullingRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (disabled) return;

    const clearResetTimer = () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };

    const resetPull = () => {
      setPullDistance(0);
      pullDistanceRef.current = 0;
      setPullState('idle');
      isPullingRef.current = false;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      if (!touch || !canStartPullGesture(event.target, touch.clientY)) {
        return;
      }

      clearResetTimer();
      isPullingRef.current = true;
      startYRef.current = touch.clientY;
      setPullDistance(0);
      pullDistanceRef.current = 0;
      setPullState('pulling');
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!isPullingRef.current || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const delta = touch.clientY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        pullDistanceRef.current = 0;
        setPullState('pulling');
        return;
      }

      const distance = Math.min(delta * 0.5, MAX_PULL_DISTANCE);
      setPullDistance(distance);
      pullDistanceRef.current = distance;
      setPullState(distance >= ACTIVATION_DISTANCE ? 'release' : 'pulling');

      event.preventDefault();
    };

    const onTouchEnd = () => {
      if (!isPullingRef.current) {
        return;
      }

      const shouldTrigger = pullDistanceRef.current >= ACTIVATION_DISTANCE;
      isPullingRef.current = false;

      if (shouldTrigger) {
        setPullState('checking');
        setPullDistance(46);
        pullDistanceRef.current = 46;
        void onCheckForUpdate();
      } else {
        resetPull();
      }

      resetTimerRef.current = window.setTimeout(
        () => {
          resetPull();
        },
        shouldTrigger ? 900 : 200,
      );
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      clearResetTimer();
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [onCheckForUpdate, disabled]);

  return { pullDistance, pullState };
}

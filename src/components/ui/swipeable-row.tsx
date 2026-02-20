import { useRef, useState, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils.ts';

const REVEAL_THRESHOLD = 80;
const ACTION_WIDTH = 80;
const VERTICAL_TOLERANCE = 10;

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
  className?: string;
}

export function SwipeableRow({ children, onDelete, className }: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const trackingRef = useRef(false);
  const ignoringRef = useRef(false);

  const snapBack = useCallback(() => {
    setTransitioning(true);
    setOffset(0);
    setRevealed(false);
  }, []);

  const snapOpen = useCallback(() => {
    setTransitioning(true);
    setOffset(-ACTION_WIDTH);
    setRevealed(true);
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    if (revealed) {
      // If the touch lands on the delete button, let the click event fire naturally.
      // Calling snapBack() here would animate the button away before click registers.
      if ((e.target as Element).closest('[data-slot="action-button"]')) return;
      snapBack();
      return;
    }
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
    trackingRef.current = true;
    ignoringRef.current = false;
    setTransitioning(false);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!trackingRef.current || !startRef.current || ignoringRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startRef.current.x;
    const dy = touch.clientY - startRef.current.y;

    if (Math.abs(dy) > VERTICAL_TOLERANCE && Math.abs(dx) < VERTICAL_TOLERANCE) {
      ignoringRef.current = true;
      trackingRef.current = false;
      setOffset(0);
      return;
    }

    if (dx < 0) {
      setOffset(Math.max(dx, -ACTION_WIDTH * 1.5));
    }
  }

  function handleTouchEnd() {
    trackingRef.current = false;
    if (ignoringRef.current) return;
    if (Math.abs(offset) >= REVEAL_THRESHOLD) {
      snapOpen();
    } else {
      snapBack();
    }
    startRef.current = null;
  }

  return (
    <div
      data-slot="swipeable-row"
      className={cn('relative overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(revealed || offset < 0) && (
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            data-slot="action-button"
            className="h-full bg-destructive text-white text-ios-body font-medium flex items-center justify-center cursor-pointer"
            style={{ width: ACTION_WIDTH }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              snapBack();
            }}
          >
            Delete
          </button>
        </div>
      )}

      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: transitioning ? 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
        }}
        onTransitionEnd={() => setTransitioning(false)}
        className="relative bg-card"
      >
        {children}
      </div>
    </div>
  );
}

import { useEffect, useRef, useCallback } from 'react';
import type { RefObject } from 'react';
import type { UseFieldDrawingResult } from '@/hooks/useFieldDrawing.ts';

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  onRedraw: () => void;
  onBeginStroke: (e: PointerEvent) => void;
  onExtendStroke: (e: PointerEvent) => void;
  onEndStroke: () => void;
}

export function DrawingCanvas({
  canvasRef,
  containerRef,
  onRedraw,
  onBeginStroke,
  onExtendStroke,
  onEndStroke,
}: Props) {
  const sizeRef = useRef({ w: 0, h: 0 });

  // Sync canvas size with the container via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const syncSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = devicePixelRatio;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (sizeRef.current.w !== w || sizeRef.current.h !== h) {
        sizeRef.current = { w, h };
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        onRedraw();
      }
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, canvasRef, onRedraw]);

  // Pointer event handlers
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLCanvasElement;
      target.setPointerCapture(e.pointerId);
      onBeginStroke(e.nativeEvent);
    },
    [onBeginStroke],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      onExtendStroke(e.nativeEvent);
    },
    [onExtendStroke],
  );

  const onPointerUp = useCallback(() => {
    onEndStroke();
  }, [onEndStroke]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}

/** Convenience wrapper that unpacks a UseFieldDrawingResult */
export function FieldDrawingCanvas({
  drawing,
  containerRef,
}: {
  drawing: UseFieldDrawingResult;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <DrawingCanvas
      canvasRef={drawing.canvasRef}
      containerRef={containerRef}
      onRedraw={drawing.redraw}
      onBeginStroke={drawing.beginStroke}
      onExtendStroke={drawing.extendStroke}
      onEndStroke={drawing.endStroke}
    />
  );
}

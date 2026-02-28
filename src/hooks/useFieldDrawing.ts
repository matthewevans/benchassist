import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DrawingTool = 'pen' | 'arrow';

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  points: DrawingPoint[];
  tool: DrawingTool;
}

// ---------------------------------------------------------------------------
// Coordinate conversion helpers
// ---------------------------------------------------------------------------

function screenToSvg(svg: SVGSVGElement, screenX: number, screenY: number): DrawingPoint | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const inv = ctm.inverse();
  return {
    x: inv.a * screenX + inv.c * screenY + inv.e,
    y: inv.b * screenX + inv.d * screenY + inv.f,
  };
}

function svgToScreen(
  svg: SVGSVGElement,
  svgX: number,
  svgY: number,
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  return {
    x: ctm.a * svgX + ctm.c * svgY + ctm.e,
    y: ctm.b * svgX + ctm.d * svgY + ctm.f,
  };
}

// ---------------------------------------------------------------------------
// Canvas rendering
// ---------------------------------------------------------------------------

const STROKE_COLOR = '#FACC15';
const STROKE_WIDTH_SVG = 4;
const ARROW_HEAD_LENGTH_SVG = 20;
const ARROW_HEAD_ANGLE = Math.PI / 6;

function renderStrokes(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  svg: SVGSVGElement,
  strokes: DrawingStroke[],
  activeStroke: DrawingStroke | null,
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const all = activeStroke ? [...strokes, activeStroke] : strokes;
  for (const stroke of all) {
    if (stroke.points.length < 2) continue;

    // Convert SVG coords → screen coords for rendering on the overlaid canvas
    const screenPoints: { x: number; y: number }[] = [];
    for (const pt of stroke.points) {
      const s = svgToScreen(svg, pt.x, pt.y);
      if (s) screenPoints.push({ x: s.x * devicePixelRatio, y: s.y * devicePixelRatio });
    }

    // Adjust for canvas offset relative to viewport
    const rect = canvas.getBoundingClientRect();
    const offsetX = rect.left * devicePixelRatio;
    const offsetY = rect.top * devicePixelRatio;
    const adjusted = screenPoints.map((p) => ({ x: p.x - offsetX, y: p.y - offsetY }));

    if (adjusted.length < 2) continue;

    // Compute screen-space stroke width from SVG units
    const ctm = svg.getScreenCTM();
    const scale = ctm ? Math.abs(ctm.a) : 1;
    const lineWidth = STROKE_WIDTH_SVG * scale * devicePixelRatio;

    if (stroke.tool === 'pen') {
      drawPenStroke(ctx, adjusted, lineWidth);
    } else {
      drawArrowStroke(ctx, adjusted, lineWidth, scale);
    }
  }
}

function drawPenStroke(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  lineWidth: number,
) {
  const path = new Path2D();
  path.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i]!.x, points[i]!.y);
  }
  ctx.strokeStyle = STROKE_COLOR;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(path);
}

function drawArrowStroke(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  lineWidth: number,
  scale: number,
) {
  const start = points[0]!;
  const end = points[points.length - 1]!;

  // Draw line
  ctx.strokeStyle = STROKE_COLOR;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // Draw arrowhead
  const headLen = ARROW_HEAD_LENGTH_SVG * scale * devicePixelRatio;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.fillStyle = STROKE_COLOR;
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLen * Math.cos(angle - ARROW_HEAD_ANGLE),
    end.y - headLen * Math.sin(angle - ARROW_HEAD_ANGLE),
  );
  ctx.lineTo(
    end.x - headLen * Math.cos(angle + ARROW_HEAD_ANGLE),
    end.y - headLen * Math.sin(angle + ARROW_HEAD_ANGLE),
  );
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseFieldDrawingResult {
  strokesRef: RefObject<DrawingStroke[]>;
  activeStrokeRef: RefObject<DrawingStroke | null>;
  activeTool: RefObject<DrawingTool>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  svgRef: RefObject<SVGSVGElement | null>;
  beginStroke: (e: PointerEvent) => void;
  extendStroke: (e: PointerEvent) => void;
  endStroke: () => void;
  undo: () => void;
  clear: () => void;
  setActiveTool: (tool: DrawingTool) => void;
  redraw: () => void;
  canUndo: boolean;
}

export function useFieldDrawing(): UseFieldDrawingResult {
  const strokesRef = useRef<DrawingStroke[]>([]);
  const activeStrokeRef = useRef<DrawingStroke | null>(null);
  const activeTool = useRef<DrawingTool>('pen');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [strokeCount, setStrokeCount] = useState(0);

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const canvas = canvasRef.current;
      const svg = svgRef.current;
      if (!canvas || !svg) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderStrokes(ctx, canvas, svg, strokesRef.current, activeStrokeRef.current);
    });
  }, []);

  const beginStroke = useCallback(
    (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const pt = screenToSvg(svg, e.clientX, e.clientY);
      if (!pt) return;
      activeStrokeRef.current = { points: [pt], tool: activeTool.current };
      scheduleRedraw();
    },
    [scheduleRedraw],
  );

  const extendStroke = useCallback(
    (e: PointerEvent) => {
      const svg = svgRef.current;
      const stroke = activeStrokeRef.current;
      if (!svg || !stroke) return;
      const pt = screenToSvg(svg, e.clientX, e.clientY);
      if (!pt) return;
      stroke.points.push(pt);
      scheduleRedraw();
    },
    [scheduleRedraw],
  );

  const endStroke = useCallback(() => {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    if (stroke.points.length >= 2) {
      strokesRef.current = [...strokesRef.current, stroke];
      setStrokeCount(strokesRef.current.length);
    }
    activeStrokeRef.current = null;
    scheduleRedraw();
  }, [scheduleRedraw]);

  const undo = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    scheduleRedraw();
  }, [scheduleRedraw]);

  const clear = useCallback(() => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    setStrokeCount(0);
    scheduleRedraw();
  }, [scheduleRedraw]);

  const setActiveTool = useCallback((tool: DrawingTool) => {
    activeTool.current = tool;
  }, []);

  return {
    strokesRef,
    activeStrokeRef,
    activeTool,
    canvasRef,
    svgRef,
    beginStroke,
    extendStroke,
    endStroke,
    undo,
    clear,
    setActiveTool,
    redraw: scheduleRedraw,
    canUndo: strokeCount > 0,
  };
}

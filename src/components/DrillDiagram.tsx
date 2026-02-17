import { parseDiagram } from '@/utils/diagramParser.ts';
import type { DiagramElement, DiagramArrow, DiagramPoint } from '@/utils/diagramParser.ts';

interface DrillDiagramProps {
  diagram?: string;
  className?: string;
}

// Coordinate system: DSL uses 0-10, SVG viewBox is 0-200
// Scale: 0-10 maps to 10-190 (with 10px padding on each side)
const PADDING = 10;
const SCALE = (200 - PADDING * 2) / 10; // 18

function toSvg(val: number): number {
  return PADDING + val * SCALE;
}

function pointsToStr(points: DiagramPoint[]): string {
  return points.map((p) => `${toSvg(p.x)},${toSvg(p.y)}`).join(' ');
}

function renderElement(el: DiagramElement, i: number) {
  const cx = toSvg(el.position.x);
  const cy = toSvg(el.position.y);

  switch (el.type) {
    case 'zone': {
      if (!el.position2) return null;
      const x2 = toSvg(el.position2.x);
      const y2 = toSvg(el.position2.y);
      return (
        <rect
          key={i}
          x={Math.min(cx, x2)}
          y={Math.min(cy, y2)}
          width={Math.abs(x2 - cx)}
          height={Math.abs(y2 - cy)}
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      );
    }
    case 'goal': {
      if (!el.position2) return null;
      const x1 = toSvg(el.position.x);
      const x2 = toSvg(el.position2.x);
      const y1 = toSvg(el.position.y);
      const y2 = toSvg(el.position2.y);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      // Render as a rect; for a horizontal goal line, height defaults to 4
      return (
        <rect
          key={i}
          x={Math.min(x1, x2)}
          y={height > 0 ? Math.min(y1, y2) : Math.min(y1, y2) - 2}
          width={width}
          height={height > 0 ? height : 4}
          fill="white"
          rx={1}
        />
      );
    }
    case 'cone': {
      const h = 8;
      const w = 6;
      const points = `${cx},${cy - h / 2} ${cx - w / 2},${cy + h / 2} ${cx + w / 2},${cy + h / 2}`;
      return <polygon key={i} points={points} fill="#f97316" />;
    }
    case 'ball': {
      return (
        <g key={i}>
          <circle cx={cx} cy={cy} r={5} fill="white" stroke="#333" strokeWidth={1} />
        </g>
      );
    }
    case 'player': {
      return (
        <g key={i}>
          <circle cx={cx} cy={cy} r={8} fill="#3b82f6" />
          {el.label && (
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fill="white"
              fontSize={8}
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {el.label}
            </text>
          )}
        </g>
      );
    }
    case 'defender': {
      return (
        <g key={i}>
          <circle cx={cx} cy={cy} r={8} fill="#ef4444" />
          {el.label && (
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fill="white"
              fontSize={8}
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {el.label}
            </text>
          )}
        </g>
      );
    }
    case 'goalkeeper': {
      return (
        <g key={i}>
          <circle cx={cx} cy={cy} r={8} fill="#eab308" />
          {el.label && (
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fill="#1a1a1a"
              fontSize={8}
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {el.label}
            </text>
          )}
        </g>
      );
    }
    case 'text': {
      return (
        <text
          key={i}
          x={cx}
          y={cy}
          textAnchor="middle"
          fill="rgba(255,255,255,0.7)"
          fontSize={7}
          fontFamily="sans-serif"
        >
          {el.label}
        </text>
      );
    }
    default:
      return null;
  }
}

function renderArrow(arrow: DiagramArrow, stepIdx: number, arrowIdx: number) {
  if (arrow.points.length < 2) return null;
  const pts = pointsToStr(arrow.points);
  const markerId = arrow.type === 'pass' ? 'ahd' : 'ah';
  return (
    <polyline
      key={`${stepIdx}-${arrowIdx}`}
      points={pts}
      fill="none"
      stroke="white"
      strokeWidth={1.5}
      strokeDasharray={arrow.type === 'pass' ? '4 3' : undefined}
      markerEnd={`url(#${markerId})`}
      opacity={0.85}
    />
  );
}

export function DrillDiagram({ diagram, className }: DrillDiagramProps) {
  if (!diagram || diagram.trim() === '') return null;

  const { elements, steps } = parseDiagram(diagram);

  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <marker id="ah" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="white" />
        </marker>
        <marker id="ahd" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="white" />
        </marker>
      </defs>
      {/* Field background */}
      <rect x={0} y={0} width={200} height={200} fill="#2d5a27" rx={4} />
      {/* Elements */}
      {elements.map((el, i) => renderElement(el, i))}
      {/* Arrows (all steps, layered) */}
      {steps.flatMap((step, si) => step.arrows.map((arrow, ai) => renderArrow(arrow, si, ai)))}
    </svg>
  );
}

export type DiagramElementType =
  | 'player'
  | 'defender'
  | 'goalkeeper'
  | 'cone'
  | 'ball'
  | 'goal'
  | 'zone'
  | 'text';

export type DiagramArrowType = 'run' | 'pass';

export interface DiagramPoint {
  x: number;
  y: number;
}

export interface DiagramElement {
  type: DiagramElementType;
  position: DiagramPoint;
  /** Second point for goal/zone (end corner) */
  position2?: DiagramPoint;
  label?: string;
}

export interface DiagramArrow {
  type: DiagramArrowType;
  /** Waypoints from start to end. First point is resolved from a label or coordinate. */
  points: DiagramPoint[];
}

export interface DiagramStep {
  arrows: DiagramArrow[];
}

export interface ParsedDiagram {
  elements: DiagramElement[];
  steps: DiagramStep[];
}

// Module-level regex — lastIndex must be reset before each use (g flag)
const TOKEN_REGEX = /\b(GK|[PDBGZCT])\s+(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/g;
const COORD_REGEX = /^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/;
const LABEL_REGEX = /^([A-Za-z]\w*)/;
const QUOTED_REGEX = /^"([^"]*)"/;

function tokenToType(token: string): DiagramElementType {
  switch (token) {
    case 'P':
      return 'player';
    case 'D':
      return 'defender';
    case 'GK':
      return 'goalkeeper';
    case 'C':
      return 'cone';
    case 'B':
      return 'ball';
    case 'G':
      return 'goal';
    case 'Z':
      return 'zone';
    case 'T':
      return 'text';
    default:
      throw new Error(`Unknown token: ${token}`);
  }
}

function parseElementLine(
  line: string,
  labelMap: Map<string, DiagramPoint>,
  elements: DiagramElement[],
): void {
  TOKEN_REGEX.lastIndex = 0;

  const rawMatches: Array<{
    token: string;
    x: number;
    y: number;
    matchStart: number;
    matchEnd: number;
  }> = [];

  let m: RegExpExecArray | null;
  while ((m = TOKEN_REGEX.exec(line)) !== null) {
    rawMatches.push({
      token: m[1],
      x: parseFloat(m[2]),
      y: parseFloat(m[3]),
      matchStart: m.index,
      matchEnd: m.index + m[0].length,
    });
  }

  for (let i = 0; i < rawMatches.length; i++) {
    const raw = rawMatches[i];
    const nextStart = i + 1 < rawMatches.length ? rawMatches[i + 1].matchStart : line.length;
    const lookahead = line.slice(raw.matchEnd, nextStart).trimStart();
    const pos: DiagramPoint = { x: raw.x, y: raw.y };
    const type = tokenToType(raw.token);
    const element: DiagramElement = { type, position: pos };

    if (type === 'goal' || type === 'zone') {
      const coordMatch = lookahead.match(COORD_REGEX);
      if (coordMatch) {
        element.position2 = {
          x: parseFloat(coordMatch[1]),
          y: parseFloat(coordMatch[2]),
        };
      }
    } else if (type === 'text') {
      const quotedMatch = lookahead.match(QUOTED_REGEX);
      if (quotedMatch) {
        element.label = quotedMatch[1];
      }
    } else if (type === 'player' || type === 'defender' || type === 'goalkeeper') {
      const labelMatch = lookahead.match(LABEL_REGEX);
      if (labelMatch) {
        element.label = labelMatch[1];
        labelMap.set(labelMatch[1], pos);
      }
    }

    elements.push(element);
  }
}

function resolvePoint(segment: string, labelMap: Map<string, DiagramPoint>): DiagramPoint | null {
  const trimmed = segment.trim();
  const coordMatch = trimmed.match(/^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/);
  if (coordMatch) {
    return { x: parseFloat(coordMatch[1]), y: parseFloat(coordMatch[2]) };
  }
  return labelMap.get(trimmed) ?? null;
}

function parseArrowLine(
  line: string,
  type: DiagramArrowType,
  labelMap: Map<string, DiagramPoint>,
): DiagramArrow | null {
  const prefix = type === 'run' ? 'run ' : 'pass ';
  const rest = line.slice(prefix.length);
  const segments = rest.split('>');
  const points: DiagramPoint[] = [];
  for (const seg of segments) {
    const point = resolvePoint(seg, labelMap);
    if (point === null) return null;
    points.push(point);
  }
  return { type, points };
}

export function parseDiagram(input: string): ParsedDiagram {
  const elements: DiagramElement[] = [];
  const steps: DiagramStep[] = [];
  const labelMap = new Map<string, DiagramPoint>();
  let currentStep: DiagramArrow[] = [];
  let inArrowGroup = false;

  const lines = input.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === '') {
      if (inArrowGroup && currentStep.length > 0) {
        steps.push({ arrows: currentStep });
        currentStep = [];
        inArrowGroup = false;
      }
      continue;
    }

    if (line.trimStart().startsWith('#')) {
      continue;
    }

    const trimmed = line.trimStart();
    if (trimmed.startsWith('run ') || trimmed.startsWith('pass ')) {
      const arrowType: DiagramArrowType = trimmed.startsWith('run ') ? 'run' : 'pass';
      const arrow = parseArrowLine(trimmed, arrowType, labelMap);
      if (arrow !== null) {
        currentStep.push(arrow);
      }
      inArrowGroup = true;
    } else {
      parseElementLine(line, labelMap, elements);
    }
  }

  if (currentStep.length > 0) {
    steps.push({ arrows: currentStep });
  }

  return { elements, steps };
}

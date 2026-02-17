# Drill Card Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance DrillCard with phase borders, intensity indicators, equipment icons, metadata pills, and a drill diagram DSL renderer.

**Architecture:** Add visual metadata to the existing `DrillCard` component in `Practice.tsx` using existing `Badge` and `lucide-react` icons. Build a standalone DSL parser + SVG renderer for drill diagrams. Add optional `diagram` field to `Drill` type.

**Tech Stack:** React, TypeScript, lucide-react icons, shadcn Badge component, inline SVG rendering, Vitest + Testing Library.

---

### Task 1: Add Phase Color Constants and Intensity Display Helpers

**Files:**

- Create: `src/utils/drillDisplay.ts`
- Create: `src/utils/drillDisplay.test.ts`

**Step 1: Write failing tests for display helpers**

In `src/utils/drillDisplay.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getPhaseColor, getIntensityDisplay } from '@/utils/drillDisplay.ts';

describe('getPhaseColor', () => {
  it('returns amber classes for warm-up', () => {
    expect(getPhaseColor('warm-up')).toBe('border-l-amber-400');
  });

  it('returns blue classes for main', () => {
    expect(getPhaseColor('main')).toBe('border-l-blue-400');
  });

  it('returns emerald classes for scrimmage', () => {
    expect(getPhaseColor('scrimmage')).toBe('border-l-emerald-400');
  });

  it('returns slate classes for cool-down', () => {
    expect(getPhaseColor('cool-down')).toBe('border-l-slate-400');
  });
});

describe('getIntensityDisplay', () => {
  it('returns 1 filled dot and green color for low', () => {
    const result = getIntensityDisplay('low');
    expect(result.filled).toBe(1);
    expect(result.label).toBe('Low');
    expect(result.colorClass).toContain('green');
  });

  it('returns 2 filled dots and amber color for medium', () => {
    const result = getIntensityDisplay('medium');
    expect(result.filled).toBe(2);
    expect(result.label).toBe('Med');
    expect(result.colorClass).toContain('amber');
  });

  it('returns 3 filled dots and red color for high', () => {
    const result = getIntensityDisplay('high');
    expect(result.filled).toBe(3);
    expect(result.label).toBe('High');
    expect(result.colorClass).toContain('red');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/utils/drillDisplay.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the display helpers**

In `src/utils/drillDisplay.ts`:

```ts
import type { DrillPhase } from '@/types/drill.ts';

const PHASE_BORDER_COLORS: Record<DrillPhase, string> = {
  'warm-up': 'border-l-amber-400',
  main: 'border-l-blue-400',
  scrimmage: 'border-l-emerald-400',
  'cool-down': 'border-l-slate-400',
};

export function getPhaseColor(phase: DrillPhase): string {
  return PHASE_BORDER_COLORS[phase];
}

export interface IntensityDisplay {
  filled: number;
  label: string;
  colorClass: string;
}

const INTENSITY_MAP: Record<string, IntensityDisplay> = {
  low: { filled: 1, label: 'Low', colorClass: 'text-green-600 dark:text-green-400' },
  medium: { filled: 2, label: 'Med', colorClass: 'text-amber-600 dark:text-amber-400' },
  high: { filled: 3, label: 'High', colorClass: 'text-red-600 dark:text-red-400' },
};

export function getIntensityDisplay(intensity: 'low' | 'medium' | 'high'): IntensityDisplay {
  return INTENSITY_MAP[intensity];
}

export const EQUIPMENT_ICON_NAMES: Record<string, string> = {
  balls: 'Circle',
  cones: 'Triangle',
  pinnies: 'Shirt',
  goals: 'RectangleHorizontal',
  gloves: 'Hand',
  'agility ladder': 'Fence',
};
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/utils/drillDisplay.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/drillDisplay.ts src/utils/drillDisplay.test.ts
git commit -m "feat: add drill display helpers for phase colors, intensity, equipment"
```

---

### Task 2: Update DrillCard with Phase Border and Metadata Pills

**Files:**

- Modify: `src/pages/Practice.tsx` (DrillCard component, lines ~393–508)

**Step 1: Import new dependencies at top of Practice.tsx**

Add these imports alongside the existing ones:

```ts
import {
  Clock,
  Users,
  Triangle,
  Circle,
  Shirt,
  RectangleHorizontal,
  Hand,
  Fence,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { getPhaseColor, getIntensityDisplay, EQUIPMENT_ICON_NAMES } from '@/utils/drillDisplay.ts';
```

**Step 2: Add equipment icon lookup map inside Practice.tsx**

Below the existing `CATEGORY_COLORS` constant:

```ts
const EQUIPMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  balls: Circle,
  cones: Triangle,
  pinnies: Shirt,
  goals: RectangleHorizontal,
  gloves: Hand,
  'agility ladder': Fence,
};
```

**Step 3: Add IntensityDots inline component inside Practice.tsx**

Below the existing `SwapIcon` component at the bottom of the file:

```tsx
function IntensityDots({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  const { filled, label, colorClass } = getIntensityDisplay(intensity);
  return (
    <span className={`inline-flex items-center gap-0.5 ${colorClass}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="text-[8px]">
          {i < filled ? '●' : '○'}
        </span>
      ))}
      <span className="ml-0.5 text-xs">{label}</span>
    </span>
  );
}
```

**Step 4: Update the Card wrapper in DrillCard to add phase border**

Change the Card element from:

```tsx
<Card className="gap-0 py-0">
```

To:

```tsx
<Card className={`gap-0 py-0 border-l-4 ${getPhaseColor(drill.phase)}`}>
```

**Step 5: Replace the inline metadata text with a pills row**

In DrillCard, replace the metadata `<div>` that contains `{drill.durationMinutes}m · {drill.minPlayers}+ players` (the right side of the header row and the duration/players text). Restructure the card content to have:

1. Header row: index + name + favorite star + category badge + swap button (right)
2. Metadata pills row: duration badge + players badge + intensity badge + equipment icons
3. Description
4. Coaching tip
5. Expand section

The header `<div className="flex items-start justify-between gap-2">` stays, but move the duration/players out of it. After the header row, add:

```tsx
{
  /* Metadata pills */
}
<div className="flex flex-wrap items-center gap-1.5">
  <Badge variant="outline" className="gap-1 text-xs font-normal">
    <Clock className="size-3" />
    {drill.durationMinutes}m
  </Badge>
  <Badge variant="outline" className="gap-1 text-xs font-normal">
    <Users className="size-3" />
    {drill.minPlayers}+
  </Badge>
  <Badge variant="outline" className="gap-1 text-xs font-normal">
    <IntensityDots intensity={drill.intensity} />
  </Badge>
  {drill.equipment.length > 0 && (
    <Badge variant="outline" className="gap-1 text-xs font-normal text-muted-foreground">
      {drill.equipment.map((eq) => {
        const Icon = EQUIPMENT_ICONS[eq];
        return Icon ? <Icon key={eq} className="size-3" /> : null;
      })}
    </Badge>
  )}
</div>;
```

Remove the old `<span className="text-xs text-muted-foreground">{drill.durationMinutes}m · {drill.minPlayers}+ players</span>` from the header right-side div. Keep the swap button in the header right-side.

**Step 6: Remove equipment from expanded section**

In the expanded section, remove the equipment text block:

```tsx
{
  drill.equipment.length > 0 && (
    <div className="text-sm">
      <span className="font-medium">Equipment: </span>
      <span className="text-muted-foreground">{drill.equipment.join(', ')}</span>
    </div>
  );
}
```

This is no longer needed since equipment icons are now visible in the pills row.

**Step 7: Run tests to verify nothing broke**

Run: `pnpm vitest run src/pages/Practice.test.tsx`
Expected: All existing tests PASS (the tests check for text content and buttons, not the metadata format)

**Step 8: Run type check**

Run: `pnpm build`
Expected: No type errors

**Step 9: Visually verify**

Run: `pnpm dev`
Open the Practice page, select U10, select Passing. Verify:

- Cards have colored left borders (amber for warm-up, blue for main, etc.)
- Metadata pills row shows below the header
- Intensity dots appear with correct colors
- Equipment icons appear as small icons

**Step 10: Commit**

```bash
git add src/pages/Practice.tsx
git commit -m "feat: add phase borders, metadata pills, intensity and equipment to drill cards"
```

---

### Task 3: Build Drill Diagram DSL Parser

**Files:**

- Create: `src/utils/diagramParser.ts`
- Create: `src/utils/diagramParser.test.ts`

**Step 1: Define the parsed diagram types in diagramParser.ts**

```ts
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
```

**Step 2: Write failing tests for the parser**

In `src/utils/diagramParser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseDiagram } from '@/utils/diagramParser.ts';

describe('parseDiagram', () => {
  it('parses a player element', () => {
    const result = parseDiagram('P 3,7 A');
    expect(result.elements).toEqual([{ type: 'player', position: { x: 3, y: 7 }, label: 'A' }]);
  });

  it('parses a player without a label', () => {
    const result = parseDiagram('P 5,5');
    expect(result.elements).toEqual([{ type: 'player', position: { x: 5, y: 5 } }]);
  });

  it('parses a defender element', () => {
    const result = parseDiagram('D 5,4');
    expect(result.elements).toEqual([{ type: 'defender', position: { x: 5, y: 4 } }]);
  });

  it('parses a defender with a label', () => {
    const result = parseDiagram('D 5,4 X');
    expect(result.elements).toEqual([{ type: 'defender', position: { x: 5, y: 4 }, label: 'X' }]);
  });

  it('parses a goalkeeper element', () => {
    const result = parseDiagram('GK 5,1');
    expect(result.elements).toEqual([{ type: 'goalkeeper', position: { x: 5, y: 1 } }]);
  });

  it('parses a cone element', () => {
    const result = parseDiagram('C 2,2');
    expect(result.elements).toEqual([{ type: 'cone', position: { x: 2, y: 2 } }]);
  });

  it('parses a ball element', () => {
    const result = parseDiagram('B 5,8');
    expect(result.elements).toEqual([{ type: 'ball', position: { x: 5, y: 8 } }]);
  });

  it('parses a goal element with two points', () => {
    const result = parseDiagram('G 3,0 7,0');
    expect(result.elements).toEqual([
      { type: 'goal', position: { x: 3, y: 0 }, position2: { x: 7, y: 0 } },
    ]);
  });

  it('parses a zone element with two points', () => {
    const result = parseDiagram('Z 1,1 9,9');
    expect(result.elements).toEqual([
      { type: 'zone', position: { x: 1, y: 1 }, position2: { x: 9, y: 9 } },
    ]);
  });

  it('parses a text label element', () => {
    const result = parseDiagram('T 5,5 "End zone"');
    expect(result.elements).toEqual([
      { type: 'text', position: { x: 5, y: 5 }, label: 'End zone' },
    ]);
  });

  it('parses multiple elements on separate lines', () => {
    const result = parseDiagram('P 2,7 A\nP 8,7 B\nD 5,4');
    expect(result.elements).toHaveLength(3);
    expect(result.elements[0]).toEqual({ type: 'player', position: { x: 2, y: 7 }, label: 'A' });
    expect(result.elements[1]).toEqual({ type: 'player', position: { x: 8, y: 7 }, label: 'B' });
    expect(result.elements[2]).toEqual({ type: 'defender', position: { x: 5, y: 4 } });
  });

  it('parses multiple elements on the same line (space-separated tokens)', () => {
    const result = parseDiagram('C 1,1  C 9,1  C 1,9  C 9,9');
    expect(result.elements).toHaveLength(4);
    expect(result.elements.every((e) => e.type === 'cone')).toBe(true);
  });

  it('ignores comments and blank lines', () => {
    const result = parseDiagram('# This is a comment\n\nP 5,5 A');
    expect(result.elements).toHaveLength(1);
  });

  it('parses a run arrow referencing a label', () => {
    const result = parseDiagram('P 2,7 A\nrun A > 5,4');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].arrows).toHaveLength(1);
    expect(result.steps[0].arrows[0].type).toBe('run');
    expect(result.steps[0].arrows[0].points).toEqual([
      { x: 2, y: 7 },
      { x: 5, y: 4 },
    ]);
  });

  it('parses a pass arrow between two labeled elements', () => {
    const result = parseDiagram('P 2,7 A\nP 8,3 B\npass A > B');
    expect(result.steps[0].arrows[0].type).toBe('pass');
    expect(result.steps[0].arrows[0].points).toEqual([
      { x: 2, y: 7 },
      { x: 8, y: 3 },
    ]);
  });

  it('parses a run arrow with multiple waypoints', () => {
    const result = parseDiagram('P 2,7 A\nrun A > 5,4 > 8,1');
    expect(result.steps[0].arrows[0].points).toEqual([
      { x: 2, y: 7 },
      { x: 5, y: 4 },
      { x: 8, y: 1 },
    ]);
  });

  it('groups consecutive arrows into the same step', () => {
    const result = parseDiagram('P 2,7 A\nP 8,3 B\n\npass A > B\nrun A > 5,4');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].arrows).toHaveLength(2);
  });

  it('separates steps by blank lines between arrow groups', () => {
    const input = `P 2,7 A
P 8,3 B

pass A > B
run A > 5,4

pass B > 8,1`;
    const result = parseDiagram(input);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].arrows).toHaveLength(2);
    expect(result.steps[1].arrows).toHaveLength(1);
  });

  it('parses a full diagram (wall pass example)', () => {
    const input = `C 1,1  C 9,1  C 1,8  C 9,8
G 3,0 7,0
P 2,7 A
P 6,3 B
D 5,5
B 2,7

run A > 5,5
pass A > B

pass B > 8,1
run A > 8,1`;
    const result = parseDiagram(input);
    expect(result.elements).toHaveLength(8); // 4 cones + goal + 2 players + defender + ball = 9... wait
    // 4 cones + 1 goal + 1 player A + 1 player B + 1 defender + 1 ball = 8
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].arrows).toHaveLength(2);
    expect(result.steps[1].arrows).toHaveLength(2);
  });

  it('returns empty diagram for empty string', () => {
    const result = parseDiagram('');
    expect(result.elements).toEqual([]);
    expect(result.steps).toEqual([]);
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `pnpm vitest run src/utils/diagramParser.test.ts`
Expected: FAIL — `parseDiagram` not found

**Step 4: Implement the parser**

Add the `parseDiagram` function to `src/utils/diagramParser.ts`. The parser should:

1. Split input by newlines
2. Track a label→position lookup map
3. For each non-blank, non-comment line, try to match element tokens (`P`, `D`, `GK`, `C`, `B`, `G`, `Z`, `T`) or arrow tokens (`run`, `pass`)
4. Handle multi-element lines by re-scanning for additional element tokens after parsing the first
5. Group arrows into steps: consecutive arrow lines = same step, blank lines between arrow groups = new step
6. Resolve label references in arrows using the lookup map

Key implementation details:

- Parse coordinates as `parseFloat` to support decimals like `3.5,7`
- For same-line multi-element parsing: after parsing one element, check if the remaining text starts with another element token
- Arrow parsing: split on `>`, trim each segment, resolve label or parse coordinate
- Step grouping: track whether we're "in an arrow group" — a blank line while in an arrow group starts a new step

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/utils/diagramParser.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/utils/diagramParser.ts src/utils/diagramParser.test.ts
git commit -m "feat: add drill diagram DSL parser with step grouping"
```

---

### Task 4: Build DrillDiagram SVG Renderer Component

**Files:**

- Create: `src/components/DrillDiagram.tsx`
- Create: `src/components/DrillDiagram.test.tsx`

**Step 1: Write tests for the renderer**

In `src/components/DrillDiagram.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { DrillDiagram } from '@/components/DrillDiagram.tsx';

describe('DrillDiagram', () => {
  it('renders nothing when diagram is undefined', () => {
    const { container } = render(<DrillDiagram />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when diagram is empty string', () => {
    const { container } = render(<DrillDiagram diagram="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an SVG element for a valid diagram', () => {
    const { container } = render(<DrillDiagram diagram="P 5,5 A" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('renders player circles for P elements', () => {
    const { container } = render(<DrillDiagram diagram="P 5,5 A" />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it('renders player labels as text', () => {
    const { container } = render(<DrillDiagram diagram="P 5,5 A" />);
    const texts = container.querySelectorAll('text');
    const labelText = Array.from(texts).find((t) => t.textContent === 'A');
    expect(labelText).not.toBeUndefined();
  });

  it('renders cone triangles for C elements', () => {
    const { container } = render(<DrillDiagram diagram="C 3,3" />);
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders goal rectangles for G elements', () => {
    const { container } = render(<DrillDiagram diagram="G 3,0 7,0" />);
    const rects = container.querySelectorAll('rect');
    // At least 2 rects: the field background + the goal
    const goalRects = Array.from(rects).filter(
      (r) => r.getAttribute('fill') === 'white' || r.getAttribute('stroke') === 'white',
    );
    expect(goalRects.length).toBeGreaterThanOrEqual(1);
  });

  it('renders zone as a dashed rectangle for Z elements', () => {
    const { container } = render(<DrillDiagram diagram="Z 1,1 9,9" />);
    const rects = container.querySelectorAll('rect');
    const dashedRect = Array.from(rects).find((r) => r.getAttribute('stroke-dasharray'));
    expect(dashedRect).not.toBeUndefined();
  });

  it('renders arrows for run/pass lines', () => {
    const { container } = render(<DrillDiagram diagram={'P 2,7 A\nP 8,3 B\npass A > B'} />);
    const lines = container.querySelectorAll('line, polyline, path');
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  it('applies custom className', () => {
    const { container } = render(<DrillDiagram diagram="P 5,5" className="w-40" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('w-40');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/DrillDiagram.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement the renderer**

In `src/components/DrillDiagram.tsx`, build a component that:

1. Calls `parseDiagram(diagram)` to get elements and steps
2. Uses a `200x200` SVG viewBox
3. Scales 0–10 coordinates to 10–190 (with 10px padding)
4. Renders a green field background (`#2d5a27` or similar dark green, rounded rect)
5. Renders elements in order:
   - **Zone**: `<rect>` with dashed white stroke, no fill
   - **Goal**: `<rect>` with white fill, 4px wide, positioned between the two points
   - **Cone**: `<polygon>` orange triangle, ~8px tall
   - **Ball**: `<circle>` white fill with dark stroke, 5px radius
   - **Player**: `<circle>` blue fill (`#3b82f6`), 8px radius + white text label centered
   - **Defender**: `<circle>` red fill (`#ef4444`), 8px radius + white text label
   - **Goalkeeper**: `<circle>` yellow fill (`#eab308`), 8px radius + dark text label
   - **Text**: `<text>` white, small font
6. Renders arrows:
   - **Run**: `<polyline>` solid white stroke with arrowhead marker
   - **Pass**: `<polyline>` dashed white stroke with arrowhead marker
7. Defines an SVG `<defs>` section with a `<marker>` for arrowheads

The component signature:

```tsx
interface DrillDiagramProps {
  diagram?: string;
  className?: string;
}

export function DrillDiagram({ diagram, className }: DrillDiagramProps) {
  if (!diagram || diagram.trim() === '') return null;
  // ... parse and render
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/DrillDiagram.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/DrillDiagram.tsx src/components/DrillDiagram.test.tsx
git commit -m "feat: add DrillDiagram SVG renderer component"
```

---

### Task 5: Add `diagram` Field to Drill Type and Add Example Diagrams

**Files:**

- Modify: `src/types/drill.ts` (add optional `diagram` field to `Drill` interface)
- Modify: `src/data/drills.ts` (add diagram strings to 5 drills)

**Step 1: Add the diagram field to the Drill interface**

In `src/types/drill.ts`, add to the `Drill` interface:

```ts
export interface Drill {
  // ... existing fields ...
  equipment: string[];
  diagram?: string;
}
```

**Step 2: Add example diagrams to 5 drills in drills.ts**

Add `diagram` strings to these 5 structurally diverse drills:

1. **`passing-wall-pass-combination`** (Wall Pass — channel with run + pass)
2. **`dribbling-1v1-channel`** (1v1 — simple channel, attacker vs defender)
3. **`possession-rondo-5v2`** (Rondo — circular layout, multiple players)
4. **`shooting-turn-and-shoot`** (Turn and Shoot — goal, server, shooter)
5. **`scrimmage-3v3-mini`** (3v3 — two goals, two teams)

Example for wall pass:

```ts
diagram: `C 1,1  C 9,1  C 1,8  C 9,8
G 3,0 7,0
P 2,7 A
P 6,3 B
D 5,5
B 2,7

run A > 5,5
pass A > B

pass B > 8,1
run A > 8,1`,
```

Example for 1v1 channel:

```ts
diagram: `C 1,0  C 9,0  C 1,8  C 9,8
P 5,7 A
D 5,2
B 5,7

run A > 5,2 > 5,0`,
```

Example for rondo 5v2:

```ts
diagram: `Z 1,1 9,9
P 5,1 A
P 9,5 B
P 5,9 C
P 1,5 D
P 3,2 E
D 4,4
D 6,6
B 5,1

pass A > B
pass B > C
pass C > D`,
```

Example for turn and shoot:

```ts
diagram: `G 3,0 7,0
GK 5,1
P 5,5 S
P 5,9 Sv
B 5,9

pass Sv > S
run S > 4,4
pass S > 5,1`,
```

Example for 3v3 mini:

```ts
diagram: `G 1,0 4,0
G 6,10 9,10
P 3,3 A
P 5,5 B
P 7,3 C
D 3,7
D 5,5
D 7,7
B 5,5`,
```

**Step 3: Run type check**

Run: `pnpm build`
Expected: No type errors (field is optional, existing drills without it are fine)

**Step 4: Commit**

```bash
git add src/types/drill.ts src/data/drills.ts
git commit -m "feat: add diagram field to Drill type with 5 example diagrams"
```

---

### Task 6: Integrate DrillDiagram into DrillCard

**Files:**

- Modify: `src/pages/Practice.tsx` (DrillCard component)

**Step 1: Import DrillDiagram**

```ts
import { DrillDiagram } from '@/components/DrillDiagram.tsx';
```

**Step 2: Add diagram to the card layout**

In the DrillCard component, between the metadata pills row and the description, add a flex container that shows the description and diagram side by side on desktop:

Replace the existing description paragraph:

```tsx
{
  /* Description */
}
<p className="text-sm text-muted-foreground">{drill.description}</p>;
```

With:

```tsx
{
  /* Description + diagram */
}
<div className={drill.diagram ? 'flex gap-3 items-start' : ''}>
  <p className="text-sm text-muted-foreground flex-1">{drill.description}</p>
  {drill.diagram && (
    <DrillDiagram
      diagram={drill.diagram}
      className="w-36 h-36 shrink-0 rounded-md hidden sm:block"
    />
  )}
</div>;
```

This shows the diagram beside the description on `sm+` screens and hides it on mobile (since the card is narrow). For mobile, optionally show a smaller version in the expanded section.

**Step 3: Run existing tests**

Run: `pnpm vitest run src/pages/Practice.test.tsx`
Expected: All existing tests PASS

**Step 4: Run type check and build**

Run: `pnpm build`
Expected: No errors

**Step 5: Visually verify**

Run: `pnpm dev`
Navigate to Practice page, select U10 → Passing. The "Wall Pass" drill should display its diagram inline beside the description.

**Step 6: Commit**

```bash
git add src/pages/Practice.tsx
git commit -m "feat: integrate drill diagrams into DrillCard layout"
```

---

### Task 7: Update Practice Page Tests for New Card Structure

**Files:**

- Modify: `src/pages/Practice.test.tsx`

**Step 1: Add tests for the new metadata elements**

Add these tests to the existing `describe('Practice page')` block:

```tsx
it('shows phase-colored borders on drill cards when plan is generated', async () => {
  const user = userEvent.setup();
  renderPractice();
  await user.click(screen.getByRole('button', { name: 'U10' }));
  const section = getFocusAreasSection();
  await user.click(within(section).getByRole('button', { name: 'Passing' }));
  // Cards should be rendered
  const cards = document.querySelectorAll('[data-slot="card"]');
  expect(cards.length).toBeGreaterThanOrEqual(3);
  // At least one card should have a phase border class
  const hasPhaseClass = Array.from(cards).some(
    (c) =>
      c.className.includes('border-l-amber') ||
      c.className.includes('border-l-blue') ||
      c.className.includes('border-l-emerald') ||
      c.className.includes('border-l-slate'),
  );
  expect(hasPhaseClass).toBe(true);
});

it('shows intensity badges on drill cards', async () => {
  const user = userEvent.setup();
  renderPractice();
  await user.click(screen.getByRole('button', { name: 'U10' }));
  const section = getFocusAreasSection();
  await user.click(within(section).getByRole('button', { name: 'Passing' }));
  // Should see at least one intensity label (Low, Med, or High)
  const hasIntensity =
    screen.queryByText('Low') || screen.queryByText('Med') || screen.queryByText('High');
  expect(hasIntensity).not.toBeNull();
});
```

**Step 2: Run all tests**

Run: `pnpm vitest run src/pages/Practice.test.tsx`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/pages/Practice.test.tsx
git commit -m "test: add tests for phase borders and intensity badges on drill cards"
```

---

### Task 8: Final Verification

**Step 1: Run full test suite**

Run: `pnpm test:run`
Expected: All tests pass

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 3: Run build**

Run: `pnpm build`
Expected: Clean build with no type errors

**Step 4: Visual smoke test**

Run: `pnpm dev`
Check:

- Practice page with plan generated: phase borders, metadata pills, intensity, equipment icons visible
- Drill cards with diagrams show the SVG inline
- Expand/collapse still works
- Swap still works
- Favorites still work
- Browse mode (no category selected) still works with the new card design
- Mobile viewport: diagram hides, pills wrap properly

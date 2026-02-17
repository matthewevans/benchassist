# Drill Card Redesign: Metadata Improvements + Diagram System

## Problem

The DrillCard component displays 73 drills but underutilizes the data model. Three properties are invisible or undertreated:

1. **Intensity** (`low | medium | high`) — completely absent from the UI
2. **Phase** — only expressed through ordering or section headers, no per-card visual
3. **Equipment** — buried in expanded section as comma-separated text, despite only 6 distinct items across all drills

Additionally, there is no way to visually illustrate drill setups. The `setup` field is prose-only, but drills describe spatial layouts (grids, channels, formations) that are inherently diagrammatic.

## Design

### Part 1: Metadata Improvements

#### 1.1 Phase Accent (Left Border)

Each card gets a `border-l-4` colored by phase:

| Phase     | Color   | Class                  |
| --------- | ------- | ---------------------- |
| warm-up   | Amber   | `border-l-amber-400`   |
| main      | Blue    | `border-l-blue-400`    |
| scrimmage | Emerald | `border-l-emerald-400` |
| cool-down | Slate   | `border-l-slate-400`   |

Provides instant visual grouping. A card torn from context still signals its role in the session.

#### 1.2 Intensity Indicator

Three-dot badge using filled/unfilled circles, color-coded:

- **Low**: `● ○ ○` green
- **Medium**: `● ● ○` amber
- **High**: `● ● ●` red

Rendered as a `Badge variant="outline"` with dots + label text.

#### 1.3 Equipment Icons

6 recurring equipment items mapped to `lucide-react` icons:

| Equipment      | lucide icon           |
| -------------- | --------------------- |
| balls          | `Circle` (filled)     |
| cones          | `Triangle`            |
| pinnies        | `Shirt`               |
| goals          | `RectangleHorizontal` |
| gloves         | `Hand`                |
| agility ladder | `Ladder`              |

Shown as a tight row of small muted icons. No text labels — self-explanatory for coaches.

#### 1.4 Metadata Pills Row

Horizontal row of `Badge` components between header and description:

```
[⏱ 12m]  [👥 3+]  [●●○ Med]  [△ ⚽ 👕]
```

Uses `Badge variant="outline"` with `lucide-react` Clock and Users icons. Replaces current inline text metadata.

#### 1.5 Updated Card Layout

```
┌──┬──────────────────────────────────────────┐
│▐ │ 1. Drill Name  ★  [Category Badge]       │
│▐ │ [⏱ 12m] [👥 3+] [●●○ Med] [△ ⚽]        │
│▐ │                                           │
│▐ │ Description text...         ┌──────────┐  │
│▐ │ ...continues here           │ diagram   │  │
│▐ │                             └──────────┘  │
│▐ │ 💡 Tip: First coaching tip...             │
│▐ │ [More ▾]                        [🔄 Swap] │
└──┴──────────────────────────────────────────┘
```

Left border color = phase. Diagram appears inline beside description (stacks on mobile).

### Part 2: Drill Diagram System

#### Format: Domain-Specific Coordinate DSL

General ASCII-to-SVG tools (svgbob, ditaa, GoAT) are designed for software diagrams and don't handle soccer-specific elements. Instead: a simple coordinate DSL stored as an optional `diagram?: string` field on each `Drill`.

#### Element Syntax

Grid is 0–10 normalized. Origin = top-left. One element per line. `#` = comment.

| Element    | Syntax           | SVG Rendering                      |
| ---------- | ---------------- | ---------------------------------- |
| Player     | `P x,y [label]`  | Blue filled circle + label         |
| Defender   | `D x,y [label]`  | Red filled circle + optional label |
| Goalkeeper | `GK x,y [label]` | Yellow filled circle + "GK" label  |
| Cone       | `C x,y`          | Orange triangle                    |
| Ball       | `B x,y`          | White circle with pattern          |
| Goal       | `G x1,y1 x2,y2`  | White rectangle between two points |
| Zone       | `Z x1,y1 x2,y2`  | Dashed border rectangle            |
| Text label | `T x,y "text"`   | Positioned text                    |

Multiple elements can share a line: `C 1,1  C 9,1  C 1,9  C 9,9`

#### Arrow Syntax

| Arrow      | Syntax              | SVG Rendering                                 |
| ---------- | ------------------- | --------------------------------------------- |
| Player run | `run A > 5,4 > 8,1` | Solid arrow with arrowhead, follows waypoints |
| Ball pass  | `pass A > B`        | Dashed arrow with arrowhead                   |

Arrows can reference named elements or raw coordinates. Multi-waypoint paths supported.

#### Animation Support

Arrow ordering = animation timeline. Blank lines separate sequential steps; adjacent lines are simultaneous:

```
# Step 1 (simultaneous)
pass A > B
run A > 5,5

# Step 2 (after step 1 completes)
pass B > 8,1
```

Static rendering shows all arrows with step numbers. Future animated rendering moves elements along paths sequentially.

#### Example: Wall Pass (Give and Go)

```
C 1,1  C 9,1  C 1,8  C 9,8
G 3,0 7,0
P 2,7 A
P 6,3 B
D 5,5
B 2,7

run A > 5,5
pass A > B

pass B > 8,1
run A > 8,1
```

#### Renderer Component

```tsx
<DrillDiagram diagram={drill.diagram} className="w-40 h-40" />
```

- Parses DSL string line-by-line (~80–100 lines of parser)
- Renders pure inline SVG — no external dependencies
- Subtle green field background with faint grid
- Responsive: sits beside description on desktop, stacks on mobile

#### Authoring Workflow

Coordinates are not visually intuitive to hand-author. Recommended workflow:

1. **LLM-generated**: Describe the drill → LLM produces DSL. One-time cost per drill. Coordinate format is more LLM-friendly than grid ASCII (no whitespace alignment issues).
2. **Preview**: The renderer component serves as a live preview during authoring.
3. **Future**: Visual drag-and-drop editor that exports to DSL.

### Scope

**Building now:**

- Enhanced DrillCard with phase border, intensity badge, equipment icons, metadata pills
- DSL parser + `DrillDiagram` SVG renderer component
- `diagram` field added to `Drill` type (optional)
- 3–5 example diagrams added to drills to prove the system

**Not building now:**

- Diagrams for all 73 drills
- Animation playback
- Visual diagram editor
- Drag-and-drop authoring

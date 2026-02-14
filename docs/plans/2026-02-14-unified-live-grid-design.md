# Unified Live Grid Design

## Problem

Coaches currently switch between two separate views during games: the RotationGrid (full table for planning) and GameDay (card-based live controls). Neither view alone gives the right at-a-glance info mid-game on an iPad — the grid lacks live controls, and the live view lacks full-schedule context.

## Solution

Merge both views into a single adaptive grid page at `/games/:gameId/rotations`. The grid adapts based on game status (setup → in-progress → completed), adding live overlays without changing the underlying table structure.

## Layout

Three zones in live mode:

1. **Sticky header bar** — Game name, period, rotation count, settings gear, end game button
2. **Scrollable rotation grid** — Full table with sticky player name column (left). No sticky Play% column (scrolls naturally).
3. **Sticky bottom bar** — Timer + play/pause/reset + "next sub ~Xmin" hint + NEXT button. ~60px height, thumb-friendly for iPad.

Progress bar with substitution markers runs as a thin strip along the top edge of the bottom bar.

## Grid Visual Treatments (Live Mode)

- **Past rotation columns:** 40% opacity, non-interactive (swaps disabled)
- **Current rotation column:** Bold left/right border (primary color), light background tint, fully interactive
- **Next rotation column:** Cells where assignment differs from current get a subtle highlight (dashed border or background) to flag upcoming substitutions
- **Auto-scroll:** On mount and on advance, grid scrolls so current column sits ~1/3 from left edge

## Period Collapsing

- Each period header (P1, P2, etc.) is a tap-to-toggle collapse control
- Collapsed period renders as a single narrow column showing "P1 ▸"
- **Elapsed periods auto-collapse** when advancing into a new period
- Current period never auto-collapses
- Future periods stay expanded
- On initial load during live game, all elapsed periods start collapsed
- State: local `Set<PeriodIndex>`, not persisted

## Interactions

### Grid Cells (by game state)

| State | Past Rotations | Current Rotation | Future Rotations |
|-------|---------------|-----------------|-----------------|
| Setup | Full interactive | Full interactive | Full interactive |
| Live | Dimmed, locked | Swappable | Swappable |
| Completed | Read-only | Read-only | Read-only |

### Swap Mode

When a cell is tapped to start a swap:
1. **Selected cell:** Bold ring border (2px primary) + pulsing background
2. **Valid targets:** Other cells in same rotation get subtle highlight
3. **Bottom bar transforms:** Center text becomes "Swapping [Name] — tap target or cancel" with [Cancel ✕] button
4. **Tap outside valid target:** Cancels swap

### Player Name Column (Sticky Left)

Tapping a player name opens a popover with:
- Player stats (play %, bench count, goalie count)
- "Remove from game" action (destructive, with confirmation dialog)
- "Add back" action (if previously removed)
- Removed players: strikethrough name, dimmed row

## Bottom Bar Details

| Zone | Content |
|------|---------|
| Left | Timer: `5:30 / 25:00` + ▶/⏸ + ↻ reset |
| Center | "Next sub ~3 min" hint (disappears on last rotation of period) |
| Right | Large NEXT button. Shows "NEXT PERIOD" at period boundary, "END GAME" on final rotation |

Top edge: thin progress strip with substitution marker ticks.

## Transitions

### Starting a Game
- Same page, no navigation. Bottom bar animates in from below.
- Grid auto-scrolls to rotation 1. Game status → `in-progress`.

### Advancing Rotations
- Current column border shifts right
- Previous column dims
- If crossing period boundary: elapsed period auto-collapses (brief animation)
- Grid auto-scrolls to keep current column at ~1/3 left position

## Removed

- **`/games/:gameId/live` route** — deleted entirely (GameDay.tsx removed)
- **Card view toggle** — removed for live mode. Grid is the only view.

## Bug Fix

Timer shows `NaN:NaN / 25:00` before first start. Fix to show `0:00 / 25:00`.

## Scope Boundaries

- iPad-optimized (not phone). Phone-specific layout is a separate future concern.
- No changes to the solver, domain model, or state management patterns.
- Setup mode and completed mode behavior unchanged (except card view removal).

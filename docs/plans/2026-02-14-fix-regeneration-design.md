# Fix Rotation Regeneration

## Problem

The "Regenerate" button on the rotation grid navigates to `/games/new`, creating a new Game entity. This pollutes game history with duplicate/abandoned games. Regeneration should update the current game's schedule in-place.

## Solution

### In-place re-solve (primary action)

The "Regenerate" button on `RotationGrid` calls `useSolver.solve()` with the existing game's settings (roster, config, absent players, goalie assignments), then dispatches `SET_GAME_SCHEDULE` on the same game ID. No navigation, no new game. Shows inline progress while solving.

### Settings sheet (secondary action)

A secondary button opens a Sheet/Drawer on the rotation grid with:

- Absent player toggles (checkboxes)
- Goalie assignment selects

Editing these dispatches `UPDATE_GAME` to persist changes, then re-solves. The sheet closes and the grid updates with the new schedule.

## Components affected

- `RotationGrid.tsx` — Add `useSolver()`, replace navigate-to-new with in-place solve, add settings Sheet with absent/goalie controls
- No new routes, no changes to `GameSetup.tsx` or `AppContext.tsx`

## Existing infrastructure used

- `useSolver()` hook — already supports the solve/progress/result pattern
- `SET_GAME_SCHEDULE` action — already updates schedule on existing game
- `UPDATE_GAME` action — already replaces game object (for absent/goalie changes)

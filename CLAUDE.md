# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

BenchAssist is a PWA for managing player rotations in team sports (soccer). Coaches use it to create fair rotation schedules that balance playing time across players while respecting constraints like goalie assignments, skill balance, and minimum play time.

## Commands

- `pnpm dev` — start Vite dev server with HMR
- `pnpm build` — type-check with `tsc -b` then bundle with Vite
- `pnpm test` — run Vitest in watch mode
- `pnpm test:run` — run Vitest once (CI mode)
- `pnpm lint` — run ESLint
- Run a single test file: `pnpm vitest run src/utils/stats.test.ts`

## Architecture

**Stack:** React 19 + TypeScript + Vite 7, Tailwind CSS v4, shadcn/ui (new-york style), React Router v7, Immer for state updates, Vitest + Testing Library + fishery factories for tests.

**Path alias:** `@/` maps to `src/`.

### State Management

All app state lives in `src/context/AppContext.tsx` — a single `useReducer` + Immer pattern. State shape is `{ teams: Record<TeamId, Team>, games: Record<GameId, Game> }`. The reducer handles all mutations (team/roster/player/game CRUD, schedule updates, rotation advancement). State auto-persists to localStorage under key `benchassist_data` via `src/storage/localStorage.ts`.

### Domain Model (`src/types/domain.ts`)

- **Team** → has **Roster[]** (player lists) and **GameConfig[]** (format presets)
- **Roster** → has **Player[]** (name, skillRanking 1-5, canPlayGoalie, positions)
- **GameConfig** → defines field size, periods, rotations per period, constraint rules (no consecutive bench, min play time, goalie rest, skill balance priority)
- **Game** → references a team, roster, and config. Tracks absent players, goalie assignments, manual overrides, the generated RotationSchedule, and live game state (currentRotationIndex)

### Rotation Solver (Web Worker)

The solver runs in a Web Worker (`src/workers/rotation-solver.worker.ts`) to avoid blocking the UI. Communication uses typed `SolverRequest`/`SolverResponse` messages (`src/types/solver.ts`).

The core algorithm (`src/workers/solver/exhaustive.ts`) uses exhaustive search with pruning:
1. Calculate bench counts per player (weighted by inverse skill ranking)
2. Generate valid bench patterns per player respecting constraints (goalie periods, manual overrides, max consecutive bench)
3. Search all combinations, pruning when bench slot counts exceed capacity
4. Score solutions by team strength variance (lower = more balanced)
5. Build the final RotationSchedule from the best combination

The `useSolver` hook (`src/hooks/useSolver.ts`) manages the worker lifecycle, providing `solve`/`cancel`/`reset` + progress/result/error state.

### Routing (`src/App.tsx`)

All routes are nested inside `AppShell` (layout with navigation):
- `/` — Dashboard
- `/teams/:teamId` — Team management
- `/teams/:teamId/rosters/:rosterId` — Roster editor
- `/games/new` — Game setup
- `/games/:gameId/rotations` — Rotation grid (view/edit schedule)
- `/games/:gameId/live` — Game day (live rotation tracking)
- `/games` — Game history

### Testing

Tests use Vitest with jsdom, setup in `src/test/setup.ts`. Factory functions in `src/test/factories.ts` use fishery — call `playerFactory.build()`, `gameConfigFactory.build()`, `buildRoster(count)`, `buildSchedule(rotations, players)` etc. Factories auto-reset sequences between tests.

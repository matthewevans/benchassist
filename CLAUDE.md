# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

BenchAssist is a PWA for managing player rotations in team sports (soccer). Coaches use it to create fair rotation schedules that balance playing time across players while respecting constraints like goalie assignments, skill balance, and minimum play time. Client-only — no backend, no API layer. All data lives in localStorage.

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

All app state lives in `src/context/AppContext.tsx` — a single `useReducer` + Immer pattern. State shape is `{ teams: Record<TeamId, Team>, games: Record<GameId, Game> }`. The reducer handles all mutations via a discriminated union `AppAction` with exhaustive `never` check. State auto-persists to localStorage (key `benchassist_data`, 500ms debounce) via `src/storage/localStorage.ts`.

**Adding new state mutations:** Define a new action type in the `AppAction` union, add a case in `appReducer` using `produce()` from Immer for immutable updates, and dispatch from components via `const { state, dispatch } = useAppContext()`.

### Domain Model (`src/types/domain.ts`)

- **Team** → has **Roster[]** (player lists) and **GameConfig[]** (format presets)
- **Roster** → has **Player[]** (name, skillRanking 1-5, canPlayGoalie, positions)
- **GameConfig** → defines field size, periods, rotations per period, constraint rules (no consecutive bench, min play time, goalie rest, skill balance priority)
- **Game** → references a team, roster, and config. Tracks absent players, goalie assignments, manual overrides, the generated RotationSchedule, and live game state (currentRotationIndex)

Entity IDs (`TeamId`, `PlayerId`, etc.) are string type aliases generated via `uuid` v4 in `src/utils/id.ts`.

### Field Position System

4 broad positions (GK, DEF, MID, FWD) map to 14 sub-positions (LB, CB, RB, LCB, RCB, LM, CM, RM, LCM, RCM, LW, RW, ST, CF). Formations are defined as `FormationSlot[]` (position + count). `src/utils/positions.ts` handles sub-position derivation, auto-assignment of field players to formation slots (two-pass: match primary position first, fill remaining), and display formatting with position-specific colors (DEF=purple, MID=green, FWD=orange).

### Rotation Solver (Web Worker)

The solver runs in a Web Worker (`src/workers/rotation-solver.worker.ts`) to avoid blocking the UI. Communication uses typed `SolverRequest`/`SolverResponse` messages (`src/types/solver.ts`).

The core algorithm (`src/workers/solver/exhaustive.ts`) uses exhaustive search with pruning:

1. Calculate bench counts per player (weighted by inverse skill ranking)
2. Generate valid bench patterns per player respecting constraints (goalie periods, manual overrides, max consecutive bench)
3. Search all combinations, pruning when bench slot counts exceed capacity
4. Score solutions by team strength variance (lower = more balanced)
5. Build the final RotationSchedule from the best combination

The `useSolver` hook (`src/hooks/useSolver.ts`) manages the worker lifecycle, providing `solve`/`cancel`/`reset` + progress/result/error state. Supports mid-game re-solve via `startFromRotation` + `existingRotations` params, merged with `mergeSchedules()`.

### Routing (`src/App.tsx`)

All routes are nested inside `AppShell` (layout with navigation):

- `/` — Dashboard (team/game management, export/import)
- `/teams/:teamId` — Team management (rosters, configs)
- `/teams/:teamId/rosters/:rosterId` — Roster editor (bulk import, positions)
- `/games/new` — Game setup (config, roster, absent players, goalie assignments)
- `/games/:gameId/rotations` — Rotation grid (view/edit schedule, swap players)
- `/games/:gameId/live` — Game day (live timer, substitutions, player removal/addition)
- `/games` — Game history

### Key Utilities (`src/utils/`)

- **stats.ts** — Player stats calculation, rotation strength scoring, `previewSwap()` for immutable swap operations with field position handling
- **validation.ts** — Schedule validation (field size, goalie counts, consecutive bench, min play time)
- **positions.ts** — Sub-position mapping, auto-assign to formation slots, display formatting
- **parsePlayerImport.ts** — Parse bulk player imports (format: `Name: Skill`)

### Testing

Tests use Vitest with `globals: true` (no need to import `describe`/`it`/`expect`), jsdom environment, setup in `src/test/setup.ts`. Factory functions in `src/test/factories.ts` use fishery — call `playerFactory.build()`, `gameConfigFactory.build()`, `buildRoster(count)`, `buildSchedule(rotations, players)` etc. Factories auto-reset sequences between tests.

## Conventions

- **Imports:** Direct path imports (e.g., `@/components/ui/button`), no barrel files.
- **UI components:** shadcn/ui in `src/components/ui/` using CVA for variants and Radix primitives. `cn()` from `src/lib/utils.ts` for className merging.
- **Styling:** Tailwind v4 with OKLch CSS variables defined in `src/index.css` via `@theme inline`. Dark mode via `.dark` class. Semantic color tokens (background, foreground, primary, destructive, etc.).
- **Forms:** Manual `useState` per field, no form library. Validation in save handlers.
- **TypeScript:** Strict mode with `noUnusedLocals` and `noUnusedParameters`. ESLint FlatConfig with React Hooks + React Refresh rules.
- **PWA:** vite-plugin-pwa with `registerType: 'autoUpdate'`, standalone display, green theme.

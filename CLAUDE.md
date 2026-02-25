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
- `pnpm typecheck` — type-check only (`tsc -b --noEmit`)
- `pnpm format` / `pnpm format:check` — Prettier (singleQuote, trailingComma: all, printWidth: 100)
- Run a single test file: `pnpm vitest run src/utils/stats.test.ts`

**Pre-commit hook (Husky):** Runs `pnpm typecheck && npx lint-staged`. lint-staged runs `eslint --fix` + `prettier --write` on `.ts/.tsx` and `prettier --write` on `.json/.md/.css`. Commits will fail on type errors or unfixable lint violations.

## Architecture

**Stack:** React 19 + TypeScript + Vite 7, Tailwind CSS v4, shadcn/ui (new-york style), React Router v7, Immer for state updates, i18next for localization, Vitest + Testing Library + fishery factories for tests.

**Path alias:** `@/` maps to `src/`.

### State Management

All app state lives in `src/context/AppContext.tsx` — a single `useReducer` + Immer pattern. State shape is `{ teams: Record<TeamId, Team>, games: Record<GameId, Game>, favoriteDrillIds: string[] }`. The reducer handles all mutations via a discriminated union `AppAction` with exhaustive `never` check. State auto-persists to localStorage (key `benchassist_data`, 500ms debounce) via `src/storage/localStorage.ts`.

**Adding new state mutations:** Define a new action type in the `AppAction` union, add a case in `appReducer` using `produce()` from Immer for immutable updates, and dispatch from components via `const { state, dispatch } = useAppContext()`.

**Undo system:** `useUndoReducer` (`src/hooks/useUndoReducer.ts`) wraps the app reducer and intercepts destructive actions (`DELETE_TEAM`, `DELETE_ROSTER`, `DELETE_PLAYER`, `DELETE_GAME`, `DELETE_GAME_CONFIG`, `IMPORT_DATA`, `MERGE_DATA`). It uses Immer's `produceWithPatches` to capture inverse patches, storing them on a ref-based stack (max 30 entries). `useUndoToast` (`src/hooks/useUndoToast.ts`) is the component-facing API — wraps dispatch and shows a sonner toast with an 8-second "Undo" button after any undoable action. `enablePatches()` is called at module load in `AppContext.tsx`.

### Domain Model (`src/types/domain.ts`)

- **Team** → has **Roster[]** (player lists) and **GameConfig[]** (format presets)
- **Roster** → has **Player[]** (name, skillRanking 1-5, canPlayGoalie, positions)
- **GameConfig** → defines field size, periods, rotations per period, constraint rules (no consecutive bench, min play time, goalie rest, skillBalance boolean)
- **Game** → references a team, roster, and config. Tracks absent players, goalie assignments, manual overrides (with `lockMode`: hard/soft), the generated RotationSchedule, period divisions, optimization suggestions, and live game state (currentRotationIndex, removedPlayerIds, addedPlayerIds)

Entity IDs (`TeamId`, `PlayerId`, etc.) are string type aliases generated via `uuid` v4 in `src/utils/id.ts`.

**Key Game fields:**

- `periodDivisions: number[]` — per-period rotation counts (defaults from config, adjustable via period redivision)
- `optimizationSuggestion` — post-solve suggestion for better period divisions (set by solver worker)
- `manualOverrides` — each override has a `lockMode: 'hard' | 'soft'` controlling how strictly it's honored during re-solve

### Field Position System

4 broad positions (GK, DEF, MID, FWD) map to 14 sub-positions (LB, CB, RB, LCB, RCB, LM, CM, RM, LCM, RCM, LW, RW, ST, CF). Formations are defined as `FormationSlot[]` (position + count). `src/utils/positions.ts` handles sub-position derivation, auto-assignment of field players to formation slots (two-pass: match primary position first, fill remaining), and display formatting with position-specific colors (DEF=purple, MID=green, FWD=orange).

### Rotation Solver (Web Worker)

The solver runs in a Web Worker (`src/workers/rotation-solver.worker.ts`) to avoid blocking the UI. Communication uses typed `SolverRequest`/`SolverResponse` messages (`src/types/solver.ts`). The worker terminates after each solve and re-creates on next call (HiGHS WASM heap corruption workaround).

**Two-tier solving approach:**

1. **MIP solver** (`src/workers/solver/mipSolver.ts`): Uses HiGHS WASM (`highs` npm package) for initial bench assignment. `constraintPreparation.ts` prepares the constraint context, `mipModelBuilder.ts` builds the LP model, `mipSolutionExtractor.ts` reads the solution, and `mipErrorMapper.ts` maps solver errors to user-friendly messages.
2. **Exhaustive search** (`src/workers/solver/exhaustive.ts`): Refines the MIP solution with position optimization, scoring by team-strength variance (lower = more balanced).

**Post-solve optimization** (`src/workers/solver/optimizationCheck.ts`): After solving, checks if adjusting period divisions (e.g., adding a rotation to a period) could improve the play-percentage gap by ≥5pp. If so, attaches an `OptimizationSuggestion` to the solver response.

**Constraint relaxation:** When `allowConstraintRelaxation` is set (live regenerate), the solver falls back on infeasible solves — relaxing no-consecutive-bench first, then min-play-time.

The `useSolver` hook (`src/hooks/useSolver.ts`) manages the worker lifecycle, providing `solve`/`cancel`/`reset` + progress/result/error state. Supports mid-game re-solve via `startFromRotation` + `existingRotations` params, merged with `mergeSchedules()`.

### Coach Plan / Direct Entry

Route: `/games/:gameId/direct-entry`. Page component: `DirectEntry.tsx`, matrix component: `DirectEntryMatrix.tsx`.

Allows coaches to manually build rotation plans by filling a matrix grid (rotations × player slots). Each cell assignment can be locked:

- **Hard lock** — constraint must be satisfied during solve/re-solve
- **Soft lock** — preferred but can be relaxed during optimization

Types and utilities in `src/utils/directEntry.ts` (`DirectEntrySlot`, `DirectEntryDraft`, `DirectEntryCell`).

### Playtime Optimization

When the solver detects that adjusting period divisions could improve play-time balance:

- `PlaytimeOptimizeBanner.tsx` displays a suggestion banner on the rotation grid
- `OptimizeDivisionsSheet.tsx` shows optimization options grouped by added rotations with live feasibility checking
- `divisionOptimizer.ts` generates balanced division candidates and evaluates theoretical play-percentage distributions
- `APPLY_OPTIMIZED_SCHEDULE` action applies the chosen division change + re-solved schedule

### Period Redivision

`src/utils/rotationDivision.ts` with `redivideSchedulePeriod()` — dynamically adjusts rotations within a period (e.g., 2→3 rotations). Expanding proportionally clones rotations; contracting merges equivalent ones. In live mode, only future periods can be redivided (past/current locked). `PeriodDivisionSheet.tsx` provides the UI.

### Routing (`src/App.tsx`)

All page components are lazy-loaded via `React.lazy()`. A `Welcome` gate shows for first-run users (no data and not previously welcomed). All routes are nested inside `AppShell` (layout with navigation):

- `/` — Dashboard (team list and creation)
- `/teams/:teamId` — Team management (rosters, configs)
- `/teams/:teamId/rosters/:rosterId` — Roster editor (bulk import, positions)
- `/games/new` — Game setup (config, roster, absent players, goalie assignments)
- `/games/:gameId/direct-entry` — Coach Plan (manual rotation matrix entry)
- `/games/:gameId/rotations` — Rotation grid + live game (handles setup, live, and completed modes based on `game.status`)
- `/games/:gameId/live` — Redirects to `../rotations`
- `/games` — Game history
- `/practice` — Practice planner (drill library, age-based plans)
- `/settings` — Appearance (theme, locale), export/import, PWA update check
- `/help` — Help & FAQ

### Internationalization (i18n)

`src/i18n/config.ts` configures i18next with react-i18next. Locales: `en` (English), `es-MX` (Spanish). Namespaces: `common`, `game`, `roster`, `practice`, `settings`, `faq`. Locale stored in localStorage (key `benchassist_locale`), auto-detected from browser on first visit. Use `const { t } = useTranslation('namespace')` in components.

### Practice Planner

Drill library in `src/data/drills.ts` with age-bracket matching via `getDrillBracket(birthYear)` (U6–U18). `generatePracticePlan()` (`src/utils/practiceGenerator.ts`) creates seeded plans based on selected categories, player count, and target duration. `usePracticePlan` hook manages all state, persisting inputs to `sessionStorage` (key `practice_plan_state`, 300ms debounce). Users can swap individual drills and favorite them (`TOGGLE_FAVORITE_DRILL` action, stored in `favoriteDrillIds`). Drill diagrams rendered via `DrillDiagram.tsx` with a parser in `src/utils/diagramParser.ts`. Accepts `?team=<teamId>` query param to pre-fill birth year and player count.

### Live Game

Game status lifecycle: `setup` → `in-progress` → `completed`. The rotation grid page (`RotationGrid.tsx`) handles all modes — live mode shows a focus view (side-by-side Now/Next rotation cards) or full grid, toggled by the user.

**Period timer** (`usePeriodTimer`): Timer state (`periodTimerStartedAt`, `periodTimerPausedElapsed`) is stored on the `Game` domain object, surviving page refresh. Audio alert (Web Audio API, 800Hz sine) fires when elapsed crosses a substitution marker. Timer auto-resets on period boundary via `ADVANCE_ROTATION`.

**Mid-game changes:** Removing or adding a player dispatches an action then triggers an immediate re-solve from `currentRotationIndex` with existing rotations preserved. Guard prevents removal below `fieldSize` players.

**Live regenerate:** `LiveRegenerateLockPolicySheet.tsx` offers 3 lock policies for how manual overrides are handled during re-solve: `off` (ignore all), `hard-only` (honor hard locks), `hard+soft` (honor both with fallback relaxation). `RegeneratePreviewSheet.tsx` shows a diff of changed cells before confirming. Fallback order on infeasible: relax no-consecutive-bench first, then min-play-time.

### Export/Import & Schema Migration

Export (`src/storage/exportImport.ts`): `filterStorageData()` strips data by per-team selections (rosters/configs/history), then `downloadJSON()` wraps it with `{ app: 'benchassist', version, exportedAt, data }`. Import validates the `app` field and runs `normalizeImportedData()` through the same migration pipeline as `loadData()`. Two import modes: **Import Selected** dispatches `MERGE_DATA` (merges by id, deduplicates), **Replace All** dispatches `IMPORT_DATA` (full overwrite). Both are undoable.

**Schema versioning** (`src/storage/localStorage.ts`): `CURRENT_VERSION = 6`. `migrateData()` applies incremental steps (v1→v2: adds `gender: 'coed'`; v2→v3: adds `birthYear: null`; v3→v4: converts `balancePriority` to `skillBalance` boolean; v4→v5: adds `periodDivisions` to games; v5→v6: adds `lockMode` to manual overrides). Both `loadData()` and import run migrations.

### Key Utilities (`src/utils/`)

- **stats.ts** — Player stats calculation, rotation strength scoring, `previewSwap()` for immutable swap operations with field position handling
- **validation.ts** — Schedule validation (field size, goalie counts, consecutive bench, min play time)
- **positions.ts** — Sub-position mapping, auto-assign to formation slots, display formatting
- **divisionOptimizer.ts** — Generates balanced period-division candidates and evaluates theoretical play-percentage distributions
- **rotationDivision.ts** — Period redivision logic (expand/contract rotations within a period)
- **rotationLayout.ts** — Layout helpers (period offsets, ranges, rotation→period mapping)
- **directEntry.ts** — Types and utilities for coach plan direct-entry matrix
- **playPercentageOutliers.ts** — Identifies high-play outliers using MAD (median absolute deviation)
- **parsePlayerImport.ts** — Parse bulk player imports (format: `Name: Skill`)
- **practiceGenerator.ts** — Seeded practice plan generation from drill library
- **diagramParser.ts** — Parses drill diagram DSL into renderable SVG elements
- **age.ts** — Age/birth year utilities
- **gameConfig.ts** — Game config helpers

### Solver Internals (`src/workers/solver/`)

- **constraintPreparation.ts** — Prepares solver constraint context from game config + player data
- **mipSolver.ts** — HiGHS WASM integration, singleton lifecycle, solve orchestration
- **mipModelBuilder.ts** — Builds LP/MIP model from prepared constraints
- **mipSolutionExtractor.ts** — Extracts bench sets from HiGHS solution
- **mipErrorMapper.ts** — Maps HiGHS error codes to user-friendly messages
- **exhaustive.ts** — Exhaustive search with pruning for position optimization
- **optimizationCheck.ts** — Post-solve analysis for period redivision opportunities
- **position-planner.ts** — Position assignment planning logic

### Testing

Tests use Vitest with `globals: true` (no need to import `describe`/`it`/`expect`), jsdom environment, setup in `src/test/setup.ts`. Factory functions in `src/test/factories.ts` use fishery — call `playerFactory.build()`, `gameConfigFactory.build()`, `buildRoster(count)`, `buildSchedule(rotations, players)` etc. Factories auto-reset sequences between tests.

## Conventions

- **Imports:** Direct path imports (e.g., `@/components/ui/button`), no barrel files.
- **UI components:** shadcn/ui in `src/components/ui/` using CVA for variants and Radix primitives. `cn()` from `src/lib/utils.ts` for className merging. Custom (non-shadcn) UI components: `bottom-sheet.tsx` (vaul drawer), `ios-alert.tsx`, `swipeable-row.tsx`, `grouped-list.tsx`.
- **Responsive layout:** `AppShell` renders `Sidebar` (visible `lg+` / ≥1024px) and `TabBar` (visible below `lg`). `LiveGameBar` sits above the tab bar when a game is in-progress. `NavBar` is the per-page top bar with back navigation.
- **Styling:** Tailwind v4 with OKLch CSS variables defined in `src/index.css` via `@theme inline`. Dark mode via `.dark` class. Semantic color tokens (background, foreground, primary, destructive, etc.).
- **Forms:** Manual `useState` per field, no form library. Validation in save handlers.
- **i18n:** All user-facing strings go through `t()` from `useTranslation()`. Namespace per feature area (common, game, roster, practice, settings, faq). JSON translation files in `src/i18n/locales/{locale}/`.
- **Lazy loading:** All page components use `React.lazy()` with dynamic imports in `App.tsx`.
- **TypeScript:** Strict mode with `noUnusedLocals` and `noUnusedParameters`. ESLint FlatConfig with React Hooks + React Refresh rules.
- **PWA:** vite-plugin-pwa with `registerType: 'autoUpdate'`, standalone display, green theme.
- **Build/deploy:** Base URL is `/` (custom domain `benchassist.app`). `__BUILD_HASH__` global injected from `git rev-parse --short HEAD` at build time (typed in `src/globals.d.ts`).
- **TypeScript imports:** `allowImportingTsExtensions: true` in tsconfig — imports use `.ts`/`.tsx` extensions. `verbatimModuleSyntax: true` enforces `import type` for type-only imports. Test files are excluded from `tsconfig.app.json`.

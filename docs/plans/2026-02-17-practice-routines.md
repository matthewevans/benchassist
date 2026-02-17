# Practice Routines Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a practice planning feature with a curated drill library, reactive plan generation, and favorites.

**Architecture:** Static drill data ships with the app (no API). A `practiceGenerator` utility picks drills based on age bracket, player count, categories, and duration. A single `/practice` page provides both browse and auto-generate modes. Favorites stored in AppState for export/import support. Teams store `birthYear` as source of truth; drill age brackets are derived via utility functions.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Vitest + Testing Library, Immer, fishery factories.

---

### Task 1: Add birthYear to Team and create age utility functions

**Files:**

- Modify: `src/types/domain.ts` (add birthYear to Team interface)
- Create: `src/utils/age.ts` (age derivation utilities)
- Create: `src/utils/age.test.ts` (tests)
- Modify: `src/test/factories.ts` (add birthYear to teamFactory)

**Step 1: Add birthYear to Team interface**

In `src/types/domain.ts`, in the Team interface (after `gender: TeamGender;` on line 126), add:

```typescript
birthYear: number | null;
```

**Step 2: Update teamFactory**

In `src/test/factories.ts`, add `birthYear: null,` to the teamFactory builder (after `gender: 'coed',`).

**Step 3: Write failing tests for age utilities**

Create `src/utils/age.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getUAge, getDrillBracket, birthYearToDisplay, DRILL_BRACKETS } from '@/utils/age.ts';

describe('getUAge', () => {
  it('returns current year minus birth year', () => {
    const currentYear = new Date().getFullYear();
    expect(getUAge(currentYear - 9)).toBe(9);
    expect(getUAge(currentYear - 6)).toBe(6);
  });
});

describe('getDrillBracket', () => {
  const currentYear = new Date().getFullYear();

  it('maps age 5-6 to U6', () => {
    expect(getDrillBracket(currentYear - 5)).toBe('U6');
    expect(getDrillBracket(currentYear - 6)).toBe('U6');
  });

  it('maps age 7-8 to U8', () => {
    expect(getDrillBracket(currentYear - 7)).toBe('U8');
    expect(getDrillBracket(currentYear - 8)).toBe('U8');
  });

  it('maps age 9-10 to U10', () => {
    expect(getDrillBracket(currentYear - 9)).toBe('U10');
    expect(getDrillBracket(currentYear - 10)).toBe('U10');
  });

  it('maps age 11-12 to U12', () => {
    expect(getDrillBracket(currentYear - 11)).toBe('U12');
    expect(getDrillBracket(currentYear - 12)).toBe('U12');
  });

  it('maps age 13-14 to U14', () => {
    expect(getDrillBracket(currentYear - 13)).toBe('U14');
    expect(getDrillBracket(currentYear - 14)).toBe('U14');
  });

  it('maps age 15-16 to U16', () => {
    expect(getDrillBracket(currentYear - 15)).toBe('U16');
    expect(getDrillBracket(currentYear - 16)).toBe('U16');
  });

  it('maps age 17+ to U18', () => {
    expect(getDrillBracket(currentYear - 17)).toBe('U18');
    expect(getDrillBracket(currentYear - 19)).toBe('U18');
  });

  it('maps age 4 or less to U6', () => {
    expect(getDrillBracket(currentYear - 4)).toBe('U6');
  });
});

describe('birthYearToDisplay', () => {
  it('returns formatted string with birth year and U-age', () => {
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 9;
    expect(birthYearToDisplay(birthYear)).toBe(`${birthYear} (U9)`);
  });
});

describe('DRILL_BRACKETS', () => {
  it('has all expected brackets', () => {
    expect(DRILL_BRACKETS).toEqual(['U6', 'U8', 'U10', 'U12', 'U14', 'U16', 'U18']);
  });
});
```

**Step 4: Run tests to verify they fail**

Run: `pnpm vitest run src/utils/age.test.ts`
Expected: FAIL (module doesn't exist yet)

**Step 5: Implement age utilities**

Create `src/utils/age.ts`:

```typescript
export type DrillAgeGroup = 'U6' | 'U8' | 'U10' | 'U12' | 'U14' | 'U16' | 'U18';

export const DRILL_BRACKETS: DrillAgeGroup[] = ['U6', 'U8', 'U10', 'U12', 'U14', 'U16', 'U18'];

export const DRILL_BRACKET_LABELS: Record<DrillAgeGroup, string> = {
  U6: 'U6 (5-6)',
  U8: 'U8 (7-8)',
  U10: 'U10 (9-10)',
  U12: 'U12 (11-12)',
  U14: 'U14 (13-14)',
  U16: 'U16 (15-16)',
  U18: 'U18 (17-18)',
};

export function getUAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

export function getDrillBracket(birthYear: number): DrillAgeGroup {
  const age = getUAge(birthYear);
  if (age <= 6) return 'U6';
  if (age <= 8) return 'U8';
  if (age <= 10) return 'U10';
  if (age <= 12) return 'U12';
  if (age <= 14) return 'U14';
  if (age <= 16) return 'U16';
  return 'U18';
}

export function birthYearToDisplay(birthYear: number): string {
  const uAge = getUAge(birthYear);
  return `${birthYear} (U${uAge})`;
}

export function uAgeToBirthYear(uAge: number): number {
  return new Date().getFullYear() - uAge;
}
```

**Step 6: Run tests to verify they pass**

Run: `pnpm vitest run src/utils/age.test.ts`
Expected: PASS

**Step 7: Run all existing tests**

Run: `pnpm test:run`
Expected: All pass (birthYear defaults to null in factory)

**Step 8: Commit**

```bash
git add src/types/domain.ts src/utils/age.ts src/utils/age.test.ts src/test/factories.ts
git commit -m "feat: add birthYear to Team and age derivation utilities"
```

---

### Task 2: Storage migration for birthYear (v2→v3)

**Files:**

- Modify: `src/storage/localStorage.ts` (bump version, add v2→v3 migration)
- Create: `src/storage/localStorage.test.ts`

**Step 1: Write the failing test**

Create `src/storage/localStorage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { loadData } from '@/storage/localStorage.ts';

describe('localStorage migration v2→v3', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates v2 data to v3 by adding birthYear to teams', () => {
    const v2Data = {
      version: 2,
      teams: {
        t1: {
          id: 't1',
          name: 'Thunder 2017',
          gender: 'coed',
          rosters: [],
          gameConfigs: [
            {
              fieldSize: 7,
              id: 'c1',
              teamId: 't1',
              name: '7v7',
              periods: 2,
              periodDurationMinutes: 30,
              rotationsPerPeriod: 2,
              usePositions: false,
              formation: [],
              useGoalie: true,
              noConsecutiveBench: true,
              maxConsecutiveBench: 1,
              enforceMinPlayTime: true,
              minPlayPercentage: 50,
              goaliePlayFullPeriod: true,
              goalieRestAfterPeriod: true,
              balancePriority: 'balanced',
              createdAt: 1000,
              updatedAt: 1000,
            },
          ],
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
      games: {},
    };
    localStorage.setItem('benchassist_data', JSON.stringify(v2Data));

    const result = loadData();
    expect(result).not.toBeNull();
    expect(result!.version).toBe(3);
    expect(result!.teams['t1'].birthYear).toBeNull();
  });

  it('sets birthYear to null for all teams (no auto-inference)', () => {
    const v2Data = {
      version: 2,
      teams: {
        t1: {
          id: 't1',
          name: 'Team A',
          gender: 'boys',
          rosters: [],
          gameConfigs: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
      games: {},
    };
    localStorage.setItem('benchassist_data', JSON.stringify(v2Data));

    const result = loadData();
    expect(result!.teams['t1'].birthYear).toBeNull();
  });

  it('preserves existing v3 data with birthYear', () => {
    const v3Data = {
      version: 3,
      teams: {
        t1: {
          id: 't1',
          name: 'Team A',
          gender: 'coed',
          birthYear: 2017,
          rosters: [],
          gameConfigs: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
      games: {},
    };
    localStorage.setItem('benchassist_data', JSON.stringify(v3Data));

    const result = loadData();
    expect(result!.teams['t1'].birthYear).toBe(2017);
  });
});
```

Note: We do NOT auto-infer birthYear from fieldSize — fieldSize doesn't reliably indicate birth year. We set it to `null` and let the coach fill it in.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/storage/localStorage.test.ts`
Expected: FAIL

**Step 3: Implement the migration**

In `src/storage/localStorage.ts`:

1. Change `CURRENT_VERSION` from `2` to `3`.
2. Update `PreMigrationTeam` to include `birthYear?`:

```typescript
type PreMigrationTeam = Omit<Team, 'gender' | 'birthYear'> & {
  gender?: Team['gender'];
  birthYear?: Team['birthYear'];
};
```

3. Add v2→v3 migration block after the v1→v2 block:

```typescript
if (migrated.version === 2) {
  const teams: Record<string, Team> = {};
  for (const [id, team] of Object.entries(migrated.teams as Record<string, PreMigrationTeam>)) {
    teams[id] = {
      ...team,
      gender: team.gender ?? 'coed',
      birthYear: team.birthYear ?? null,
    } as Team;
  }
  migrated = { ...migrated, version: 3, teams };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/storage/localStorage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/storage/localStorage.ts src/storage/localStorage.test.ts
git commit -m "feat: add v2→v3 migration for team birthYear"
```

---

### Task 3: Add favoriteDrillIds to AppState and new reducer actions

**Files:**

- Modify: `src/context/AppContext.tsx` (AppState, INITIAL_STATE, AppAction, reducer, save/load)
- Create: `src/context/AppContext.test.ts`
- Modify: `src/storage/localStorage.ts` (add favoriteDrillIds to StorageData)

**Step 1: Write failing tests**

Create `src/context/AppContext.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { appReducer, type AppState } from '@/context/AppContext.tsx';

const emptyState: AppState = {
  teams: {},
  games: {},
  favoriteDrillIds: [],
};

describe('appReducer - TOGGLE_FAVORITE_DRILL', () => {
  it('adds a drill to favorites', () => {
    const result = appReducer(emptyState, {
      type: 'TOGGLE_FAVORITE_DRILL',
      payload: 'drill-1',
    });
    expect(result.favoriteDrillIds).toEqual(['drill-1']);
  });

  it('removes a drill from favorites when already present', () => {
    const state: AppState = { ...emptyState, favoriteDrillIds: ['drill-1', 'drill-2'] };
    const result = appReducer(state, {
      type: 'TOGGLE_FAVORITE_DRILL',
      payload: 'drill-1',
    });
    expect(result.favoriteDrillIds).toEqual(['drill-2']);
  });
});

describe('appReducer - SET_TEAM_BIRTH_YEAR', () => {
  it('sets birth year on a team', () => {
    const state: AppState = {
      ...emptyState,
      teams: {
        t1: {
          id: 't1',
          name: 'Test',
          gender: 'coed',
          birthYear: null,
          rosters: [],
          gameConfigs: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
    };
    const result = appReducer(state, {
      type: 'SET_TEAM_BIRTH_YEAR',
      payload: { teamId: 't1', birthYear: 2017 },
    });
    expect(result.teams['t1'].birthYear).toBe(2017);
  });

  it('clears birth year when set to null', () => {
    const state: AppState = {
      ...emptyState,
      teams: {
        t1: {
          id: 't1',
          name: 'Test',
          gender: 'coed',
          birthYear: 2017,
          rosters: [],
          gameConfigs: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
    };
    const result = appReducer(state, {
      type: 'SET_TEAM_BIRTH_YEAR',
      payload: { teamId: 't1', birthYear: null },
    });
    expect(result.teams['t1'].birthYear).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/context/AppContext.test.ts`
Expected: FAIL

**Step 3: Implement the changes**

In `src/context/AppContext.tsx`:

1. Add `favoriteDrillIds: string[]` to `AppState` interface and `INITIAL_STATE`:

```typescript
export interface AppState {
  teams: Record<TeamId, Team>;
  games: Record<GameId, Game>;
  favoriteDrillIds: string[];
}

const INITIAL_STATE: AppState = {
  teams: {},
  games: {},
  favoriteDrillIds: [],
};
```

2. Add new actions to `AppAction` union (before the closing semicolons):

```typescript
  | { type: 'TOGGLE_FAVORITE_DRILL'; payload: string }
  | { type: 'SET_TEAM_BIRTH_YEAR'; payload: { teamId: TeamId; birthYear: number | null } }
```

3. Add reducer cases before the `default:` block:

```typescript
      case 'TOGGLE_FAVORITE_DRILL': {
        const idx = draft.favoriteDrillIds.indexOf(action.payload);
        if (idx >= 0) {
          draft.favoriteDrillIds.splice(idx, 1);
        } else {
          draft.favoriteDrillIds.push(action.payload);
        }
        break;
      }

      case 'SET_TEAM_BIRTH_YEAR':
        if (draft.teams[action.payload.teamId]) {
          draft.teams[action.payload.teamId].birthYear = action.payload.birthYear;
          draft.teams[action.payload.teamId].updatedAt = Date.now();
        }
        break;
```

4. Update `AppProvider`:
   - In the `useReducer` initializer, add: `favoriteDrillIds: saved.favoriteDrillIds ?? []`
   - In the `LOAD_DATA`/`IMPORT_DATA` reducer cases, add: `draft.favoriteDrillIds = action.payload.favoriteDrillIds ?? [];`
   - In the `useEffect` save, include `favoriteDrillIds: state.favoriteDrillIds` in the StorageData object.

5. Update `StorageData` in `src/storage/localStorage.ts`:

```typescript
export interface StorageData {
  version: number;
  teams: Record<string, Team>;
  games: Record<string, Game>;
  favoriteDrillIds?: string[];
}
```

**Step 4: Run tests**

Run: `pnpm vitest run src/context/AppContext.test.ts`
Expected: PASS

**Step 5: Run all tests**

Run: `pnpm test:run`
Expected: All pass

**Step 6: Commit**

```bash
git add src/context/AppContext.tsx src/context/AppContext.test.ts src/storage/localStorage.ts
git commit -m "feat: add favoriteDrillIds and SET_TEAM_BIRTH_YEAR to state"
```

---

### Task 4: Create drill types and static drill library

**Files:**

- Create: `src/types/drill.ts`
- Create: `src/data/drills.ts`
- Create: `src/data/drill-progressions.ts`
- Create: `src/data/training-focuses.ts`

**Step 1: Create `src/types/drill.ts`**

```typescript
import type { DrillAgeGroup } from '@/utils/age.ts';

export type DrillId = string;

export type DrillCategory =
  | 'passing'
  | 'dribbling'
  | 'shooting'
  | 'first-touch'
  | 'goalkeeping'
  | 'attacking'
  | 'defending'
  | 'possession'
  | 'transition'
  | 'set-pieces';

export const DRILL_CATEGORY_LABELS: Record<DrillCategory, string> = {
  passing: 'Passing',
  dribbling: 'Dribbling',
  shooting: 'Shooting',
  'first-touch': 'First Touch',
  goalkeeping: 'Goalkeeping',
  attacking: 'Attacking',
  defending: 'Defending',
  possession: 'Possession',
  transition: 'Transition',
  'set-pieces': 'Set Pieces',
};

// Categories appropriate for younger age groups (U6-U10) — technical focus
export const YOUNG_CATEGORIES: DrillCategory[] = [
  'passing',
  'dribbling',
  'shooting',
  'first-touch',
  'goalkeeping',
];

// All categories available for older age groups (U12+)
export const ALL_CATEGORIES: DrillCategory[] = [
  ...YOUNG_CATEGORIES,
  'attacking',
  'defending',
  'possession',
  'transition',
  'set-pieces',
];

export type DrillPhase = 'warm-up' | 'main' | 'scrimmage' | 'cool-down';

export const DRILL_PHASE_LABELS: Record<DrillPhase, string> = {
  'warm-up': 'Warm-up',
  main: 'Main',
  scrimmage: 'Scrimmage',
  'cool-down': 'Cool-down',
};

export interface Drill {
  id: DrillId;
  name: string;
  description: string;
  setup: string;
  coachingTips: string[];
  variations?: string[];
  category: DrillCategory;
  phase: DrillPhase;
  ageGroups: DrillAgeGroup[];
  minPlayers: number;
  durationMinutes: number;
  intensity: 'low' | 'medium' | 'high';
  equipment: string[];
}

export interface DrillProgression {
  id: string;
  name: string;
  drillIds: DrillId[];
}

export interface TrainingFocusTemplate {
  id: string;
  name: string;
  description: string;
  ageGroups: DrillAgeGroup[];
  slots: {
    phase: DrillPhase;
    preferredCategories: DrillCategory[];
    count: number;
  }[];
}

export interface PracticePlan {
  drills: Drill[];
  totalDurationMinutes: number;
}
```

**Step 2: Create drill library data files**

Create `src/data/drills.ts`, `src/data/drill-progressions.ts`, and `src/data/training-focuses.ts`.

**Use agents with web search** to research and compile best-practice youth soccer drills. Target ~60-80 drills:

- ~10 warm-up drills (across age brackets)
- ~40 main drills (spread across all categories and age brackets)
- ~5-8 scrimmage variants
- ~5 cool-down activities

Each drill needs: id (kebab-case string), name, description (2-3 sentences), setup, coachingTips[], variations[]?, category, phase, ageGroups[], minPlayers, durationMinutes, intensity, equipment[].

`src/data/drills.ts` exports `DRILLS: Drill[]`.
`src/data/drill-progressions.ts` exports `DRILL_PROGRESSIONS: DrillProgression[]`.
`src/data/training-focuses.ts` exports `TRAINING_FOCUSES: TrainingFocusTemplate[]`.

Training focus templates:

- Passing Day, Dribbling Day, Shooting Day (all brackets)
- Defense Day, Possession Day, Match Prep (U12+)
- Fitness & Fun (all brackets)

Drill progressions: link 2-4 related drills in learning sequences.

**Step 3: Verify types compile**

Run: `pnpm build`
Expected: Type-check passes

**Step 4: Commit**

```bash
git add src/types/drill.ts src/data/drills.ts src/data/drill-progressions.ts src/data/training-focuses.ts
git commit -m "feat: add drill types and static drill library (~70 drills)"
```

---

### Task 5: Practice plan generator

**Files:**

- Create: `src/utils/practiceGenerator.ts`
- Create: `src/utils/practiceGenerator.test.ts`

**Step 1: Write failing tests**

Create `src/utils/practiceGenerator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generatePracticePlan } from '@/utils/practiceGenerator.ts';
import { DRILLS } from '@/data/drills.ts';
import type { DrillAgeGroup } from '@/utils/age.ts';
import type { DrillCategory } from '@/types/drill.ts';

function makePlan(
  overrides: {
    ageGroup?: DrillAgeGroup;
    playerCount?: number;
    categories?: DrillCategory[];
    targetDurationMinutes?: number;
    favoritesOnly?: boolean;
    favoriteIds?: string[];
    seed?: number;
  } = {},
) {
  return generatePracticePlan({
    drills: DRILLS,
    ageGroup: overrides.ageGroup ?? 'U10',
    playerCount: overrides.playerCount ?? 10,
    categories: overrides.categories ?? ['passing'],
    targetDurationMinutes: overrides.targetDurationMinutes ?? 60,
    favoritesOnly: overrides.favoritesOnly ?? false,
    favoriteIds: overrides.favoriteIds ?? [],
    seed: overrides.seed ?? 42,
  });
}

describe('generatePracticePlan', () => {
  it('returns a plan with drills matching the selected categories', () => {
    const plan = makePlan({ categories: ['passing'] });
    expect(plan.drills.length).toBeGreaterThanOrEqual(3);
    const mainDrills = plan.drills.filter((d) => d.phase === 'main');
    mainDrills.forEach((d) => expect(d.category).toBe('passing'));
  });

  it('filters by player count', () => {
    const plan = makePlan({ playerCount: 4, categories: ['passing', 'dribbling'] });
    plan.drills.forEach((d) => expect(d.minPlayers).toBeLessThanOrEqual(4));
  });

  it('filters by age group', () => {
    const plan = makePlan({ ageGroup: 'U6', categories: ['dribbling'] });
    plan.drills.forEach((d) => expect(d.ageGroups).toContain('U6'));
  });

  it('respects target duration roughly (within ±15 min)', () => {
    const plan = makePlan({ categories: ['passing', 'shooting'], targetDurationMinutes: 60 });
    expect(plan.totalDurationMinutes).toBeGreaterThanOrEqual(45);
    expect(plan.totalDurationMinutes).toBeLessThanOrEqual(75);
  });

  it('includes warm-up, main, and cool-down phases', () => {
    const plan = makePlan();
    const phases = new Set(plan.drills.map((d) => d.phase));
    expect(phases.has('warm-up')).toBe(true);
    expect(phases.has('main')).toBe(true);
    expect(phases.has('cool-down')).toBe(true);
  });

  it('returns same plan for same seed', () => {
    const plan1 = makePlan({ seed: 42 });
    const plan2 = makePlan({ seed: 42 });
    expect(plan1.drills.map((d) => d.id)).toEqual(plan2.drills.map((d) => d.id));
  });

  it('returns different plan for different seed', () => {
    const plan1 = makePlan({ seed: 1, categories: ['passing', 'dribbling'] });
    const plan2 = makePlan({ seed: 2, categories: ['passing', 'dribbling'] });
    expect(plan1.drills.map((d) => d.id)).not.toEqual(plan2.drills.map((d) => d.id));
  });

  it('filters to favorites only when enabled', () => {
    const favIds = DRILLS.filter((d) => d.phase === 'main')
      .slice(0, 3)
      .map((d) => d.id);
    const plan = makePlan({
      categories: ['passing', 'dribbling', 'shooting'],
      favoritesOnly: true,
      favoriteIds: favIds,
    });
    const mainDrills = plan.drills.filter((d) => d.phase === 'main');
    mainDrills.forEach((d) => expect(favIds).toContain(d.id));
  });

  it('returns empty plan when no drills match', () => {
    const plan = generatePracticePlan({
      drills: [],
      ageGroup: 'U10',
      playerCount: 10,
      categories: ['passing'],
      targetDurationMinutes: 60,
      favoritesOnly: false,
      favoriteIds: [],
      seed: 42,
    });
    expect(plan.drills).toEqual([]);
    expect(plan.totalDurationMinutes).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/practiceGenerator.test.ts`
Expected: FAIL

**Step 3: Implement the generator**

Create `src/utils/practiceGenerator.ts`:

```typescript
import type { DrillAgeGroup } from '@/utils/age.ts';
import type { Drill, DrillCategory, DrillPhase, PracticePlan } from '@/types/drill.ts';

export interface PracticeGeneratorOptions {
  drills: Drill[];
  ageGroup: DrillAgeGroup;
  playerCount: number;
  categories: DrillCategory[];
  targetDurationMinutes: number;
  favoritesOnly: boolean;
  favoriteIds: string[];
  seed: number;
}

// Mulberry32 seeded PRNG
function createRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generatePracticePlan(opts: PracticeGeneratorOptions): PracticePlan {
  const {
    ageGroup,
    playerCount,
    categories,
    targetDurationMinutes,
    favoritesOnly,
    favoriteIds,
    seed,
  } = opts;
  const rng = createRng(seed);

  // Filter to eligible drills
  const eligible = opts.drills.filter((d) => {
    if (!d.ageGroups.includes(ageGroup)) return false;
    if (d.minPlayers > playerCount) return false;
    if (favoritesOnly && !favoriteIds.includes(d.id)) return false;
    return true;
  });

  const byPhase = (phase: DrillPhase, cats?: DrillCategory[]) =>
    eligible.filter(
      (d) => d.phase === phase && (!cats || cats.length === 0 || cats.includes(d.category)),
    );

  // Pick warm-up (1, prefer selected categories, fall back to any)
  let warmUps = byPhase('warm-up', categories);
  if (warmUps.length === 0) warmUps = byPhase('warm-up');
  const warmUp = shuffle(warmUps, rng).slice(0, 1);

  // Pick cool-down (1, any category)
  const coolDown = shuffle(byPhase('cool-down'), rng).slice(0, 1);

  // Pick scrimmage (1 if ≥6 players)
  let scrimmages = byPhase('scrimmage', categories);
  if (scrimmages.length === 0) scrimmages = byPhase('scrimmage');
  const scrimmage = playerCount >= 6 ? shuffle(scrimmages, rng).slice(0, 1) : [];

  // Calculate remaining time budget for main drills
  const fixedDuration = [...warmUp, ...coolDown, ...scrimmage].reduce(
    (sum, d) => sum + d.durationMinutes,
    0,
  );
  const mainBudget = Math.max(targetDurationMinutes - fixedDuration, 10);

  // Fill main drills to match budget
  const mainCandidates = shuffle(byPhase('main', categories), rng);
  const mainDrills: Drill[] = [];
  let mainTotal = 0;
  for (const drill of mainCandidates) {
    if (mainTotal + drill.durationMinutes > mainBudget + 5) continue;
    mainDrills.push(drill);
    mainTotal += drill.durationMinutes;
    if (mainTotal >= mainBudget - 5) break;
  }

  const allDrills = [...warmUp, ...mainDrills, ...scrimmage, ...coolDown];
  return {
    drills: allDrills,
    totalDurationMinutes: allDrills.reduce((sum, d) => sum + d.durationMinutes, 0),
  };
}
```

**Step 4: Run tests**

Run: `pnpm vitest run src/utils/practiceGenerator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/practiceGenerator.ts src/utils/practiceGenerator.test.ts
git commit -m "feat: add practice plan generator with seeded PRNG"
```

---

### Task 6: Practice page component

**Files:**

- Create: `src/pages/Practice.tsx`

**Step 1: Build the Practice page**

Create `src/pages/Practice.tsx` following existing page patterns. Key design:

**State:**

```typescript
const [searchParams] = useSearchParams();
const teamId = searchParams.get('team');
const team = teamId ? state.teams[teamId] : undefined;

// Derive initial values from team
const initialBirthYear = team?.birthYear ?? null;
const initialPlayerCount = team ? Math.max(...team.rosters.map((r) => r.players.length), 10) : 10;

const [birthYear, setBirthYear] = useState<number | null>(initialBirthYear);
const [playerCount, setPlayerCount] = useState(initialPlayerCount);
const [selectedCategories, setSelectedCategories] = useState<DrillCategory[]>([]);
const [targetDuration, setTargetDuration] = useState(60);
const [favoritesOnly, setFavoritesOnly] = useState(false);
const [seed, setSeed] = useState(() => Date.now());
```

**Reactive plan generation:**

```typescript
const drillBracket = birthYear ? getDrillBracket(birthYear) : null;

const plan = useMemo(() => {
  if (!drillBracket || selectedCategories.length === 0) return null;
  return generatePracticePlan({
    drills: DRILLS,
    ageGroup: drillBracket,
    playerCount,
    categories: selectedCategories,
    targetDurationMinutes: targetDuration,
    favoritesOnly,
    favoriteIds: state.favoriteDrillIds,
    seed,
  });
}, [
  drillBracket,
  playerCount,
  selectedCategories,
  targetDuration,
  favoritesOnly,
  state.favoriteDrillIds,
  seed,
]);
```

**UI layout:**

1. **Header:** "Practice" title
2. **Birth year input:** Number input (2005-2022 range) with helper text showing "U{age} for {year} season" + a row of quick-select U-age chips (U6-U18) that set the birth year
3. **Player count:** Small number input
4. **Category chips:** Multi-select toggles. Show `YOUNG_CATEGORIES` for U6-U10 brackets, `ALL_CATEGORIES` for U12+. Use the same chip/toggle pattern as the rest of the app.
5. **Duration + Favorites row:** Duration dropdown (30/45/60/75/90 min) + star toggle for favorites-only
6. **Plan output:** When categories are selected, show "Practice Plan · {duration} min" heading + numbered drill cards. When no categories selected, show all matching drills grouped by phase (browse mode).

**Drill cards:**

- Favorite star toggle (dispatch `TOGGLE_FAVORITE_DRILL`)
- Name + category badge (use position color system: `bg-{color}-100 text-{color}-800` for category)
- Duration + min players metadata line
- Description (always visible, 2-3 sentences)
- First coaching tip (always visible)
- Collapsible "More" for setup, remaining tips, variations, equipment
- In plan mode: `[↻]` swap button per drill

**Swap logic:** Locally replace a drill in the plan with another matching drill from the library (same phase, same category, matching age/players, not already in the plan). Track swaps in local state.

**Shuffle All:** `setSeed(Date.now())`

**Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/practice`
Verify: age input works, categories appear, plan generates, swap/shuffle work, favorites toggle.

**Step 3: Commit**

```bash
git add src/pages/Practice.tsx
git commit -m "feat: add Practice page with reactive plan generation"
```

---

### Task 7: Add routing and navigation

**Files:**

- Modify: `src/App.tsx` (add Practice route + import)
- Modify: `src/components/layout/AppShell.tsx` (add Practice nav link)

**Step 1: Add route**

In `src/App.tsx`, add import: `import { Practice } from '@/pages/Practice.tsx';`

Add route inside the `<Route element={<AppShell />}>` block:

```tsx
<Route path="practice" element={<Practice />} />
```

**Step 2: Add nav link**

In `src/components/layout/AppShell.tsx`, update `NAV_ITEMS`:

```typescript
const NAV_ITEMS = [
  { path: '/', label: 'Teams' },
  { path: '/practice', label: 'Practice' },
  { path: '/games', label: 'History' },
];
```

**Step 3: Verify navigation**

Run: `pnpm dev`, click "Practice" in nav bar.

**Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/AppShell.tsx
git commit -m "feat: add Practice route and navigation link"
```

---

### Task 8: Team management — birth year selector + Practice shortcut

**Files:**

- Modify: `src/pages/TeamManagement.tsx` (add birth year input + Practice button)
- Modify: `src/pages/Dashboard.tsx` (show birth year on team cards)

**Step 1: Add birth year input to TeamManagement**

After the Gender selector section (line ~166), add a Birth Year section using an `Input` with type="number":

```tsx
<div className="flex items-center gap-2 text-sm">
  <span className="text-muted-foreground">Birth Year:</span>
  <Input
    type="number"
    min={2005}
    max={new Date().getFullYear()}
    value={team.birthYear ?? ''}
    onChange={(e) => {
      const val = e.target.value ? parseInt(e.target.value, 10) : null;
      dispatch({
        type: 'SET_TEAM_BIRTH_YEAR',
        payload: { teamId: teamId!, birthYear: val },
      });
    }}
    placeholder="e.g., 2017"
    className="w-24 h-8"
  />
  {team.birthYear && <span className="text-muted-foreground">= U{getUAge(team.birthYear)}</span>}
</div>
```

Import `getUAge` from `@/utils/age.ts`.

**Step 2: Add Practice shortcut button**

In the header button group, alongside "New Game":

```tsx
<Link to={`/practice?team=${teamId}`}>
  <Button variant="outline">Practice</Button>
</Link>
```

**Step 3: Show birth year on Dashboard team cards**

In `src/pages/Dashboard.tsx`, in the team card metadata (line ~189), add:

```tsx
{
  team.birthYear && <span>U{getUAge(team.birthYear)}</span>;
}
```

Import `getUAge` from `@/utils/age.ts`.

**Step 4: Verify**

Run: `pnpm dev`

- Set birth year on team management page, see "= U9" helper
- Click Practice shortcut, verify it navigates with pre-filled values
- Dashboard shows U-age badge on team cards

**Step 5: Commit**

```bash
git add src/pages/TeamManagement.tsx src/pages/Dashboard.tsx
git commit -m "feat: add birth year input and Practice shortcut to team management"
```

---

### Task 9: Practice page tests

**Files:**

- Create: `src/pages/Practice.test.tsx`

**Step 1: Write component tests**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext.tsx';
import { Practice } from '@/pages/Practice.tsx';

function renderPractice(route = '/practice') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppProvider>
        <Practice />
      </AppProvider>
    </MemoryRouter>,
  );
}

describe('Practice page', () => {
  it('renders the page heading', () => {
    renderPractice();
    expect(screen.getByText('Practice')).toBeInTheDocument();
  });

  it('shows category chips after entering a birth year', async () => {
    const user = userEvent.setup();
    renderPractice();
    const input = screen.getByPlaceholderText(/birth year/i);
    await user.clear(input);
    await user.type(input, '2016');
    expect(screen.getByText('Passing')).toBeInTheDocument();
    expect(screen.getByText('Dribbling')).toBeInTheDocument();
  });

  it('generates a plan when categories are selected', async () => {
    const user = userEvent.setup();
    renderPractice();
    const input = screen.getByPlaceholderText(/birth year/i);
    await user.clear(input);
    await user.type(input, '2016');
    await user.click(screen.getByText('Passing'));
    expect(screen.getByText(/Practice Plan/)).toBeInTheDocument();
  });

  it('hides tactical categories for young age brackets', async () => {
    const user = userEvent.setup();
    renderPractice();
    // Birth year for U6 bracket (age 5)
    const input = screen.getByPlaceholderText(/birth year/i);
    await user.clear(input);
    await user.type(input, String(new Date().getFullYear() - 5));
    expect(screen.queryByText('Attacking')).not.toBeInTheDocument();
    expect(screen.queryByText('Defending')).not.toBeInTheDocument();
    // But technical categories should be visible
    expect(screen.getByText('Dribbling')).toBeInTheDocument();
  });
});
```

**Step 2: Run tests**

Run: `pnpm vitest run src/pages/Practice.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/Practice.test.tsx
git commit -m "test: add Practice page component tests"
```

---

### Task 10: Final integration — lint, test, build, smoke test

**Step 1: Run lint**

Run: `pnpm lint`
Fix any issues.

**Step 2: Run full test suite**

Run: `pnpm test:run`
All tests must pass.

**Step 3: Run production build**

Run: `pnpm build`
Must succeed with no type errors.

**Step 4: Manual smoke test**

Run: `pnpm dev` and verify:

1. Create a team, set birth year → shows "U{age}" helper
2. Navigate to Practice from team page → pre-fills birth year + player count
3. Select categories → plan auto-generates
4. Swap individual drills with ↻ button
5. Shuffle All regenerates the plan
6. Toggle favorites on drills
7. Enable "Favorites only" → plan uses only favorited drills
8. Change birth year → category availability updates (U8 hides tactical)
9. Change player count → drills filter by minPlayers
10. Export backup → import on fresh browser → favorites preserved
11. Navigate via top nav "Practice" link (no team context) → works standalone

**Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final integration fixes for practice routines"
```

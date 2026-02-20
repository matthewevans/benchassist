# Game Setup Defaults & Position Pre-fill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-populate the most recently used roster + config when a team is selected on New Game, and default `usePositions: true` with idiomatic formations for U8+ configs.

**Architecture:** Two independent changes. Feature 1 is a pure `GameSetup.tsx` change — scan `state.games` for the team's most recent game and auto-select its roster/config IDs (validated they still exist). Feature 2 has two parts: update `GAME_CONFIG_TEMPLATES` in `domain.ts` for GYSA U8+ entries, and update `GameConfigForm` to default positions on for U8+ teams by reading team birthYear from context.

**Tech Stack:** React 19, TypeScript, Vitest, `src/utils/age.ts` (`getUAge`), `src/utils/gameConfig.ts` (add helper), `src/types/domain.ts` (templates).

---

### Task 1: Auto-populate most recent roster + config in GameSetup

**Files:**

- Modify: `src/pages/GameSetup.tsx`

The current `handleSelectTeam` clears `rosterId` and `configId`. We need to instead look at `state.games`, find the most recent game for the selected team (by `createdAt` desc), then check whether that game's `rosterId` and `gameConfigId` still exist on the team. If they do, auto-select them. Otherwise fall back to empty (existing behavior).

**Step 1: Update `handleSelectTeam` in `GameSetup.tsx`**

Find this function (around line 132):

```tsx
function handleSelectTeam(nextTeamId: string) {
  setTeamId(nextTeamId);
  setRosterId('');
  setConfigId('');
  setIsTeamPickerOpen(false);
}
```

Replace with:

```tsx
function handleSelectTeam(nextTeamId: string) {
  setTeamId(nextTeamId);
  setIsTeamPickerOpen(false);

  const team = state.teams[nextTeamId];
  if (!team) {
    setRosterId('');
    setConfigId('');
    return;
  }

  // Find most recent game for this team
  const lastGame = Object.values(state.games)
    .filter((g) => g.teamId === nextTeamId)
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  const rosterExists = lastGame && team.rosters.some((r) => r.id === lastGame.rosterId);
  const configExists = lastGame && team.gameConfigs.some((c) => c.id === lastGame.gameConfigId);

  setRosterId(rosterExists ? lastGame.rosterId : '');
  setConfigId(configExists ? lastGame.gameConfigId : '');
}
```

**Step 2: Verify no type errors**

```bash
pnpm typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/pages/GameSetup.tsx
git commit -m "feat: auto-populate most recent roster and config when selecting a team"
```

---

### Task 2: Add `getDefaultFormation` helper to `gameConfig.ts`

**Files:**

- Modify: `src/utils/gameConfig.ts`

This helper maps field-player count to the most idiomatic formation for that size. It will be used by both the template updates and `GameConfigForm`.

**Step 1: Add the helper to `src/utils/gameConfig.ts`**

Add after the existing `getGysaTemplateForBirthYear` function:

```ts
/**
 * Returns the most idiomatic DEF/MID/FWD formation for a given number of field players
 * (i.e. fieldSize minus GK). Used as the default when usePositions is first enabled.
 */
export function getDefaultFormation(fieldPlayerCount: number): FormationSlot[] {
  const presets: Record<number, FormationSlot[]> = {
    4: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 1 },
      { position: 'FWD', count: 1 },
    ],
    5: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 2 },
      { position: 'FWD', count: 1 },
    ],
    6: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 1 },
    ],
    7: [
      { position: 'DEF', count: 3 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 1 },
    ],
    8: [
      { position: 'DEF', count: 3 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 2 },
    ],
    9: [
      { position: 'DEF', count: 4 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 2 },
    ],
    10: [
      { position: 'DEF', count: 4 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 3 },
    ],
  };
  return presets[fieldPlayerCount] ?? [];
}
```

Note the import at the top of `gameConfig.ts` already has `GameConfig, GameConfigTemplate, TeamId` — add `FormationSlot` to the type import from `@/types/domain.ts`.

**Step 2: Verify no type errors**

```bash
pnpm typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/utils/gameConfig.ts
git commit -m "feat: add getDefaultFormation helper for idiomatic position presets"
```

---

### Task 3: Update GYSA U8+ templates to enable positions

**Files:**

- Modify: `src/types/domain.ts`

The GYSA entries for U8 and above currently have `usePositions: false` and empty formations. Update them to match the idiomatic presets.

**Sub-positions produced (for verification):**

- U8 (6v6, 5 field): 2-2-1 → LB · RB · LM · RM · ST
- U9/U10 (7v7, 6 field): 2-3-1 → LB · RB · LM · CM · RM · ST
- U11-13 (9v9, 8 field): 3-3-2 → LB · CB · RB · LM · CM · RM · LW · RW
- U14-16 (11v11, 10 field): 4-3-3 → LB · LCB · RCB · RB · LM · CM · RM · LW · ST · RW

**Step 1: Update the GYSA U8 entry in `GAME_CONFIG_TEMPLATES`**

Find:

```ts
  {
    name: 'GYSA U8',
    group: 'gysa',
    gysaMinAge: 8,
    gysaMaxAge: 8,
    fieldSize: 6,
    periods: 4,
    periodDurationMinutes: 12,
    rotationsPerPeriod: 2,
    usePositions: false,
    formation: [],
    useGoalie: true,
  },
```

Replace with:

```ts
  {
    name: 'GYSA U8',
    group: 'gysa',
    gysaMinAge: 8,
    gysaMaxAge: 8,
    fieldSize: 6,
    periods: 4,
    periodDurationMinutes: 12,
    rotationsPerPeriod: 2,
    usePositions: true,
    formation: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 2 },
      { position: 'FWD', count: 1 },
    ],
    useGoalie: true,
  },
```

**Step 2: Update GYSA U9**

Find:

```ts
  {
    name: 'GYSA U9',
    ...
    usePositions: false,
    formation: [],
    useGoalie: true,
  },
```

Replace `usePositions` and `formation`:

```ts
    usePositions: true,
    formation: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 1 },
    ],
```

**Step 3: Update GYSA U10** (same fieldSize as U9, same formation)

Same change as U9:

```ts
    usePositions: true,
    formation: [
      { position: 'DEF', count: 2 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 1 },
    ],
```

**Step 4: Update GYSA U11/12/13**

```ts
    usePositions: true,
    formation: [
      { position: 'DEF', count: 3 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 2 },
    ],
```

**Step 5: Update GYSA U14/15/16**

```ts
    usePositions: true,
    formation: [
      { position: 'DEF', count: 4 },
      { position: 'MID', count: 3 },
      { position: 'FWD', count: 3 },
    ],
```

**Step 6: Verify no type errors**

```bash
pnpm typecheck
```

Expected: no errors.

**Step 7: Commit**

```bash
git add src/types/domain.ts
git commit -m "feat: enable positions with idiomatic formations in GYSA U8+ templates"
```

---

### Task 4: Default `usePositions` + formation in `GameConfigForm` for U8+ teams

**Files:**

- Modify: `src/components/game/GameConfigForm.tsx`

When creating a **new** config (no `initialConfig`), the form should look up the team's birthYear, compute the U-age, and if U8+, default `usePositions: true` and pre-fill the formation based on the default fieldSize (7).

**Step 1: Import the needed utilities at the top of `GameConfigForm.tsx`**

Add to the existing imports:

```ts
import { useAppContext } from '@/hooks/useAppContext.ts';
import { getUAge } from '@/utils/age.ts';
import { getDefaultFormation } from '@/utils/gameConfig.ts';
```

**Step 2: Compute smart defaults before the `useState` calls**

Add this block inside `GameConfigForm`, before the first `useState` call:

```tsx
const { state } = useAppContext();
const team = state.teams[teamId];

const isU8OrAbove = !initialConfig && !!team?.birthYear && getUAge(team.birthYear) >= 8;

const defaultFieldSize = 7;
const defaultUsePositions = initialConfig?.usePositions ?? isU8OrAbove;
const defaultFormation =
  initialConfig?.formation ?? (isU8OrAbove ? getDefaultFormation(defaultFieldSize - 1) : []);
```

Note: `defaultFieldSize - 1` = 6 field players (GK subtracted), matching the 7v7 preset (2-3-1).

**Step 3: Update the `useState` calls to use the smart defaults**

Find:

```tsx
const [usePositions, setUsePositions] = useState(initialConfig?.usePositions ?? false);
const [formation, setFormation] = useState<FormationSlot[]>(initialConfig?.formation ?? []);
```

Replace with:

```tsx
const [usePositions, setUsePositions] = useState(defaultUsePositions);
const [formation, setFormation] = useState<FormationSlot[]>(defaultFormation);
```

**Step 4: Verify no type errors**

```bash
pnpm typecheck
```

Expected: no errors.

**Step 5: Verify the form renders correctly by running the dev server**

```bash
pnpm dev
```

Navigate to a team with a U8+ birth year → tap "Custom" to add a new config. The "Has Positions" toggle should be ON and DEF/MID/FWD counts should be pre-filled (2/3/1 for the default 7-player field).

Navigate to a team with no birth year (or U7) → same form should show positions OFF with empty counts.

**Step 6: Commit**

```bash
git add src/components/game/GameConfigForm.tsx
git commit -m "feat: default positions on with idiomatic formation for U8+ teams in config form"
```

---

### Task 5: Smoke test end-to-end

**Step 1: Run full test suite**

```bash
pnpm test:run
```

Expected: all tests pass.

**Step 2: Run typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors or warnings.

# Selective Export & Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the one-click export with a modal that lets users select which teams and data categories (rosters, game configs, game history) to export or import.

**Architecture:** A shared `useSelectionState` hook manages parent↔child checkbox sync with tri-state support. `filterStorageData()` slices `StorageData` by selections. Two new dialog components (ExportDialog, ImportDialog) use the hook and filter, replacing the inline Dashboard logic.

**Tech Stack:** React 19, shadcn/ui Dialog + Checkbox + Collapsible, Radix primitives, existing fishery factories for tests.

---

### Task 1: Add Indeterminate Icon to Checkbox

**Files:**

- Modify: `src/components/ui/checkbox.tsx`

**Step 1: Update checkbox to render MinusIcon when indeterminate**

The existing Checkbox only renders `CheckIcon`. Radix supports `checked="indeterminate"` but we need a visual indicator. Add a `MinusIcon` import from lucide-react and render it conditionally based on `data-[state=indeterminate]`.

```tsx
'use client';

import * as React from 'react';
import { CheckIcon, MinusIcon } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5 group-data-[state=indeterminate]:hidden" />
        <MinusIcon className="size-3.5 hidden group-data-[state=indeterminate]:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
```

Note: The Radix Indicator only renders when checked or indeterminate, so we need to switch icons inside it. Use the `group` pattern: add `group` to the Root and use `group-data-[state=...]` on the icons. If Radix doesn't propagate data-state to children cleanly, an alternative approach is to check `props.checked` and conditionally render the icon.

**Step 2: Verify manually**

Run: `pnpm dev` and confirm any existing checkboxes still work (e.g., roster editor goalie toggle).

**Step 3: Commit**

```bash
git add src/components/ui/checkbox.tsx
git commit -m "feat: add indeterminate state icon to Checkbox component"
```

---

### Task 2: filterStorageData Utility (TDD)

**Files:**

- Create: `src/storage/exportImport.test.ts`
- Modify: `src/storage/exportImport.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { filterStorageData } from './exportImport.ts';
import {
  teamFactory,
  gameFactory,
  gameConfigFactory,
  rosterFactory,
  playerFactory,
  resetFactories,
} from '@/test/factories.ts';
import { CURRENT_VERSION, type StorageData } from './localStorage.ts';
import type { TeamSelection } from '@/hooks/useSelectionState.ts';

// Note: TeamSelection type will be created in Task 3. For now, define inline:
// type TeamSelection = { rosters: boolean; configs: boolean; history: boolean };

describe('filterStorageData', () => {
  beforeEach(() => resetFactories());

  function buildTestData(): StorageData {
    const team1 = teamFactory.build({
      id: 'team-1',
      rosters: [rosterFactory.build({ teamId: 'team-1', players: playerFactory.buildList(3) })],
      gameConfigs: [gameConfigFactory.build({ teamId: 'team-1' })],
    });
    const team2 = teamFactory.build({
      id: 'team-2',
      rosters: [rosterFactory.build({ teamId: 'team-2', players: playerFactory.buildList(2) })],
      gameConfigs: [gameConfigFactory.build({ teamId: 'team-2' })],
    });
    const game1 = gameFactory.build({ id: 'game-1', teamId: 'team-1' });
    const game2 = gameFactory.build({ id: 'game-2', teamId: 'team-2' });
    return {
      version: CURRENT_VERSION,
      teams: { 'team-1': team1, 'team-2': team2 },
      games: { 'game-1': game1, 'game-2': game2 },
    };
  }

  it('includes everything when all selected', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: true, configs: true, history: true },
      'team-2': { rosters: true, configs: true, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(Object.keys(result.teams)).toEqual(['team-1', 'team-2']);
    expect(Object.keys(result.games)).toEqual(['game-1', 'game-2']);
    expect(result.teams['team-1'].rosters).toHaveLength(1);
    expect(result.teams['team-1'].gameConfigs).toHaveLength(1);
  });

  it('excludes teams not in selections', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: true, configs: true, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(Object.keys(result.teams)).toEqual(['team-1']);
    expect(Object.keys(result.games)).toEqual(['game-1']);
  });

  it('strips rosters when rosters unchecked', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: false, configs: true, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(result.teams['team-1'].rosters).toEqual([]);
    expect(result.teams['team-1'].gameConfigs).toHaveLength(1);
  });

  it('strips game configs when configs unchecked', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: true, configs: false, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(result.teams['team-1'].gameConfigs).toEqual([]);
    expect(result.teams['team-1'].rosters).toHaveLength(1);
  });

  it('excludes games when history unchecked', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: true, configs: true, history: false },
      'team-2': { rosters: true, configs: true, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(Object.keys(result.games)).toEqual(['game-2']);
  });

  it('excludes team entirely when all children unchecked', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: false, configs: false, history: false },
      'team-2': { rosters: true, configs: true, history: true },
    };
    const result = filterStorageData(data, selections);
    expect(Object.keys(result.teams)).toEqual(['team-2']);
  });

  it('preserves version and returns valid StorageData', () => {
    const data = buildTestData();
    const selections: Record<string, TeamSelection> = {
      'team-1': { rosters: true, configs: false, history: false },
    };
    const result = filterStorageData(data, selections);
    expect(result.version).toBe(CURRENT_VERSION);
    expect(result).toHaveProperty('teams');
    expect(result).toHaveProperty('games');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/storage/exportImport.test.ts`
Expected: FAIL — `filterStorageData` is not exported.

**Step 3: Implement filterStorageData**

Add to `src/storage/exportImport.ts`:

```ts
export interface TeamSelection {
  rosters: boolean;
  configs: boolean;
  history: boolean;
}

export function filterStorageData(
  data: StorageData,
  selections: Record<string, TeamSelection>,
): StorageData {
  const teams: StorageData['teams'] = {};
  const games: StorageData['games'] = {};

  for (const [teamId, sel] of Object.entries(selections)) {
    const team = data.teams[teamId];
    if (!team) continue;
    if (!sel.rosters && !sel.configs && !sel.history) continue;

    teams[teamId] = {
      ...team,
      rosters: sel.rosters ? team.rosters : [],
      gameConfigs: sel.configs ? team.gameConfigs : [],
    };

    if (sel.history) {
      for (const [gameId, game] of Object.entries(data.games)) {
        if (game.teamId === teamId) {
          games[gameId] = game;
        }
      }
    }
  }

  return { version: data.version, teams, games };
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/storage/exportImport.test.ts`
Expected: All PASS.

**Step 5: Commit**

```bash
git add src/storage/exportImport.ts src/storage/exportImport.test.ts
git commit -m "feat: add filterStorageData for selective export/import"
```

---

### Task 3: useSelectionState Hook (TDD)

**Files:**

- Create: `src/hooks/useSelectionState.ts`
- Create: `src/hooks/useSelectionState.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelectionState } from './useSelectionState.ts';
import { teamFactory, resetFactories } from '@/test/factories.ts';
import type { Team } from '@/types/domain.ts';

describe('useSelectionState', () => {
  beforeEach(() => resetFactories());

  function buildTeams(): Team[] {
    return [teamFactory.build({ id: 'team-1' }), teamFactory.build({ id: 'team-2' })];
  }

  it('initializes all teams as fully selected', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    expect(result.current.selections).toEqual({
      'team-1': { rosters: true, configs: true, history: true },
      'team-2': { rosters: true, configs: true, history: true },
    });
  });

  it('toggles a single field', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.toggleField('team-1', 'rosters'));
    expect(result.current.selections['team-1'].rosters).toBe(false);
    expect(result.current.selections['team-1'].configs).toBe(true);
  });

  it('derives parent state as checked when all children checked', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    expect(result.current.getTeamState('team-1')).toBe(true);
  });

  it('derives parent state as unchecked when all children unchecked', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => {
      result.current.toggleField('team-1', 'rosters');
      result.current.toggleField('team-1', 'configs');
      result.current.toggleField('team-1', 'history');
    });
    expect(result.current.getTeamState('team-1')).toBe(false);
  });

  it('derives parent state as indeterminate when some children checked', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.toggleField('team-1', 'rosters'));
    expect(result.current.getTeamState('team-1')).toBe('indeterminate');
  });

  it('toggleTeam checks all when currently unchecked', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => {
      result.current.toggleField('team-1', 'rosters');
      result.current.toggleField('team-1', 'configs');
      result.current.toggleField('team-1', 'history');
    });
    act(() => result.current.toggleTeam('team-1'));
    expect(result.current.selections['team-1']).toEqual({
      rosters: true,
      configs: true,
      history: true,
    });
  });

  it('toggleTeam checks all when currently indeterminate', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.toggleField('team-1', 'rosters'));
    act(() => result.current.toggleTeam('team-1'));
    expect(result.current.selections['team-1']).toEqual({
      rosters: true,
      configs: true,
      history: true,
    });
  });

  it('toggleTeam unchecks all when currently all checked', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.toggleTeam('team-1'));
    expect(result.current.selections['team-1']).toEqual({
      rosters: false,
      configs: false,
      history: false,
    });
  });

  it('selectAll checks everything', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.toggleTeam('team-1')); // uncheck team-1
    act(() => result.current.selectAll());
    expect(result.current.selections['team-1']).toEqual({
      rosters: true,
      configs: true,
      history: true,
    });
    expect(result.current.selections['team-2']).toEqual({
      rosters: true,
      configs: true,
      history: true,
    });
  });

  it('clearAll unchecks everything', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.clearAll());
    expect(result.current.selections['team-1']).toEqual({
      rosters: false,
      configs: false,
      history: false,
    });
  });

  it('hasAnySelected returns true when something is selected', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    expect(result.current.hasAnySelected).toBe(true);
  });

  it('hasAnySelected returns false when nothing is selected', () => {
    const { result } = renderHook(() => useSelectionState(buildTeams()));
    act(() => result.current.clearAll());
    expect(result.current.hasAnySelected).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/hooks/useSelectionState.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the hook**

```ts
import { useMemo, useState } from 'react';
import type { Team, TeamId } from '@/types/domain.ts';

export interface TeamSelection {
  rosters: boolean;
  configs: boolean;
  history: boolean;
}

type SelectionField = keyof TeamSelection;

const ALL_SELECTED: TeamSelection = { rosters: true, configs: true, history: true };
const NONE_SELECTED: TeamSelection = { rosters: false, configs: false, history: false };

function initSelections(teams: Team[]): Record<TeamId, TeamSelection> {
  const selections: Record<TeamId, TeamSelection> = {};
  for (const team of teams) {
    selections[team.id] = { ...ALL_SELECTED };
  }
  return selections;
}

export function useSelectionState(teams: Team[]) {
  const [selections, setSelections] = useState(() => initSelections(teams));

  function toggleField(teamId: TeamId, field: SelectionField) {
    setSelections((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [field]: !prev[teamId][field] },
    }));
  }

  function getTeamState(teamId: TeamId): boolean | 'indeterminate' {
    const sel = selections[teamId];
    if (!sel) return false;
    const values = [sel.rosters, sel.configs, sel.history];
    if (values.every(Boolean)) return true;
    if (values.every((v) => !v)) return false;
    return 'indeterminate';
  }

  function toggleTeam(teamId: TeamId) {
    const state = getTeamState(teamId);
    setSelections((prev) => ({
      ...prev,
      [teamId]: state === true ? { ...NONE_SELECTED } : { ...ALL_SELECTED },
    }));
  }

  function selectAll() {
    setSelections((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) next[id] = { ...ALL_SELECTED };
      return next;
    });
  }

  function clearAll() {
    setSelections((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) next[id] = { ...NONE_SELECTED };
      return next;
    });
  }

  const hasAnySelected = useMemo(
    () => Object.values(selections).some((s) => s.rosters || s.configs || s.history),
    [selections],
  );

  return { selections, toggleField, getTeamState, toggleTeam, selectAll, clearAll, hasAnySelected };
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/hooks/useSelectionState.test.ts`
Expected: All PASS.

**Step 5: Remove duplicate TeamSelection type**

The `TeamSelection` type is defined in both `exportImport.ts` (Task 2) and `useSelectionState.ts`. Move the canonical definition to `useSelectionState.ts` and re-export from `exportImport.ts`, or define in a shared location. Simplest: export from `useSelectionState.ts` and import in `exportImport.ts`. Update the test imports accordingly.

**Step 6: Run all tests**

Run: `pnpm vitest run src/storage/exportImport.test.ts src/hooks/useSelectionState.test.ts`
Expected: All PASS.

**Step 7: Commit**

```bash
git add src/hooks/useSelectionState.ts src/hooks/useSelectionState.test.ts src/storage/exportImport.ts src/storage/exportImport.test.ts
git commit -m "feat: add useSelectionState hook for team selection tree"
```

---

### Task 4: ExportDialog Component

**Files:**

- Create: `src/components/ExportDialog.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Step 1: Build the ExportDialog component**

The dialog renders when `open` is true. It receives the current app state teams and games. Uses `useSelectionState` for checkbox logic. Renders a checkbox tree with `Collapsible` for per-team expansion. "Export" calls `filterStorageData` → `downloadJSON` → closes dialog.

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible.tsx';
import { ChevronRight } from 'lucide-react';
import { useSelectionState } from '@/hooks/useSelectionState.ts';
import { filterStorageData } from '@/storage/exportImport.ts';
import { downloadJSON } from '@/storage/exportImport.ts';
import { CURRENT_VERSION, type StorageData } from '@/storage/localStorage.ts';
import type { Team, Game, TeamId } from '@/types/domain.ts';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Record<TeamId, Team>;
  games: Record<string, Game>;
}

export function ExportDialog({ open, onOpenChange, teams, games }: ExportDialogProps) {
  const teamList = Object.values(teams).sort((a, b) => b.updatedAt - a.updatedAt);
  const { selections, toggleField, getTeamState, toggleTeam, selectAll, clearAll, hasAnySelected } =
    useSelectionState(teamList);

  function gameCountForTeam(teamId: string): number {
    return Object.values(games).filter((g) => g.teamId === teamId).length;
  }

  function handleExport() {
    const data: StorageData = { version: CURRENT_VERSION, teams, games };
    const filtered = filterStorageData(data, selections);
    downloadJSON(filtered, `benchassist-backup-${new Date().toISOString().slice(0, 10)}.json`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Backup</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <div className="flex gap-2 text-xs text-muted-foreground mb-2">
            <button type="button" className="hover:underline" onClick={selectAll}>
              Select all
            </button>
            <span>·</span>
            <button type="button" className="hover:underline" onClick={clearAll}>
              Clear all
            </button>
          </div>

          {teamList.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              gameCount={gameCountForTeam(team.id)}
              parentState={getTeamState(team.id)}
              selection={selections[team.id]}
              onToggleTeam={() => toggleTeam(team.id)}
              onToggleField={(field) => toggleField(team.id, field)}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={!hasAnySelected}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- TeamRow (local component) ---

interface TeamRowProps {
  team: Team;
  gameCount: number;
  parentState: boolean | 'indeterminate';
  selection: { rosters: boolean; configs: boolean; history: boolean };
  onToggleTeam: () => void;
  onToggleField: (field: 'rosters' | 'configs' | 'history') => void;
}

function TeamRow({
  team,
  gameCount,
  parentState,
  selection,
  onToggleTeam,
  onToggleField,
}: TeamRowProps) {
  const [expanded, setExpanded] = useState(false);
  const playerCount = team.rosters.reduce((sum, r) => sum + r.players.length, 0);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="flex items-center gap-2 py-1.5">
        <Checkbox checked={parentState} onCheckedChange={onToggleTeam} />
        <CollapsibleTrigger className="flex items-center gap-1 flex-1 text-sm font-medium hover:underline">
          <ChevronRight
            className={`size-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          {team.name}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="ml-8 space-y-1 pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.rosters}
              onCheckedChange={() => onToggleField('rosters')}
            />
            <span>Rosters</span>
            <span className="text-xs text-muted-foreground">({playerCount} players)</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.configs}
              onCheckedChange={() => onToggleField('configs')}
            />
            <span>Game Configs</span>
            <span className="text-xs text-muted-foreground">({team.gameConfigs.length})</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.history}
              onCheckedChange={() => onToggleField('history')}
            />
            <span>Game History</span>
            <span className="text-xs text-muted-foreground">({gameCount} games)</span>
          </label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

**Step 2: Wire up in Dashboard**

In `src/pages/Dashboard.tsx`:

- Add `const [isExporting, setIsExporting] = useState(false)`
- Replace the `handleExport()` function call on the button with `onClick={() => setIsExporting(true)}`
- Add `<ExportDialog open={isExporting} onOpenChange={setIsExporting} teams={state.teams} games={state.games} />`
- Remove the old `handleExport` function

**Step 3: Verify manually**

Run: `pnpm dev`

- Click "Export Backup" → dialog opens with team tree
- Toggle checkboxes → parent reflects tri-state
- Click Export → downloads filtered JSON
- Open the JSON and verify the structure is correct

**Step 4: Commit**

```bash
git add src/components/ExportDialog.tsx src/pages/Dashboard.tsx
git commit -m "feat: add ExportDialog with selective team/category export"
```

---

### Task 5: ImportDialog Component

**Files:**

- Create: `src/components/ImportDialog.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Step 1: Build the ImportDialog component**

Similar to ExportDialog but:

- Receives parsed `StorageData` (from the imported file) instead of live app state
- Two actions: "Import Selected" (merge) and "Replace All Data" (destructive, behind ConfirmDialog)
- Calls `dispatch` via a callback prop

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible.tsx';
import { ConfirmDialog } from '@/components/ui/confirm-dialog.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { ChevronRight } from 'lucide-react';
import { useSelectionState } from '@/hooks/useSelectionState.ts';
import { filterStorageData } from '@/storage/exportImport.ts';
import type { StorageData } from '@/storage/localStorage.ts';
import type { Team } from '@/types/domain.ts';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importData: StorageData;
  onImportSelected: (filtered: StorageData) => void;
  onReplaceAll: (data: StorageData) => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  importData,
  onImportSelected,
  onReplaceAll,
}: ImportDialogProps) {
  const teamList = Object.values(importData.teams).sort((a, b) => b.updatedAt - a.updatedAt);
  const { selections, toggleField, getTeamState, toggleTeam, selectAll, clearAll, hasAnySelected } =
    useSelectionState(teamList);
  const [confirmReplace, setConfirmReplace] = useState(false);

  function gameCountForTeam(teamId: string): number {
    return Object.values(importData.games).filter((g) => g.teamId === teamId).length;
  }

  function handleImportSelected() {
    const filtered = filterStorageData(importData, selections);
    onImportSelected(filtered);
    onOpenChange(false);
  }

  function handleReplaceAll() {
    onReplaceAll(importData);
    setConfirmReplace(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Backup</DialogTitle>
          </DialogHeader>

          <div className="space-y-1">
            <div className="flex gap-2 text-xs text-muted-foreground mb-2">
              <button type="button" className="hover:underline" onClick={selectAll}>
                Select all
              </button>
              <span>·</span>
              <button type="button" className="hover:underline" onClick={clearAll}>
                Clear all
              </button>
            </div>

            {teamList.map((team) => (
              <ImportTeamRow
                key={team.id}
                team={team}
                gameCount={gameCountForTeam(team.id)}
                parentState={getTeamState(team.id)}
                selection={selections[team.id]}
                onToggleTeam={() => toggleTeam(team.id)}
                onToggleField={(field) => toggleField(team.id, field)}
              />
            ))}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleImportSelected} disabled={!hasAnySelected} className="w-full">
              Import Selected
            </Button>
            <Separator />
            <Button
              variant="destructive"
              onClick={() => setConfirmReplace(true)}
              className="w-full"
            >
              Replace All Data
            </Button>
            <p className="text-xs text-muted-foreground">
              Deletes all current data and replaces with this backup.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmReplace}
        onConfirm={handleReplaceAll}
        onCancel={() => setConfirmReplace(false)}
        title="Replace all data?"
        description="This will delete all your current teams, rosters, and game history and replace them with the imported backup. This action can be undone."
        confirmLabel="Replace All"
        variant="destructive"
      />
    </>
  );
}

// --- ImportTeamRow (same structure as ExportDialog's TeamRow) ---

interface ImportTeamRowProps {
  team: Team;
  gameCount: number;
  parentState: boolean | 'indeterminate';
  selection: { rosters: boolean; configs: boolean; history: boolean };
  onToggleTeam: () => void;
  onToggleField: (field: 'rosters' | 'configs' | 'history') => void;
}

function ImportTeamRow({
  team,
  gameCount,
  parentState,
  selection,
  onToggleTeam,
  onToggleField,
}: ImportTeamRowProps) {
  const [expanded, setExpanded] = useState(false);
  const playerCount = team.rosters.reduce((sum, r) => sum + r.players.length, 0);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="flex items-center gap-2 py-1.5">
        <Checkbox checked={parentState} onCheckedChange={onToggleTeam} />
        <CollapsibleTrigger className="flex items-center gap-1 flex-1 text-sm font-medium hover:underline">
          <ChevronRight
            className={`size-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          {team.name}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="ml-8 space-y-1 pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.rosters}
              onCheckedChange={() => onToggleField('rosters')}
            />
            <span>Rosters</span>
            <span className="text-xs text-muted-foreground">({playerCount} players)</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.configs}
              onCheckedChange={() => onToggleField('configs')}
            />
            <span>Game Configs</span>
            <span className="text-xs text-muted-foreground">({team.gameConfigs.length})</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.history}
              onCheckedChange={() => onToggleField('history')}
            />
            <span>Game History</span>
            <span className="text-xs text-muted-foreground">({gameCount} games)</span>
          </label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

**Step 2: Wire up in Dashboard**

In `src/pages/Dashboard.tsx`:

- Replace the inline import dialog with `<ImportDialog>`
- Pass callbacks that dispatch `MERGE_DATA` and `IMPORT_DATA`
- Remove the old `handleImport` function and inline import dialog JSX

```tsx
// In Dashboard component:
// Replace the import dialog section with:
{
  importData && (
    <ImportDialog
      open={importData !== null}
      onOpenChange={(open) => {
        if (!open) setImportData(null);
      }}
      importData={importData}
      onImportSelected={(filtered) => {
        dispatchWithUndo({
          type: 'MERGE_DATA',
          payload: {
            teams: filtered.teams,
            games: filtered.games,
            favoriteDrillIds: filtered.favoriteDrillIds ?? [],
          },
        });
        setImportData(null);
      }}
      onReplaceAll={(data) => {
        dispatchWithUndo({
          type: 'IMPORT_DATA',
          payload: {
            teams: data.teams,
            games: data.games,
            favoriteDrillIds: data.favoriteDrillIds ?? [],
          },
        });
        setImportData(null);
      }}
    />
  );
}
```

**Step 3: Verify manually**

Run: `pnpm dev`

- First export a backup (to have a file to import)
- Click "Import Backup" → select file → import dialog appears with tree
- Toggle selections → "Import Selected" merges filtered data
- Test "Replace All Data" → confirm dialog appears → replaces everything
- Undo toast works for both operations

**Step 4: Commit**

```bash
git add src/components/ImportDialog.tsx src/pages/Dashboard.tsx
git commit -m "feat: add ImportDialog with selective import and replace-all"
```

---

### Task 6: Extract Shared TeamRow Component (DRY Cleanup)

**Files:**

- Create: `src/components/TeamSelectionTree.tsx`
- Modify: `src/components/ExportDialog.tsx`
- Modify: `src/components/ImportDialog.tsx`

**Step 1: Extract the duplicated TeamRow into a shared component**

The `TeamRow` and `ImportTeamRow` components are identical. Extract into `TeamSelectionTree.tsx` that renders the full tree (Select all/Clear all + team rows). Both dialogs use it, wrapping it in their own Dialog shell + action buttons.

```tsx
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible.tsx';
import { ChevronRight } from 'lucide-react';
import type { useSelectionState } from '@/hooks/useSelectionState.ts';
import type { Team, Game } from '@/types/domain.ts';

interface TeamSelectionTreeProps {
  teams: Team[];
  games: Record<string, Game>;
  selectionState: ReturnType<typeof useSelectionState>;
}

export function TeamSelectionTree({ teams, games, selectionState }: TeamSelectionTreeProps) {
  const { selections, toggleField, getTeamState, toggleTeam, selectAll, clearAll } = selectionState;

  function gameCountForTeam(teamId: string): number {
    return Object.values(games).filter((g) => g.teamId === teamId).length;
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2 text-xs text-muted-foreground mb-2">
        <button type="button" className="hover:underline" onClick={selectAll}>
          Select all
        </button>
        <span>·</span>
        <button type="button" className="hover:underline" onClick={clearAll}>
          Clear all
        </button>
      </div>

      {teams.map((team) => (
        <TeamRow
          key={team.id}
          team={team}
          gameCount={gameCountForTeam(team.id)}
          parentState={getTeamState(team.id)}
          selection={selections[team.id]}
          onToggleTeam={() => toggleTeam(team.id)}
          onToggleField={(field) => toggleField(team.id, field)}
        />
      ))}
    </div>
  );
}

function TeamRow({
  team,
  gameCount,
  parentState,
  selection,
  onToggleTeam,
  onToggleField,
}: {
  team: Team;
  gameCount: number;
  parentState: boolean | 'indeterminate';
  selection: { rosters: boolean; configs: boolean; history: boolean };
  onToggleTeam: () => void;
  onToggleField: (field: 'rosters' | 'configs' | 'history') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const playerCount = team.rosters.reduce((sum, r) => sum + r.players.length, 0);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="flex items-center gap-2 py-1.5">
        <Checkbox checked={parentState} onCheckedChange={onToggleTeam} />
        <CollapsibleTrigger className="flex items-center gap-1 flex-1 text-sm font-medium hover:underline">
          <ChevronRight
            className={`size-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          {team.name}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="ml-8 space-y-1 pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.rosters}
              onCheckedChange={() => onToggleField('rosters')}
            />
            <span>Rosters</span>
            <span className="text-xs text-muted-foreground">({playerCount} players)</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.configs}
              onCheckedChange={() => onToggleField('configs')}
            />
            <span>Game Configs</span>
            <span className="text-xs text-muted-foreground">({team.gameConfigs.length})</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.history}
              onCheckedChange={() => onToggleField('history')}
            />
            <span>Game History</span>
            <span className="text-xs text-muted-foreground">({gameCount} games)</span>
          </label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

**Step 2: Update ExportDialog and ImportDialog to use TeamSelectionTree**

Replace the inline tree rendering in both dialogs with `<TeamSelectionTree teams={teamList} games={games} selectionState={selectionState} />` where `selectionState` is the return value of `useSelectionState(teamList)`.

**Step 3: Run lint and verify**

Run: `pnpm lint`
Run: `pnpm dev` — verify both dialogs still work.

**Step 4: Commit**

```bash
git add src/components/TeamSelectionTree.tsx src/components/ExportDialog.tsx src/components/ImportDialog.tsx
git commit -m "refactor: extract shared TeamSelectionTree component"
```

---

### Task 7: Run Full Test Suite & Final Verification

**Step 1: Run all tests**

Run: `pnpm test:run`
Expected: All tests pass, no regressions.

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors.

**Step 3: Run build**

Run: `pnpm build`
Expected: Clean build with no type errors.

**Step 4: Manual smoke test**

- Export with all selected → same as before
- Export with one team deselected → JSON only has the other team
- Export with rosters unchecked → JSON has team but empty rosters array
- Import the partial export → only imported items appear in merge
- Replace All → full restore, undo works

**Step 5: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "chore: fixups from final verification"
```

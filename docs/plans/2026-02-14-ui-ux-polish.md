# UI/UX Polish Pass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the roster editor, game config, and game setup flows — reduce visual noise, improve interaction patterns, add dark mode toggle.

**Architecture:** All changes are within existing components. No new pages, routes, or domain model changes. Four new shadcn/ui components (Switch, Checkbox, Collapsible, Popover) and one new hook (useTheme).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui (new-york style, radix-ui unified package), Lucide icons, Vitest.

---

### Task 1: Install shadcn/ui Components

**Files:**

- Create: `src/components/ui/switch.tsx`
- Create: `src/components/ui/checkbox.tsx`
- Create: `src/components/ui/collapsible.tsx`
- Create: `src/components/ui/popover.tsx`

**Step 1: Install all four components via shadcn CLI**

Run: `pnpm dlx shadcn@latest add switch checkbox collapsible popover`

**Step 2: Verify components were created**

Run: `ls src/components/ui/{switch,checkbox,collapsible,popover}.tsx`

Expected: all four files listed.

**Step 3: Verify build passes**

Run: `pnpm build`

Expected: clean build, no type errors.

**Step 4: Commit**

```bash
git add src/components/ui/{switch,checkbox,collapsible,popover}.tsx
git commit -m "chore: add Switch, Checkbox, Collapsible, Popover shadcn components"
```

---

### Task 2: Dark Mode Toggle

**Files:**

- Create: `src/hooks/useTheme.ts`
- Create: `src/hooks/useTheme.test.ts`
- Modify: `src/components/layout/AppShell.tsx`

**Step 1: Write tests for useTheme hook**

Create `src/hooks/useTheme.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTheme } from './useTheme';

const STORAGE_KEY = 'benchassist_theme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    // Default: system prefers light
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('defaults to system preference (light)', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('system');
    expect(result.current.resolved).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('defaults to system preference (dark)', () => {
    (window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('system');
    expect(result.current.resolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('cycles through system -> light -> dark', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.cycle());
    expect(result.current.preference).toBe('light');

    act(() => result.current.cycle());
    expect(result.current.preference).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => result.current.cycle());
    expect(result.current.preference).toBe('system');
  });

  it('persists preference to localStorage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.cycle());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('restores preference from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/hooks/useTheme.test.ts`

Expected: FAIL — module `./useTheme` not found.

**Step 3: Implement useTheme hook**

Create `src/hooks/useTheme.ts`:

```ts
import { useState, useEffect, useCallback } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'benchassist_theme';
const CYCLE_ORDER: ThemePreference[] = ['system', 'light', 'dark'];

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as ThemePreference) ?? 'system';
  });

  const resolved: ResolvedTheme = preference === 'system' ? getSystemTheme() : preference;

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(getSystemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  const cycle = useCallback(() => {
    setPreference((prev) => {
      const idx = CYCLE_ORDER.indexOf(prev);
      const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { preference, resolved, cycle };
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/hooks/useTheme.test.ts`

Expected: all 5 tests PASS.

**Step 5: Add theme toggle button to AppShell**

Modify `src/components/layout/AppShell.tsx`:

- Import `useTheme` from `@/hooks/useTheme`
- Import `SunIcon`, `MoonIcon`, `MonitorIcon` from `lucide-react`
- Import `Button` from `@/components/ui/button`
- Add a ghost icon button between the logo and nav that calls `cycle()` on click
- Show `MonitorIcon` for "system", `SunIcon` for "light", `MoonIcon` for "dark"

The button goes in the nav area:

```tsx
<nav className="flex gap-1 items-center">
  <Button
    variant="ghost"
    size="sm"
    onClick={cycle}
    aria-label={`Theme: ${preference}`}
    className="h-8 w-8 p-0"
  >
    {preference === 'system' ? (
      <MonitorIcon className="h-4 w-4" />
    ) : preference === 'light' ? (
      <SunIcon className="h-4 w-4" />
    ) : (
      <MoonIcon className="h-4 w-4" />
    )}
  </Button>
  {NAV_ITEMS.map(/* existing code */)}
</nav>
```

**Step 6: Verify build passes and manually check toggle**

Run: `pnpm build`

Expected: clean build.

**Step 7: Commit**

```bash
git add src/hooks/useTheme.ts src/hooks/useTheme.test.ts src/components/layout/AppShell.tsx
git commit -m "feat: add dark mode toggle with system detection"
```

---

### Task 3: Switch/Checkbox Component Swap — GameConfigForm

**Files:**

- Modify: `src/components/game/GameConfigForm.tsx`

**Step 1: Replace raw checkboxes with Switch components**

In `src/components/game/GameConfigForm.tsx`:

- Add imports: `import { Switch } from '@/components/ui/switch';`
- Replace the four `<input type="checkbox" ... className="h-4 w-4" />` elements with `<Switch checked={...} onCheckedChange={...} />`:
  - `noConsecutiveBench` toggle
  - `enforceMinPlayTime` toggle
  - `goaliePlayFullPeriod` toggle
  - `goalieRestAfterPeriod` toggle

For each, the pattern changes from:

```tsx
<input
  type="checkbox"
  checked={value}
  onChange={(e) => setter(e.target.checked)}
  className="h-4 w-4"
/>
```

to:

```tsx
<Switch checked={value} onCheckedChange={setter} />
```

**Step 2: Verify build passes**

Run: `pnpm build`

Expected: clean build, no type errors.

**Step 3: Commit**

```bash
git add src/components/game/GameConfigForm.tsx
git commit -m "refactor: use Switch components for GameConfigForm toggles"
```

---

### Task 4: Switch/Checkbox Swap — RosterEditor

**Files:**

- Modify: `src/pages/RosterEditor.tsx`

**Step 1: Replace raw checkboxes**

In `src/pages/RosterEditor.tsx`:

- Add imports: `import { Switch } from '@/components/ui/switch';` and `import { Checkbox } from '@/components/ui/checkbox';`
- **Player form** "Can play goalkeeper" (line ~389-398): replace `<input type="checkbox">` with `<Switch>`:

```tsx
<div className="flex items-center gap-2">
  <Switch
    id="can-play-goalie"
    checked={form.canPlayGoalie}
    onCheckedChange={(checked) => setForm({ ...form, canPlayGoalie: checked as boolean })}
  />
  <Label htmlFor="can-play-goalie">Can play goalkeeper</Label>
</div>
```

- **Import preview** goalie checkbox (line ~271-277): replace `<input type="checkbox">` with `<Checkbox>`:

```tsx
<Checkbox
  checked={row.canPlayGoalie}
  onCheckedChange={(checked) => updateImportRow(i, { canPlayGoalie: checked as boolean })}
  aria-label="Can play goalie"
/>
```

**Step 2: Verify build passes**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add src/pages/RosterEditor.tsx
git commit -m "refactor: use Switch/Checkbox components in RosterEditor"
```

---

### Task 5: Single-Container Player List

**Files:**

- Modify: `src/pages/RosterEditor.tsx`

**Step 1: Replace per-player Cards with a single Card container**

In `src/pages/RosterEditor.tsx`, replace the player list section (lines ~413-461). Change from:

```tsx
<div className="grid gap-2">
  {sortedPlayers.map((player) => (
    <Card key={player.id}>
      <CardContent className="py-3 flex items-center justify-between">...</CardContent>
    </Card>
  ))}
</div>
```

to:

```tsx
<Card>
  <CardContent className="p-0">
    {sortedPlayers.map((player, index) => (
      <div
        key={player.id}
        className={cn(
          'flex items-center justify-between px-4 py-3',
          index < sortedPlayers.length - 1 && 'border-b',
        )}
      >
        {/* Same inner content: skill badge, name, position badges, action buttons */}
      </div>
    ))}
  </CardContent>
</Card>
```

- Add `import { cn } from '@/lib/utils';` if not already imported.
- Keep the inner content (skill badge, name, badges, edit/remove buttons) exactly the same.
- The empty state card remains unchanged.

**Step 2: Verify build passes**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add src/pages/RosterEditor.tsx
git commit -m "refactor: single-container player list with row dividers"
```

---

### Task 6: Skill Badge Popover

**Files:**

- Modify: `src/pages/RosterEditor.tsx`

**Step 1: Add skill popover to player rows**

In `src/pages/RosterEditor.tsx`:

- Add imports: `import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';`
- Replace the static skill badge in the player list:

From:

```tsx
<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
  {player.skillRanking}
</div>
```

To:

```tsx
<Popover>
  <PopoverTrigger asChild>
    <button
      className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold hover:bg-primary/20 transition-colors cursor-pointer"
      aria-label={`Skill ${player.skillRanking}, click to change`}
    >
      {player.skillRanking}
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-1" align="start">
    <div className="flex flex-col">
      {([1, 2, 3, 4, 5] as const).map((rank) => (
        <button
          key={rank}
          className={cn(
            'px-3 py-1.5 text-sm text-left rounded hover:bg-accent transition-colors',
            rank === player.skillRanking && 'bg-accent font-medium',
          )}
          onClick={() => {
            dispatch({
              type: 'UPDATE_PLAYER',
              payload: {
                teamId: teamId!,
                rosterId: rosterId!,
                player: { ...player, skillRanking: rank },
              },
            });
          }}
        >
          {SKILL_LABELS[rank]}
        </button>
      ))}
    </div>
  </PopoverContent>
</Popover>
```

**Step 2: Verify build passes**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add src/pages/RosterEditor.tsx
git commit -m "feat: add inline skill ranking popover on player list"
```

---

### Task 7: One-Click Template Config Creation

**Files:**

- Modify: `src/pages/TeamManagement.tsx`
- Modify: `src/components/game/GameConfigForm.tsx`

**Step 1: Add template quick-create buttons to TeamManagement**

In `src/pages/TeamManagement.tsx`:

- Import `GAME_CONFIG_TEMPLATES` and `GameConfig` from `@/types/domain`
- Import `generateId` from `@/utils/id`
- In the Game Configurations section header area, add a row of template buttons below the "Add Config" button:

```tsx
<div className="flex flex-wrap gap-2">
  {GAME_CONFIG_TEMPLATES.map((template) => (
    <Button
      key={template.name}
      variant="outline"
      size="sm"
      onClick={() => {
        const config: GameConfig = {
          id: generateId(),
          teamId: teamId!,
          name: template.name,
          fieldSize: template.fieldSize,
          periods: template.periods,
          periodDurationMinutes: template.periodDurationMinutes,
          rotationsPerPeriod: template.rotationsPerPeriod,
          usePositions: template.usePositions,
          formation: template.formation,
          noConsecutiveBench: true,
          maxConsecutiveBench: 1,
          enforceMinPlayTime: true,
          minPlayPercentage: 50,
          goaliePlayFullPeriod: true,
          goalieRestAfterPeriod: true,
          balancePriority: 'balanced',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        dispatch({ type: 'ADD_GAME_CONFIG', payload: { teamId: teamId!, config } });
      }}
    >
      {template.name}
    </Button>
  ))}
</div>
```

- Make config cards clickable to open the edit dialog. Add state `const [editingConfigId, setEditingConfigId] = useState<string | null>(null)`.
- When a config card is clicked, `setEditingConfigId(config.id)` and open the config dialog in edit mode.
- Change the `isAddingConfig` dialog to also handle editing. Pass `initialConfig` to `GameConfigForm` when editing.
- Rename "Add Config" button label to "Custom..." to indicate it's for non-template configs.

**Step 2: Add Collapsible rules section to GameConfigForm**

In `src/components/game/GameConfigForm.tsx`:

- Import `Collapsible, CollapsibleContent, CollapsibleTrigger` from `@/components/ui/collapsible`
- Import `ChevronDownIcon` from `lucide-react`
- Add state: `const [rulesOpen, setRulesOpen] = useState(!!initialConfig)` — open by default when editing, collapsed when creating.
- Wrap the rules section (from the "Rules" heading through the balance priority select) in a `<Collapsible>`:

```tsx
<Collapsible open={rulesOpen} onOpenChange={setRulesOpen}>
  <CollapsibleTrigger asChild>
    <button className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-foreground transition-colors text-muted-foreground">
      Rules & Balance
      <ChevronDownIcon className={cn('h-4 w-4 transition-transform', rulesOpen && 'rotate-180')} />
    </button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div className="space-y-3 pt-1">
      {/* existing rules checkboxes (now Switches from Task 3) and balance select */}
    </div>
  </CollapsibleContent>
</Collapsible>
```

- Remove the template buttons from GameConfigForm since they now live in TeamManagement. The `{!initialConfig && ...}` template section can be deleted.

**Step 3: Verify build passes**

Run: `pnpm build`

**Step 4: Commit**

```bash
git add src/pages/TeamManagement.tsx src/components/game/GameConfigForm.tsx
git commit -m "feat: one-click template config creation, collapsible rules section"
```

---

### Task 8: Game Setup Summary Line

**Files:**

- Modify: `src/pages/GameSetup.tsx`

**Step 1: Add computed summary line**

In `src/pages/GameSetup.tsx`, add a `useMemo` that computes the summary when config and roster are selected:

```ts
const summaryText = useMemo(() => {
  if (!selectedRoster || !selectedConfig) return null;
  const playerCount = activePlayers.length;
  const totalRotations = selectedConfig.periods * selectedConfig.rotationsPerPeriod;
  const fieldSlots = selectedConfig.fieldSize;
  const benchPerRotation = Math.max(0, playerCount - fieldSlots);
  return `${playerCount} players · ${selectedConfig.fieldSize}v${selectedConfig.fieldSize} · ${totalRotations} rotations · ~${benchPerRotation} benched per rotation`;
}, [selectedRoster, selectedConfig, activePlayers]);
```

Render it inside the Team & Configuration card, after the last form field:

```tsx
{
  summaryText && <p className="text-sm text-muted-foreground pt-2 border-t">{summaryText}</p>;
}
```

**Step 2: Verify build passes**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add src/pages/GameSetup.tsx
git commit -m "feat: add game setup summary line"
```

---

### Task 9: Compact Attendance + Section Collapsing

**Files:**

- Modify: `src/pages/GameSetup.tsx`

**Step 1: Make attendance rows more compact**

In `src/pages/GameSetup.tsx`, replace the attendance player rows. Change from `p-2` padding and full `flex items-center justify-between` to tighter layout:

```tsx
<div
  key={player.id}
  className={cn(
    'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
    isAbsent ? 'bg-destructive/10 opacity-60' : 'hover:bg-accent',
  )}
  onClick={() => handleToggleAbsent(player.id)}
>
  <Checkbox checked={!isAbsent} onCheckedChange={() => handleToggleAbsent(player.id)} />
  <span className={cn('text-sm flex-1', isAbsent && 'line-through')}>{player.name}</span>
  <Badge variant="secondary" className="text-xs">
    {player.skillRanking}
  </Badge>
</div>
```

- Import `Checkbox` from `@/components/ui/checkbox`
- Import `cn` from `@/lib/utils`
- This reduces vertical padding from `p-2` (8px) to `py-1.5` (6px) and uses `text-sm` consistently.

**Step 2: Add collapsing behavior for the config section**

Add state: `const [configCollapsed, setConfigCollapsed] = useState(false)`

Auto-collapse when all three selections are made:

```ts
const configComplete = !!(teamId && rosterId && configId);

useEffect(() => {
  if (configComplete) setConfigCollapsed(true);
}, [configComplete]);
```

When collapsed, the Team & Configuration card renders only the summary line with an Edit button:

```tsx
<Card>
  {configCollapsed && summaryText ? (
    <CardContent className="py-3 flex items-center justify-between">
      <div>
        <p className="font-medium text-sm">
          {selectedTeam?.name} · {selectedRoster?.name}
        </p>
        <p className="text-xs text-muted-foreground">{summaryText}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setConfigCollapsed(false)}>
        Edit
      </Button>
    </CardContent>
  ) : (
    <>
      <CardHeader>
        <CardTitle className="text-base">Team & Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* existing form fields */}
        {summaryText && (
          <p className="text-sm text-muted-foreground pt-2 border-t">{summaryText}</p>
        )}
      </CardContent>
    </>
  )}
</Card>
```

**Step 3: Verify build passes**

Run: `pnpm build`

**Step 4: Run all tests**

Run: `pnpm test:run`

Expected: all tests pass.

**Step 5: Commit**

```bash
git add src/pages/GameSetup.tsx
git commit -m "feat: compact attendance rows, collapsible config section"
```

---

### Task 10: Final Verification

**Step 1: Run full test suite**

Run: `pnpm test:run`

Expected: all tests pass.

**Step 2: Run type check + lint**

Run: `pnpm build && pnpm lint`

Expected: clean build, no lint errors.

**Step 3: Manual smoke test**

Run: `pnpm dev`

Manually verify:

- Dark mode toggle cycles through system/light/dark
- GameConfigForm shows Switch toggles, collapsible rules section
- RosterEditor has single-container list with row dividers
- Skill badge popover works on player list
- Template buttons on TeamManagement create configs directly
- Config cards are clickable to edit
- GameSetup collapses config section, shows summary
- Attendance uses styled Checkbox and compact rows

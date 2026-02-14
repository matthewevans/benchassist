# Fix Rotation Regeneration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the "Regenerate" button update the current game's schedule in-place instead of creating a new game, and add a settings sheet for editing absent players/goalie assignments before regenerating.

**Architecture:** Replace the navigate-to-`/games/new` approach with an in-place `useSolver()` call on `RotationGrid`. Add a Sheet component for editing game settings. All changes are in `RotationGrid.tsx` — no new routes or reducer actions needed.

**Tech Stack:** React, useSolver hook, shadcn/ui Sheet, existing UPDATE_GAME and SET_GAME_SCHEDULE reducer actions.

---

### Task 1: Replace "Regenerate" button with in-place re-solve

**Files:**

- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Add useSolver hook and solver effect**

At the top of the `RotationGrid` component (after existing hooks), add:

```tsx
import { useSolver } from '@/hooks/useSolver.ts';

// Inside RotationGrid():
const solver = useSolver();
```

Add an effect to handle solver completion (after the existing `handleStartGame` function):

```tsx
useEffect(() => {
  if (solver.result && game) {
    dispatch({
      type: 'SET_GAME_SCHEDULE',
      payload: { gameId: game.id, schedule: solver.result },
    });
    solver.reset();
  }
}, [solver.result, game, dispatch, solver]);
```

**Step 2: Add handleRegenerate function**

Add this function (after `handleStartGame`):

```tsx
function handleRegenerate() {
  if (!roster || !config || !game) return;
  solver.solve({
    players: roster.players,
    config,
    absentPlayerIds: game.absentPlayerIds,
    goalieAssignments: game.goalieAssignments,
    manualOverrides: game.manualOverrides,
  });
}
```

**Step 3: Replace the Regenerate button**

Change the existing button from:

```tsx
<Button variant="outline" size="sm" onClick={() => navigate(`/games/new?teamId=${game.teamId}`)}>
  Regenerate
</Button>
```

To:

```tsx
<Button variant="outline" size="sm" onClick={handleRegenerate} disabled={solver.isRunning}>
  {solver.isRunning ? 'Solving...' : 'Regenerate'}
</Button>
```

**Step 4: Add solver progress indicator**

Below the header `<div>` (before the overall stats grid), add:

```tsx
{
  solver.isRunning && (
    <Card>
      <CardContent className="py-3">
        <div className="flex justify-between text-sm mb-1">
          <span>{solver.message}</span>
          <span>{solver.progress}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${solver.progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

{
  solver.error && (
    <Card className="border-destructive">
      <CardContent className="py-3">
        <p className="text-sm text-destructive">{solver.error}</p>
      </CardContent>
    </Card>
  );
}
```

**Step 5: Verify manually**

Run: `pnpm dev`

- Open a game's rotation grid
- Click "Regenerate" — should re-solve in-place (grid updates, no navigation, no new game in history)
- Verify the old game is still the same game (same ID, same name)

**Step 6: Commit**

```bash
git add src/pages/RotationGrid.tsx
git commit -m "fix: regenerate rotations in-place instead of creating new game"
```

---

### Task 2: Add settings sheet for editing absent players and goalie assignments

**Files:**

- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Add imports and state for the settings sheet**

Add to existing imports:

```tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Label } from '@/components/ui/label.tsx';
import { cn } from '@/lib/utils.ts';
import { Settings2 } from 'lucide-react';
import type { PlayerId, GoalieAssignment, Game } from '@/types/domain.ts';
```

Add state (after existing state declarations):

```tsx
const [settingsOpen, setSettingsOpen] = useState(false);
const [editAbsent, setEditAbsent] = useState<Set<PlayerId>>(new Set());
const [editGoalies, setEditGoalies] = useState<GoalieAssignment[]>([]);
```

**Step 2: Add handlers for the settings sheet**

```tsx
function handleOpenSettings() {
  if (!game) return;
  setEditAbsent(new Set(game.absentPlayerIds));
  setEditGoalies([...game.goalieAssignments]);
  setSettingsOpen(true);
}

function handleToggleAbsent(playerId: PlayerId) {
  setEditAbsent((prev) => {
    const next = new Set(prev);
    if (next.has(playerId)) next.delete(playerId);
    else next.add(playerId);
    return next;
  });
}

function handleGoalieChange(periodIndex: number, playerId: string) {
  setEditGoalies((prev) => {
    const filtered = prev.filter((a) => a.periodIndex !== periodIndex);
    return [...filtered, { periodIndex, playerId: playerId as PlayerId | 'auto' }];
  });
}

function handleRegenerateWithSettings() {
  if (!roster || !config || !game) return;
  const updatedGame: Game = {
    ...game,
    absentPlayerIds: [...editAbsent],
    goalieAssignments: config.useGoalie ? editGoalies : [],
  };
  dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
  solver.solve({
    players: roster.players,
    config,
    absentPlayerIds: [...editAbsent],
    goalieAssignments: config.useGoalie ? editGoalies : [],
    manualOverrides: game.manualOverrides,
  });
  setSettingsOpen(false);
}
```

**Step 3: Add the settings button next to Regenerate**

In the button group, add after the Regenerate button:

```tsx
<Button variant="ghost" size="sm" onClick={handleOpenSettings} title="Edit game settings">
  <Settings2 className="h-4 w-4" />
</Button>
```

**Step 4: Add the Sheet component**

At the end of the JSX return (before the closing `</div>`), add:

```tsx
<Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
  <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Game Settings</SheetTitle>
      <SheetDescription>Edit attendance and goalie assignments, then regenerate.</SheetDescription>
    </SheetHeader>

    <div className="space-y-6 px-4">
      {/* Absent players */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Attendance ({roster.players.filter((p) => !editAbsent.has(p.id)).length} /{' '}
          {roster.players.length})
        </Label>
        <div className="grid gap-1.5">
          {roster.players.map((player) => {
            const isAbsent = editAbsent.has(player.id);
            return (
              <div
                key={player.id}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
                  isAbsent ? 'bg-destructive/10 opacity-60' : 'hover:bg-accent',
                )}
                onClick={() => handleToggleAbsent(player.id)}
              >
                <Checkbox
                  checked={!isAbsent}
                  onCheckedChange={() => handleToggleAbsent(player.id)}
                />
                <span className={cn('text-sm flex-1', isAbsent && 'line-through')}>
                  {player.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {player.skillRanking}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Goalie assignments */}
      {config?.useGoalie && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Goalie Assignment</Label>
          <div className="space-y-2">
            {Array.from({ length: config.periods }, (_, i) => {
              const availableGoalies = roster.players.filter(
                (p) => p.canPlayGoalie && !editAbsent.has(p.id),
              );
              return (
                <div key={i} className="flex items-center gap-3">
                  <Label className="w-20 text-sm">Period {i + 1}</Label>
                  <Select
                    value={editGoalies.find((a) => a.periodIndex === i)?.playerId ?? 'auto'}
                    onValueChange={(v) => handleGoalieChange(i, v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-assign</SelectItem>
                      {availableGoalies.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

    <SheetFooter>
      <Button className="w-full" onClick={handleRegenerateWithSettings}>
        Regenerate with Changes
      </Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

**Step 5: Verify manually**

Run: `pnpm dev`

- Open a game's rotation grid
- Click the gear icon — settings sheet slides up from bottom
- Toggle some players absent, change goalie assignments
- Click "Regenerate with Changes" — sheet closes, solver runs, grid updates with new schedule
- Verify the game in history is still the same game (same name, same ID)
- Verify absent player changes are persisted (refresh page, settings sheet shows updated attendance)

**Step 6: Commit**

```bash
git add src/pages/RotationGrid.tsx
git commit -m "feat: add settings sheet for editing game config before regenerating"
```

---

### Task 3: Verify build and lint

**Step 1: Run type check and build**

Run: `pnpm build`
Expected: No TypeScript errors, build succeeds.

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No new lint errors.

**Step 3: Fix any issues found**

Address any type errors or lint issues.

**Step 4: Final commit if needed**

```bash
git commit -m "fix: address build/lint issues"
```

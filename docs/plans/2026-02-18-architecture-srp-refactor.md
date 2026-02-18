# Architecture SRP Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decompose long, multi-responsibility files into focused components and hooks following Single Responsibility Principle.

**Architecture:** Extract shared UI patterns into reusable components, lift state logic into custom hooks, and move co-located sub-components into their own files. All refactors are pure restructuring — zero behavior changes. Every task ends with a passing test suite to confirm no regressions.

**Tech Stack:** React 19, TypeScript, Vitest, Tailwind CSS v4, shadcn/ui

---

## Conventions

- **Path alias:** `@/` → `src/`
- **Imports:** Direct path imports, no barrel files (e.g., `@/components/ui/button.tsx`)
- **Test command:** `pnpm vitest run` (CI mode, single run)
- **Single test file:** `pnpm vitest run src/path/to/file.test.ts`
- **Build check:** `pnpm build` (includes `tsc -b`)
- **Lint check:** `pnpm lint`

---

### Task 1: Extract `createConfigFromTemplate` utility

Deduplicate the identical GameConfig-from-template creation logic in `TeamManagement.tsx:307-324` and `GameSetup.tsx:274-295`.

**Files:**

- Create: `src/utils/gameConfig.ts`
- Modify: `src/pages/TeamManagement.tsx`
- Modify: `src/pages/GameSetup.tsx`

**Step 1: Create the utility**

Create `src/utils/gameConfig.ts`:

```ts
import { generateId } from '@/utils/id.ts';
import { DEFAULT_GAME_RULES } from '@/types/domain.ts';
import type { GameConfig, GameConfigTemplate } from '@/types/domain.ts';

export function createConfigFromTemplate(teamId: string, template: GameConfigTemplate): GameConfig {
  return {
    id: generateId(),
    teamId,
    name: template.name,
    fieldSize: template.fieldSize,
    periods: template.periods,
    periodDurationMinutes: template.periodDurationMinutes,
    rotationsPerPeriod: template.rotationsPerPeriod,
    usePositions: template.usePositions,
    formation: template.formation,
    useGoalie: template.useGoalie,
    ...DEFAULT_GAME_RULES,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
```

Note: Check the actual type of `GAME_CONFIG_TEMPLATES` entries in `domain.ts`. If there's no explicit `GameConfigTemplate` type, use the element type of that array (e.g., `(typeof GAME_CONFIG_TEMPLATES)[number]`).

**Step 2: Update TeamManagement.tsx**

Replace the inline config creation in the template buttons (around line 307-324) with:

```ts
import { createConfigFromTemplate } from '@/utils/gameConfig.ts';

// In the onClick handler:
const config = createConfigFromTemplate(teamId!, template);
dispatch({ type: 'ADD_GAME_CONFIG', payload: { teamId: teamId!, config } });
```

Remove the now-unused imports of `DEFAULT_GAME_RULES` and `generateId` if they're no longer used elsewhere in the file.

**Step 3: Update GameSetup.tsx**

Same replacement for the template buttons (around line 274-295):

```ts
import { createConfigFromTemplate } from '@/utils/gameConfig.ts';

// In the onClick handler:
const config = createConfigFromTemplate(teamId, template);
dispatch({ type: 'ADD_GAME_CONFIG', payload: { teamId, config } });
setConfigId(config.id);
```

**Step 4: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

Expected: All tests pass, build succeeds with no type errors.

**Step 5: Commit**

```bash
git add src/utils/gameConfig.ts src/pages/TeamManagement.tsx src/pages/GameSetup.tsx src/types/domain.ts
git commit -m "refactor: extract createConfigFromTemplate utility to deduplicate config creation"
```

---

### Task 2: Extract `SolverStatusCard` shared component

Both `GameSetup.tsx:414-439` and `RotationGrid.tsx:548-571` render the same solver progress bar + error card. Extract to a shared component.

**Files:**

- Create: `src/components/game/SolverStatusCard.tsx`
- Modify: `src/pages/GameSetup.tsx`
- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Create the component**

Create `src/components/game/SolverStatusCard.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card.tsx';

interface SolverStatusCardProps {
  isRunning: boolean;
  progress: number;
  message: string;
  error: string | null;
}

export function SolverStatusCard({ isRunning, progress, message, error }: SolverStatusCardProps) {
  return (
    <>
      {isRunning && (
        <Card>
          <CardContent className="py-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{message}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
```

Note: The RotationGrid version uses `h-1.5` while GameSetup uses `h-2` for the bar height. Choose one consistent height (use `h-1.5`, or check which looks better). Similarly GameSetup has `py-4` and `mb-1` differences — normalize to the simpler version.

**Step 2: Replace in RotationGrid.tsx**

Replace lines ~548-571 with:

```tsx
import { SolverStatusCard } from '@/components/game/SolverStatusCard.tsx';

// In the JSX:
<SolverStatusCard
  isRunning={solver.isRunning}
  progress={solver.progress}
  message={solver.message}
  error={solver.error}
/>;
```

Remove the now-unused `CardContent`/`CardHeader`/`CardTitle` imports only if they're no longer used elsewhere in RotationGrid (they likely still are — `Card`/`CardContent` are used in stats).

**Step 3: Replace in GameSetup.tsx**

Replace lines ~414-439 with the same `<SolverStatusCard ... />` usage.

**Step 4: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

**Step 5: Commit**

```bash
git add src/components/game/SolverStatusCard.tsx src/pages/GameSetup.tsx src/pages/RotationGrid.tsx
git commit -m "refactor: extract SolverStatusCard to deduplicate solver progress/error UI"
```

---

### Task 3: Extract `AttendanceList` shared component

Both `GameSetup.tsx:334-358` and `RotationGrid.tsx:992-1023` render the same checkbox-based player attendance list. Extract to a shared component.

**Files:**

- Create: `src/components/game/AttendanceList.tsx`
- Modify: `src/pages/GameSetup.tsx`
- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Create the component**

Create `src/components/game/AttendanceList.tsx`:

```tsx
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import type { Player, PlayerId } from '@/types/domain.ts';

interface AttendanceListProps {
  players: Player[];
  absentIds: Set<PlayerId>;
  onToggle: (playerId: PlayerId) => void;
}

export function AttendanceList({ players, absentIds, onToggle }: AttendanceListProps) {
  return (
    <div className="grid gap-1.5">
      {players.map((player) => {
        const isAbsent = absentIds.has(player.id);
        return (
          <div
            key={player.id}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
              isAbsent ? 'bg-destructive/10 opacity-60' : 'hover:bg-accent',
            )}
            onClick={() => onToggle(player.id)}
          >
            <Checkbox checked={!isAbsent} onCheckedChange={() => onToggle(player.id)} />
            <span className={cn('text-sm flex-1', isAbsent && 'line-through')}>{player.name}</span>
            <Badge variant="secondary" className="text-xs">
              {player.skillRanking}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Replace in GameSetup.tsx**

Replace the attendance grid (lines ~334-358) with:

```tsx
import { AttendanceList } from '@/components/game/AttendanceList.tsx';

<AttendanceList
  players={selectedRoster.players}
  absentIds={absentPlayerIds}
  onToggle={handleToggleAbsent}
/>;
```

**Step 3: Replace in RotationGrid.tsx**

Replace the attendance grid in the settings sheet (lines ~992-1023) with:

```tsx
import { AttendanceList } from '@/components/game/AttendanceList.tsx';

<AttendanceList players={roster.players} absentIds={editAbsent} onToggle={handleToggleAbsent} />;
```

**Step 4: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

**Step 5: Commit**

```bash
git add src/components/game/AttendanceList.tsx src/pages/GameSetup.tsx src/pages/RotationGrid.tsx
git commit -m "refactor: extract AttendanceList to deduplicate attendance checkbox UI"
```

---

### Task 4: Extract `GoalieAssignmentSelector` shared component

Both `GameSetup.tsx:373-397` and `RotationGrid.tsx:1029-1057` render per-period goalie Select dropdowns.

**Files:**

- Create: `src/components/game/GoalieAssignmentSelector.tsx`
- Modify: `src/pages/GameSetup.tsx`
- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Create the component**

Create `src/components/game/GoalieAssignmentSelector.tsx`:

```tsx
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import type { Player, GoalieAssignment, PlayerId } from '@/types/domain.ts';

interface GoalieAssignmentSelectorProps {
  periods: number;
  goalieAssignments: GoalieAssignment[];
  eligiblePlayers: Player[];
  onChange: (periodIndex: number, playerId: string) => void;
}

export function GoalieAssignmentSelector({
  periods,
  goalieAssignments,
  eligiblePlayers,
  onChange,
}: GoalieAssignmentSelectorProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: periods }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Label className="w-20 text-sm">Period {i + 1}</Label>
          <Select
            value={goalieAssignments.find((a) => a.periodIndex === i)?.playerId ?? 'auto'}
            onValueChange={(v) => onChange(i, v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-assign</SelectItem>
              {eligiblePlayers.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Replace in GameSetup.tsx**

Replace goalie section (lines ~373-397) with:

```tsx
import { GoalieAssignmentSelector } from '@/components/game/GoalieAssignmentSelector.tsx';

<GoalieAssignmentSelector
  periods={selectedConfig.periods}
  goalieAssignments={goalieAssignments}
  eligiblePlayers={activePlayers.filter((p) => p.canPlayGoalie)}
  onChange={handleGoalieChange}
/>;
```

**Step 3: Replace in RotationGrid.tsx**

Replace goalie section in settings sheet (lines ~1029-1057) with:

```tsx
import { GoalieAssignmentSelector } from '@/components/game/GoalieAssignmentSelector.tsx';

<GoalieAssignmentSelector
  periods={config.periods}
  goalieAssignments={editGoalies}
  eligiblePlayers={roster.players.filter((p) => p.canPlayGoalie && !editAbsent.has(p.id))}
  onChange={handleGoalieChange}
/>;
```

**Step 4: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

**Step 5: Commit**

```bash
git add src/components/game/GoalieAssignmentSelector.tsx src/pages/GameSetup.tsx src/pages/RotationGrid.tsx
git commit -m "refactor: extract GoalieAssignmentSelector to deduplicate goalie assignment UI"
```

---

### Task 5: Extract `GameSettingsSheet` from RotationGrid

The settings sheet (lines ~981-1067) is a self-contained feature that manages absent players and goalie assignments for regeneration.

**Files:**

- Create: `src/components/game/GameSettingsSheet.tsx`
- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Create the component**

Create `src/components/game/GameSettingsSheet.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet.tsx';
import { AttendanceList } from '@/components/game/AttendanceList.tsx';
import { GoalieAssignmentSelector } from '@/components/game/GoalieAssignmentSelector.tsx';
import type { Player, PlayerId, GoalieAssignment } from '@/types/domain.ts';

interface GameSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  initialAbsentIds: PlayerId[];
  initialGoalieAssignments: GoalieAssignment[];
  periods: number;
  useGoalie: boolean;
  onRegenerate: (absentIds: PlayerId[], goalieAssignments: GoalieAssignment[]) => void;
}

export function GameSettingsSheet({
  open,
  onOpenChange,
  players,
  initialAbsentIds,
  initialGoalieAssignments,
  periods,
  useGoalie,
  onRegenerate,
}: GameSettingsSheetProps) {
  const [editAbsent, setEditAbsent] = useState<Set<PlayerId>>(new Set(initialAbsentIds));
  const [editGoalies, setEditGoalies] = useState<GoalieAssignment[]>([...initialGoalieAssignments]);

  // Reset local state when sheet opens
  // (The parent passes fresh initial values each time it opens)
  const [lastOpen, setLastOpen] = useState(open);
  if (open && !lastOpen) {
    setEditAbsent(new Set(initialAbsentIds));
    setEditGoalies([...initialGoalieAssignments]);
  }
  if (open !== lastOpen) setLastOpen(open);

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

  function handleRegenerate() {
    onRegenerate([...editAbsent], useGoalie ? editGoalies : []);
    onOpenChange(false);
  }

  const eligibleGoalies = players.filter((p) => p.canPlayGoalie && !editAbsent.has(p.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Game Settings</SheetTitle>
          <SheetDescription>
            Edit attendance and goalie assignments, then regenerate.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Attendance ({players.filter((p) => !editAbsent.has(p.id)).length} / {players.length})
            </Label>
            <AttendanceList
              players={players}
              absentIds={editAbsent}
              onToggle={handleToggleAbsent}
            />
          </div>

          {useGoalie && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Goalie Assignment</Label>
              <GoalieAssignmentSelector
                periods={periods}
                goalieAssignments={editGoalies}
                eligiblePlayers={eligibleGoalies}
                onChange={handleGoalieChange}
              />
            </div>
          )}
        </div>

        <SheetFooter>
          <Button className="w-full" onClick={handleRegenerate}>
            Regenerate with Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 2: Replace in RotationGrid.tsx**

Remove the settings sheet JSX (lines ~981-1067), the `editAbsent`/`editGoalies` state, and the `handleToggleAbsent`/`handleGoalieChange`/`handleRegenerateWithSettings`/`handleOpenSettings` handlers. Replace with:

```tsx
import { GameSettingsSheet } from '@/components/game/GameSettingsSheet.tsx';

// In the component:
// Keep: const [settingsOpen, setSettingsOpen] = useState(false);
// Remove: editAbsent, editGoalies, handleToggleAbsent, handleGoalieChange, handleRegenerateWithSettings, handleOpenSettings

function handleRegenerateWithSettings(
  absentIds: PlayerId[],
  goalieAssignments: GoalieAssignment[],
) {
  if (!roster || !config || !game) return;
  const updatedGame: Game = {
    ...game,
    absentPlayerIds: absentIds,
    goalieAssignments,
  };
  dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
  solver.solve({
    players: roster.players,
    config,
    absentPlayerIds: absentIds,
    goalieAssignments,
    manualOverrides: game.manualOverrides,
  });
}

// In JSX, replace the Sheet block:
<GameSettingsSheet
  open={settingsOpen}
  onOpenChange={setSettingsOpen}
  players={roster.players}
  initialAbsentIds={game.absentPlayerIds}
  initialGoalieAssignments={game.goalieAssignments}
  periods={config?.periods ?? 2}
  useGoalie={config?.useGoalie ?? false}
  onRegenerate={handleRegenerateWithSettings}
/>;
```

Also update the settings button handler to just `setSettingsOpen(true)` (remove `handleOpenSettings` which was initializing the now-removed local state).

**Step 3: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

**Step 4: Commit**

```bash
git add src/components/game/GameSettingsSheet.tsx src/pages/RotationGrid.tsx
git commit -m "refactor: extract GameSettingsSheet from RotationGrid"
```

---

### Task 6: Extract `OverallStatsCards` and `PlayerStatsCard` from RotationGrid

Two presentational sections in RotationGrid that are easy to extract.

**Files:**

- Create: `src/components/game/OverallStatsCards.tsx`
- Create: `src/components/game/PlayerStatsCard.tsx`
- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Create OverallStatsCards**

Create `src/components/game/OverallStatsCards.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card.tsx';
import type { RotationSchedule } from '@/types/domain.ts';

interface OverallStatsCardsProps {
  stats: RotationSchedule['overallStats'];
}

export function OverallStatsCards({ stats }: OverallStatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">{stats.avgStrength}</p>
          <p className="text-xs text-muted-foreground">Avg Strength</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">
            {stats.minStrength}-{stats.maxStrength}
          </p>
          <p className="text-xs text-muted-foreground">Strength Range</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">{stats.strengthVariance.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Variance</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create PlayerStatsCard**

Create `src/components/game/PlayerStatsCard.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import type { Player, PlayerStats } from '@/types/domain.ts';

interface PlayerStatsCardProps {
  players: Player[];
  playerStats: Record<string, PlayerStats>;
  minPlayPercentage: number;
}

export function PlayerStatsCard({ players, playerStats, minPlayPercentage }: PlayerStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Player Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {players.map((player) => {
            const stats = playerStats[player.id];
            if (!stats) return null;
            return (
              <div key={player.id} className="flex items-center justify-between text-sm">
                <span>{player.name}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{stats.rotationsPlayed} played</span>
                  <span>{stats.rotationsBenched} bench</span>
                  {stats.rotationsGoalie > 0 && <span>{stats.rotationsGoalie} GK</span>}
                  <span
                    className={`font-medium ${
                      stats.playPercentage < minPlayPercentage
                        ? 'text-destructive'
                        : 'text-foreground'
                    }`}
                  >
                    {stats.playPercentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

Note: Check `domain.ts` for the exact shape of `PlayerStats` — it should have `rotationsPlayed`, `rotationsBenched`, `rotationsGoalie`, `playPercentage`. If `PlayerStats` isn't exported as a type, extract the type from `RotationSchedule['playerStats']`.

**Step 3: Replace in RotationGrid.tsx**

Replace the overall stats cards (lines ~574-599) with:

```tsx
import { OverallStatsCards } from '@/components/game/OverallStatsCards.tsx';

{
  !isLive && !isCompleted && <OverallStatsCards stats={schedule.overallStats} />;
}
```

Replace the player stats card (lines ~895-928) with:

```tsx
import { PlayerStatsCard } from '@/components/game/PlayerStatsCard.tsx';

{
  !isLive && !isCompleted && (
    <PlayerStatsCard
      players={sortedPlayers}
      playerStats={schedule.playerStats}
      minPlayPercentage={config?.minPlayPercentage ?? 50}
    />
  );
}
```

**Step 4: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

**Step 5: Commit**

```bash
git add src/components/game/OverallStatsCards.tsx src/components/game/PlayerStatsCard.tsx src/pages/RotationGrid.tsx
git commit -m "refactor: extract OverallStatsCards and PlayerStatsCard from RotationGrid"
```

---

### Task 7: Extract `RotationTable` from RotationGrid

This is the largest extraction — the `<table>` element with headers, body rows, and footer (~255 lines).

**Files:**

- Create: `src/components/game/RotationTable.tsx`
- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Create the component**

Create `src/components/game/RotationTable.tsx`. This component receives all the data it needs via props and handles only rendering.

```tsx
import { forwardRef } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { PlayerPopover } from '@/components/game/PlayerPopover.tsx';
import { SUB_POSITION_LABELS, RotationAssignment } from '@/types/domain.ts';
import type { Player, PlayerId, Rotation, PlayerStats, GameConfig } from '@/types/domain.ts';
import { getAssignmentDisplay } from '@/utils/positions.ts';

interface PeriodGroup {
  periodIndex: number;
  rotations: Rotation[];
}

interface RotationTableProps {
  periodGroups: PeriodGroup[];
  allDisplayPlayers: Player[];
  activePlayers: Player[];
  playerMap: Map<PlayerId, Player>;
  playerStats: Record<string, PlayerStats>;
  config: GameConfig;
  gameRemovedPlayerIds: PlayerId[];
  // Live mode state
  isLive: boolean;
  isCompleted: boolean;
  currentRotationIndex: number;
  changingPlayerIds: Set<PlayerId>;
  subTooltipMap: Map<PlayerId, string>;
  // Collapsed periods
  collapsedPeriods: Set<number>;
  togglePeriod: (periodIndex: number) => void;
  // Swap state
  swapSource: { rotationIndex: number; playerId: PlayerId } | null;
  onCellClick: (rotationIndex: number, playerId: PlayerId) => void;
  // Player management (live only)
  onRemovePlayer: (playerId: PlayerId) => void;
  onAddPlayerBack: (playerId: PlayerId) => void;
}

export const RotationTable = forwardRef<HTMLDivElement, RotationTableProps>(
  function RotationTable(props, ref) {
    const {
      periodGroups,
      allDisplayPlayers,
      playerMap,
      playerStats,
      config,
      gameRemovedPlayerIds,
      isLive,
      isCompleted,
      currentRotationIndex,
      changingPlayerIds,
      subTooltipMap,
      collapsedPeriods,
      togglePeriod,
      swapSource,
      onCellClick,
      onRemovePlayer,
      onAddPlayerBack,
    } = props;

    // Move the table rendering JSX here — the entire <div className="overflow-x-auto"> block
    // from RotationGrid lines ~629-884.
    // Replace inline references:
    //   - `schedule.playerStats[player.id]` → `playerStats[player.id]`
    //   - `game.removedPlayerIds` → `gameRemovedPlayerIds`
    //   - `config?.usePositions` → `config.usePositions`
    //   - `config?.minPlayPercentage` → `config.minPlayPercentage`
    //   - `handleCellClick(...)` → `onCellClick(...)`
    //   - `setRemovingPlayerId(player.id)` → `onRemovePlayer(player.id)`
    //   - `handleAddPlayerBack(player.id)` → `onAddPlayerBack(player.id)`

    return (
      <div className="overflow-x-auto" ref={ref}>
        {/* Copy the table JSX from RotationGrid.tsx lines ~630-884 with the prop replacements above */}
      </div>
    );
  },
);
```

This is a large JSX move. The key substitutions are:

- All data accessed from `game`, `schedule`, `config`, etc. → received as explicit props
- All handler calls → delegated to callback props
- The `ref` is forwarded for the auto-scroll behavior

**Step 2: Replace in RotationGrid.tsx**

Replace the `{(!isLive || viewMode === 'grid') && (...)}` block (lines ~628-884) with:

```tsx
import { RotationTable } from '@/components/game/RotationTable.tsx';

{
  (!isLive || viewMode === 'grid') && (
    <RotationTable
      ref={gridRef}
      periodGroups={periodGroups}
      allDisplayPlayers={allDisplayPlayers}
      activePlayers={activePlayers}
      playerMap={playerMap}
      playerStats={schedule.playerStats}
      config={config}
      gameRemovedPlayerIds={game.removedPlayerIds}
      isLive={isLive}
      isCompleted={isCompleted}
      currentRotationIndex={currentRotationIndex}
      changingPlayerIds={changingPlayerIds}
      subTooltipMap={subTooltipMap}
      collapsedPeriods={collapsedPeriods}
      togglePeriod={togglePeriod}
      swapSource={swapSource}
      onCellClick={handleCellClick}
      onRemovePlayer={(pid) => setRemovingPlayerId(pid)}
      onAddPlayerBack={handleAddPlayerBack}
    />
  );
}
```

**Step 3: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

The existing `RotationGrid.test.tsx` tests should continue to pass since they render the full page component.

**Step 4: Commit**

```bash
git add src/components/game/RotationTable.tsx src/pages/RotationGrid.tsx
git commit -m "refactor: extract RotationTable component from RotationGrid"
```

---

### Task 8: Extract `useRotationGame` hook from RotationGrid

Extract the state management, derived values, and handler logic from RotationGrid into a custom hook.

**Files:**

- Create: `src/hooks/useRotationGame.ts`
- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Create the hook**

Create `src/hooks/useRotationGame.ts`:

This hook encapsulates:

- All `useState` calls for swap state, pending swap, settings, confirmations, view mode, removing player
- All `useMemo` values: `periodGroups`, `changingPlayerIds`, `activePlayers`, `playerMap`, `subTooltipMap`
- All game handler functions: `handleCellClick`, `handleSwapThisRotation`, `handleSwapAllRemaining`, `handleStartGame`, `handleAdvance`, `handleRetreat`, `handleEndGame`, `handleConfirmRemovePlayer`, `handleAddPlayerBack`, `handleRegenerate`
- The solver result effect

```ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useSolver } from '@/hooks/useSolver.ts';
import { previewSwap, previewSwapRange } from '@/utils/stats.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type { PlayerId, Game, GoalieAssignment } from '@/types/domain.ts';

export function useRotationGame(gameId: string | undefined) {
  const { state, dispatch } = useAppContext();
  const solver = useSolver();

  // --- Core data ---
  const game = gameId ? state.games[gameId] : undefined;
  const team = game ? state.teams[game.teamId] : undefined;
  const roster = team?.rosters.find((r) => r.id === game?.rosterId);
  const config = team?.gameConfigs.find((c) => c.id === game?.gameConfigId);
  const schedule = game?.schedule;

  const isLive = game?.status === 'in-progress';
  const isCompleted = game?.status === 'completed';
  const currentRotationIndex = game?.currentRotationIndex ?? 0;
  const currentRotation = schedule?.rotations[currentRotationIndex];
  const nextRotation = schedule?.rotations[currentRotationIndex + 1];
  const currentPeriodIndex = currentRotation?.periodIndex ?? 0;

  // --- Swap state ---
  const [swapSource, setSwapSource] = useState<{
    rotationIndex: number;
    playerId: PlayerId;
  } | null>(null);
  const [pendingSwap, setPendingSwap] = useState<{
    rotationIndex: number;
    playerAId: PlayerId;
    playerBId: PlayerId;
  } | null>(null);

  // --- UI state ---
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmEndGame, setConfirmEndGame] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<PlayerId | null>(null);
  const [viewMode, setViewMode] = useState<'focus' | 'grid'>('focus');

  // --- Derived data ---
  const periodGroups = useMemo(() => {
    if (!schedule) return [];
    const groups: { periodIndex: number; rotations: typeof schedule.rotations }[] = [];
    for (const rotation of schedule.rotations) {
      const existing = groups.find((g) => g.periodIndex === rotation.periodIndex);
      if (existing) existing.rotations.push(rotation);
      else groups.push({ periodIndex: rotation.periodIndex, rotations: [rotation] });
    }
    return groups;
  }, [schedule]);

  const changingPlayerIds = useMemo(() => {
    if (!isLive || !currentRotation || !nextRotation) return new Set<PlayerId>();
    const changing = new Set<PlayerId>();
    for (const [playerId, nextAssignment] of Object.entries(nextRotation.assignments)) {
      if (currentRotation.assignments[playerId] !== nextAssignment) {
        changing.add(playerId as PlayerId);
      }
    }
    return changing;
  }, [isLive, currentRotation, nextRotation]);

  const activePlayers = useMemo(() => {
    if (!game || !roster) return [];
    return roster.players.filter(
      (p) => !game.absentPlayerIds.includes(p.id) && !game.removedPlayerIds.includes(p.id),
    );
  }, [game, roster]);

  const playerMap = useMemo(() => new Map(activePlayers.map((p) => [p.id, p])), [activePlayers]);

  const subTooltipMap = useMemo(() => {
    if (!isLive || !currentRotation || !nextRotation) return new Map<PlayerId, string>();
    const tips = new Map<PlayerId, string>();
    const comingIn: PlayerId[] = [];
    const goingOut: PlayerId[] = [];
    for (const pid of changingPlayerIds) {
      const cur = currentRotation.assignments[pid];
      const nxt = nextRotation.assignments[pid];
      if (cur === RotationAssignment.Bench && nxt !== RotationAssignment.Bench) comingIn.push(pid);
      if (cur !== RotationAssignment.Bench && nxt === RotationAssignment.Bench) goingOut.push(pid);
    }
    const matched = new Set<PlayerId>();
    if (currentRotation.fieldPositions && nextRotation.fieldPositions) {
      const curSubPosToPlayer = new Map<string, PlayerId>();
      for (const [pid, subPos] of Object.entries(currentRotation.fieldPositions)) {
        curSubPosToPlayer.set(subPos, pid as PlayerId);
      }
      for (const pid of comingIn) {
        const nextSubPos = nextRotation.fieldPositions![pid];
        if (!nextSubPos) continue;
        const replaced = curSubPosToPlayer.get(nextSubPos);
        if (replaced && replaced !== pid && goingOut.includes(replaced)) {
          const inName = playerMap.get(pid)?.name;
          const outName = playerMap.get(replaced)?.name;
          if (inName && outName) {
            tips.set(pid, `Replacing ${outName}`);
            tips.set(replaced, `Replaced by ${inName}`);
            matched.add(pid);
            matched.add(replaced);
          }
        }
      }
    }
    const unmatchedIn = comingIn.filter((p) => !matched.has(p));
    const unmatchedOut = goingOut.filter((p) => !matched.has(p));
    if (unmatchedIn.length === 1 && unmatchedOut.length === 1) {
      const inName = playerMap.get(unmatchedIn[0])?.name;
      const outName = playerMap.get(unmatchedOut[0])?.name;
      if (inName && outName) {
        tips.set(unmatchedIn[0], `Replacing ${outName}`);
        tips.set(unmatchedOut[0], `Replaced by ${inName}`);
      }
    }
    return tips;
  }, [isLive, currentRotation, nextRotation, changingPlayerIds, playerMap]);

  // --- Solver result effect ---
  const solverResult = solver.result;
  const solverReset = solver.reset;
  useEffect(() => {
    if (solverResult && gameId) {
      dispatch({ type: 'SET_GAME_SCHEDULE', payload: { gameId, schedule: solverResult } });
      solverReset();
    }
  }, [solverResult, gameId, dispatch, solverReset]);

  // --- Handlers ---
  function handleCellClick(rotationIndex: number, playerId: PlayerId) {
    if (isCompleted) return;
    if (isLive && rotationIndex < currentRotationIndex) return;
    if (!swapSource) {
      setSwapSource({ rotationIndex, playerId });
      return;
    }
    if (swapSource.rotationIndex === rotationIndex && swapSource.playerId === playerId) {
      setSwapSource(null);
      return;
    }
    if (swapSource.rotationIndex === rotationIndex && schedule) {
      setPendingSwap({ rotationIndex, playerAId: swapSource.playerId, playerBId: playerId });
      setSwapSource(null);
    } else {
      setSwapSource({ rotationIndex, playerId });
    }
  }

  function handleSwapThisRotation() {
    if (!pendingSwap || !schedule) return;
    const newSchedule = previewSwap(
      schedule,
      pendingSwap.rotationIndex,
      pendingSwap.playerAId,
      pendingSwap.playerBId,
      activePlayers,
    );
    dispatch({ type: 'SET_GAME_SCHEDULE', payload: { gameId: game!.id, schedule: newSchedule } });
    setPendingSwap(null);
  }

  function handleSwapAllRemaining() {
    if (!pendingSwap || !schedule) return;
    const newSchedule = previewSwapRange(
      schedule,
      pendingSwap.rotationIndex,
      pendingSwap.playerAId,
      pendingSwap.playerBId,
      activePlayers,
    );
    dispatch({ type: 'SET_GAME_SCHEDULE', payload: { gameId: game!.id, schedule: newSchedule } });
    setPendingSwap(null);
  }

  function handleStartGame() {
    if (!game) return;
    dispatch({
      type: 'UPDATE_GAME',
      payload: { ...game, status: 'in-progress', startedAt: Date.now() },
    });
  }

  function handleAdvance() {
    if (!gameId) return;
    if (currentRotationIndex >= (schedule?.rotations.length ?? 0) - 1) {
      setConfirmEndGame(true);
      return;
    }
    dispatch({ type: 'ADVANCE_ROTATION', payload: gameId });
  }

  function handleRetreat() {
    if (!gameId || currentRotationIndex <= 0) return;
    dispatch({ type: 'RETREAT_ROTATION', payload: gameId });
  }

  function handleEndGame() {
    if (!gameId || !game) return;
    dispatch({
      type: 'UPDATE_GAME',
      payload: { ...game, status: 'completed', completedAt: Date.now() },
    });
  }

  function handleConfirmRemovePlayer() {
    if (!gameId || !game || !config || !schedule || !removingPlayerId) return;
    const remainingPlayers = activePlayers.filter((p) => p.id !== removingPlayerId);
    if (remainingPlayers.length < config.fieldSize) {
      solver.setError(
        `Cannot remove player: only ${remainingPlayers.length} would remain, but ${config.fieldSize} are needed on field`,
      );
      setRemovingPlayerId(null);
      return;
    }
    dispatch({ type: 'REMOVE_PLAYER_FROM_GAME', payload: { gameId, playerId: removingPlayerId } });
    solver.solve({
      players: remainingPlayers,
      config,
      absentPlayerIds: [...game.absentPlayerIds, removingPlayerId, ...game.removedPlayerIds],
      goalieAssignments: game.goalieAssignments,
      manualOverrides: [],
      startFromRotation: game.currentRotationIndex,
      existingRotations: schedule.rotations,
    });
    setRemovingPlayerId(null);
  }

  function handleAddPlayerBack(playerId: PlayerId) {
    if (!gameId || !game || !roster || !config || !schedule) return;
    dispatch({ type: 'ADD_PLAYER_TO_GAME', payload: { gameId, playerId } });
    const returningPlayer = roster.players.find((p) => p.id === playerId);
    if (!returningPlayer) return;
    const updatedPlayers = [...activePlayers, returningPlayer];
    const updatedRemoved = game.removedPlayerIds.filter((id) => id !== playerId);
    solver.solve({
      players: updatedPlayers,
      config,
      absentPlayerIds: [...game.absentPlayerIds, ...updatedRemoved],
      goalieAssignments: game.goalieAssignments,
      manualOverrides: [],
      startFromRotation: game.currentRotationIndex,
      existingRotations: schedule.rotations,
    });
  }

  function handleRegenerate() {
    if (!roster || !config || !game) return;
    if (isLive && schedule) {
      solver.solve({
        players: activePlayers,
        config,
        absentPlayerIds: [...game.absentPlayerIds, ...game.removedPlayerIds],
        goalieAssignments: game.goalieAssignments,
        manualOverrides: [],
        startFromRotation: game.currentRotationIndex,
        existingRotations: schedule.rotations,
      });
    } else {
      solver.solve({
        players: roster.players,
        config,
        absentPlayerIds: game.absentPlayerIds,
        goalieAssignments: game.goalieAssignments,
        manualOverrides: game.manualOverrides,
      });
    }
  }

  function handleRegenerateWithSettings(
    absentIds: PlayerId[],
    goalieAssignments: GoalieAssignment[],
  ) {
    if (!roster || !config || !game) return;
    dispatch({
      type: 'UPDATE_GAME',
      payload: { ...game, absentPlayerIds: absentIds, goalieAssignments },
    });
    solver.solve({
      players: roster.players,
      config,
      absentPlayerIds: absentIds,
      goalieAssignments,
      manualOverrides: game.manualOverrides,
    });
  }

  // --- Computed display values ---
  const removedPlayers = roster?.players.filter((p) => game?.removedPlayerIds.includes(p.id)) ?? [];
  const isLastRotation = currentRotationIndex >= (schedule?.rotations.length ?? 0) - 1;
  const manyRotations = (schedule?.rotations.length ?? 0) > 4;
  const isCrossingPeriod = nextRotation ? nextRotation.periodIndex !== currentPeriodIndex : false;
  const removingPlayer = removingPlayerId
    ? (playerMap.get(removingPlayerId) ?? roster?.players.find((p) => p.id === removingPlayerId))
    : undefined;

  const sortedPlayers = [...activePlayers].sort((a, b) => b.skillRanking - a.skillRanking);
  const allDisplayPlayers = [
    ...sortedPlayers,
    ...removedPlayers.sort((a, b) => b.skillRanking - a.skillRanking),
  ];

  return {
    // Core data
    game,
    team,
    roster,
    config,
    schedule,
    isLive,
    isCompleted,
    currentRotationIndex,
    currentRotation,
    nextRotation,
    currentPeriodIndex,
    // Derived
    periodGroups,
    changingPlayerIds,
    activePlayers,
    playerMap,
    subTooltipMap,
    sortedPlayers,
    allDisplayPlayers,
    removedPlayers,
    isLastRotation,
    manyRotations,
    isCrossingPeriod,
    removingPlayer,
    // Solver
    solver,
    // Swap state
    swapSource,
    pendingSwap,
    setSwapSource,
    setPendingSwap,
    // UI state
    settingsOpen,
    setSettingsOpen,
    confirmEndGame,
    setConfirmEndGame,
    removingPlayerId,
    setRemovingPlayerId,
    viewMode,
    setViewMode,
    // Handlers
    handleCellClick,
    handleSwapThisRotation,
    handleSwapAllRemaining,
    handleStartGame,
    handleAdvance,
    handleRetreat,
    handleEndGame,
    handleConfirmRemovePlayer,
    handleAddPlayerBack,
    handleRegenerate,
    handleRegenerateWithSettings,
  };
}
```

**Step 2: Slim down RotationGrid.tsx**

Rewrite RotationGrid to use the hook + extracted components. It should now be ~200-300 lines: just route param extraction, hook call, timer, collapse, auto-scroll effect, and JSX orchestration.

```tsx
import { useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { Settings2, RotateCcwIcon } from 'lucide-react';
import { usePeriodTimer } from '@/hooks/usePeriodTimer.ts';
import { usePeriodCollapse } from '@/hooks/usePeriodCollapse.ts';
import { useRotationGame } from '@/hooks/useRotationGame.ts';
import { ConfirmDialog } from '@/components/ui/confirm-dialog.tsx';
import { SolverStatusCard } from '@/components/game/SolverStatusCard.tsx';
import { OverallStatsCards } from '@/components/game/OverallStatsCards.tsx';
import { PlayerStatsCard } from '@/components/game/PlayerStatsCard.tsx';
import { GameSettingsSheet } from '@/components/game/GameSettingsSheet.tsx';
import { RotationTable } from '@/components/game/RotationTable.tsx';
import { SwapScopeDialog } from '@/components/game/SwapScopeDialog.tsx';
import { LiveFocusView } from '@/components/game/LiveFocusView.tsx';
import { LiveBottomBar } from '@/components/game/LiveBottomBar.tsx';

// Keep RotationPips as a small local component (it's only ~40 lines)

export function RotationGrid() {
  const { gameId } = useParams<{ gameId: string }>();
  const g = useRotationGame(gameId);
  // ... timer, collapse, auto-scroll, and pure JSX layout calling extracted components
}
```

**Step 3: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

**Step 4: Commit**

```bash
git add src/hooks/useRotationGame.ts src/pages/RotationGrid.tsx
git commit -m "refactor: extract useRotationGame hook from RotationGrid"
```

---

### Task 9: Extract `DrillCard` from Practice.tsx to its own file

`DrillCard` is already a self-contained component with its own props interface — it just needs to move.

**Files:**

- Create: `src/components/DrillCard.tsx`
- Modify: `src/pages/Practice.tsx`

**Step 1: Move DrillCard**

Create `src/components/DrillCard.tsx` with the `DrillCard` component (Practice.tsx lines ~529-683), its props interface, and the `IntensityDots`, `StarIcon`, `SwapIcon` helper components (lines ~689-750).

These helpers are only used by DrillCard, so they should move with it.

Add the necessary imports that DrillCard uses:

```ts
import { Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { DrillDiagram } from '@/components/DrillDiagram.tsx';
import { getPhaseColor, getIntensityDisplay } from '@/utils/drillDisplay.ts';
import { DRILL_CATEGORY_LABELS } from '@/types/drill.ts';
import type { Drill, DrillCategory } from '@/types/drill.ts';
```

Also move the `CATEGORY_COLORS` constant and `EQUIPMENT_ICONS` map that are used by DrillCard.

**Step 2: Update Practice.tsx**

Remove DrillCard, IntensityDots, StarIcon, SwapIcon, CATEGORY_COLORS, and EQUIPMENT_ICONS from Practice.tsx. Add:

```ts
import { DrillCard, StarIcon } from '@/components/DrillCard.tsx';
```

Note: `StarIcon` is also used directly in Practice.tsx for the favorites button. Either export it from DrillCard.tsx or move it to a shared location.

**Step 3: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

**Step 4: Commit**

```bash
git add src/components/DrillCard.tsx src/pages/Practice.tsx
git commit -m "refactor: move DrillCard to its own file"
```

---

### Task 10: Extract `usePracticePlan` hook from Practice.tsx

Extract the plan generation state, session storage persistence, and swap logic.

**Files:**

- Create: `src/hooks/usePracticePlan.ts`
- Modify: `src/pages/Practice.tsx`

**Step 1: Create the hook**

Create `src/hooks/usePracticePlan.ts`:

This hook encapsulates:

- Plan input state: `birthYear`, `playerCount`, `selectedCategories`, `targetDuration`, `favoritesOnly`, `seed`
- Session storage persistence (debounced save/load)
- Plan generation via `generatePracticePlan` memo
- Swap state and `handleSwap`
- Browse state (`browseSearch`, `browseCategory`, `browseDrills`, `groupedBrowseDrills`)
- Expand/toggle state management

```ts
import { useState, useMemo, useRef, useEffect } from 'react';
import { DRILLS } from '@/data/drills.ts';
import { getDrillBracket, getUAge, uAgeToBirthYear } from '@/utils/age.ts';
import { generatePracticePlan } from '@/utils/practiceGenerator.ts';
import { YOUNG_CATEGORIES, ALL_CATEGORIES } from '@/types/drill.ts';
import type { DrillCategory, Drill, DrillPhase } from '@/types/drill.ts';
import type { DrillAgeGroup } from '@/utils/age.ts';

const SESSION_KEY = 'practice_plan_state';
const PHASE_ORDER: DrillPhase[] = ['warm-up', 'main', 'scrimmage', 'cool-down'];

interface PersistentPlanState {
  birthYear: number | null;
  playerCount: number;
  selectedCategories: DrillCategory[];
  targetDuration: number;
  favoritesOnly: boolean;
  seed: number;
}

function loadPlanState(): Partial<PersistentPlanState> {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function savePlanState(state: PersistentPlanState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    /* silently ignore */
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function usePracticePlan(options: {
  initialBirthYear: number | null;
  initialPlayerCount: number;
  favoriteDrillIds: string[];
}) {
  const saved = loadPlanState();

  const [birthYear, setBirthYear] = useState<number | null>(
    options.initialBirthYear ?? saved.birthYear ?? null,
  );
  const [playerCount, setPlayerCount] = useState(
    options.initialBirthYear ? options.initialPlayerCount : (saved.playerCount ?? 10),
  );
  const [selectedCategories, setSelectedCategories] = useState<DrillCategory[]>(
    saved.selectedCategories ?? [],
  );
  const [targetDuration, setTargetDuration] = useState(saved.targetDuration ?? 60);
  const [favoritesOnly, setFavoritesOnly] = useState(saved.favoritesOnly ?? false);
  const [seed, setSeed] = useState(() => saved.seed ?? Date.now());
  const [expandedDrillIds, setExpandedDrillIds] = useState<Set<string>>(new Set());
  const [swappedDrills, setSwappedDrills] = useState<Map<number, Drill>>(new Map());
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseCategory, setBrowseCategory] = useState<DrillCategory | null>(null);

  // Session storage persistence
  const planInputs = useMemo(
    () => ({ birthYear, playerCount, selectedCategories, targetDuration, favoritesOnly, seed }),
    [birthYear, playerCount, selectedCategories, targetDuration, favoritesOnly, seed],
  );
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => savePlanState(planInputs), 300);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [planInputs]);

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
      favoriteIds: options.favoriteDrillIds,
      seed,
    });
  }, [
    drillBracket,
    playerCount,
    selectedCategories,
    targetDuration,
    favoritesOnly,
    options.favoriteDrillIds,
    seed,
  ]);

  const browseDrills = useMemo(() => {
    if (!drillBracket || selectedCategories.length > 0) return null;
    return DRILLS.filter((d) => {
      if (!d.ageGroups.includes(drillBracket)) return false;
      if (d.minPlayers > playerCount) return false;
      if (browseCategory && d.category !== browseCategory) return false;
      if (browseSearch) {
        const q = browseSearch.toLowerCase();
        if (!d.name.toLowerCase().includes(q) && !d.description.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [drillBracket, playerCount, selectedCategories, browseSearch, browseCategory]);

  // Reset swaps when plan changes
  const planKey = plan ? plan.drills.map((d) => d.id).join(',') : '';
  const [lastPlanKey, setLastPlanKey] = useState(planKey);
  if (planKey !== lastPlanKey) {
    setLastPlanKey(planKey);
    setSwappedDrills(new Map());
  }

  const displayDrills = useMemo(() => {
    if (!plan) return null;
    return plan.drills.map((d, i) => swappedDrills.get(i) ?? d);
  }, [plan, swappedDrills]);

  const totalDuration = useMemo(() => {
    if (!displayDrills) return 0;
    return displayDrills.reduce((sum, d) => sum + d.durationMinutes, 0);
  }, [displayDrills]);

  const availableCategories: DrillCategory[] = useMemo(() => {
    if (!drillBracket) return [];
    const youngBrackets: DrillAgeGroup[] = ['U6', 'U8', 'U10'];
    return youngBrackets.includes(drillBracket) ? YOUNG_CATEGORIES : ALL_CATEGORIES;
  }, [drillBracket]);

  const groupedBrowseDrills = useMemo(() => {
    if (!browseDrills) return null;
    const groups: Record<DrillPhase, Drill[]> = {
      'warm-up': [],
      main: [],
      scrimmage: [],
      'cool-down': [],
    };
    for (const drill of browseDrills) groups[drill.phase].push(drill);
    return groups;
  }, [browseDrills]);

  function toggleCategory(cat: DrillCategory) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function toggleExpanded(drillId: string) {
    setExpandedDrillIds((prev) => {
      const next = new Set(prev);
      if (next.has(drillId)) next.delete(drillId);
      else next.add(drillId);
      return next;
    });
  }

  function handleSwap(index: number) {
    if (!plan || !displayDrills) return;
    const currentDrill = displayDrills[index];
    const planDrillIds = new Set(displayDrills.map((d) => d.id));
    const candidates = DRILLS.filter((d) => {
      if (d.id === currentDrill.id || planDrillIds.has(d.id)) return false;
      if (d.phase !== currentDrill.phase) return false;
      if (!drillBracket || !d.ageGroups.includes(drillBracket)) return false;
      if (d.minPlayers > playerCount) return false;
      if (
        currentDrill.phase === 'main' &&
        selectedCategories.length > 0 &&
        !selectedCategories.includes(d.category)
      )
        return false;
      if (favoritesOnly && !options.favoriteDrillIds.includes(d.id)) return false;
      return true;
    });
    if (candidates.length === 0) return;
    setSwappedDrills((prev) => {
      const next = new Map(prev);
      next.set(index, pickRandom(candidates));
      return next;
    });
  }

  function handleBirthYearInput(value: string) {
    if (value === '') {
      setBirthYear(null);
      return;
    }
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) setBirthYear(parsed);
  }

  function selectUAge(uAge: number) {
    setBirthYear(uAgeToBirthYear(uAge));
  }

  return {
    // State
    birthYear,
    playerCount,
    selectedCategories,
    targetDuration,
    favoritesOnly,
    seed,
    expandedDrillIds,
    browseSearch,
    browseCategory,
    drillBracket,
    // Derived
    plan,
    displayDrills,
    totalDuration,
    availableCategories,
    browseDrills,
    groupedBrowseDrills,
    // Setters
    setPlayerCount,
    setTargetDuration,
    setFavoritesOnly,
    setSeed,
    setBrowseSearch,
    setBrowseCategory,
    setSelectedCategories,
    // Handlers
    toggleCategory,
    toggleExpanded,
    handleSwap,
    handleBirthYearInput,
    selectUAge,
    // Constants
    PHASE_ORDER,
  };
}
```

**Step 2: Slim down Practice.tsx**

Rewrite Practice.tsx to use `usePracticePlan` + `DrillCard`. The page should now be ~200-250 lines of pure layout/JSX.

**Step 3: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

**Step 4: Commit**

```bash
git add src/hooks/usePracticePlan.ts src/pages/Practice.tsx
git commit -m "refactor: extract usePracticePlan hook from Practice"
```

---

### Task 11: Extract `PlayerImportDialog` from RosterEditor.tsx

The 2-step import flow is self-contained with its own state.

**Files:**

- Create: `src/components/game/PlayerImportDialog.tsx`
- Modify: `src/pages/RosterEditor.tsx`

**Step 1: Create the component**

Create `src/components/game/PlayerImportDialog.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { parsePlayerImport } from '@/utils/parsePlayerImport.ts';
import type { Player, SkillRanking } from '@/types/domain.ts';

interface ImportRow {
  name: string;
  skillRanking: SkillRanking;
  canPlayGoalie: boolean;
  existingPlayerId: string | null;
  error: string | null;
}

interface PlayerImportDialogProps {
  existingPlayers: Player[];
  onImport: (rows: ImportRow[]) => void;
  trigger: React.ReactNode;
}

export function PlayerImportDialog({
  existingPlayers,
  onImport,
  trigger,
}: PlayerImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStep, setImportStep] = useState<'paste' | 'preview'>('paste');
  const [importRows, setImportRows] = useState<ImportRow[]>([]);

  function handleParse() {
    const parsed = parsePlayerImport(importText);
    const rows: ImportRow[] = parsed.map((p) => {
      if ('error' in p) {
        return {
          name: p.name,
          skillRanking: 3,
          canPlayGoalie: false,
          existingPlayerId: null,
          error: p.error,
        };
      }
      const existing = existingPlayers.find((rp) => rp.name.toLowerCase() === p.name.toLowerCase());
      return {
        name: p.name,
        skillRanking: p.skillRanking,
        canPlayGoalie: existing?.canPlayGoalie ?? false,
        existingPlayerId: existing?.id ?? null,
        error: null,
      };
    });
    setImportRows(rows);
    setImportStep('preview');
  }

  function handleSave() {
    const validRows = importRows.filter((r) => !r.error);
    onImport(validRows);
    handleClose();
  }

  function handleClose() {
    setOpen(false);
    setImportText('');
    setImportStep('paste');
    setImportRows([]);
  }

  function updateRow(index: number, updates: Partial<ImportRow>) {
    setImportRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  }

  function removeRow(index: number) {
    setImportRows((rows) => rows.filter((_, i) => i !== index));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{importStep === 'paste' ? 'Import Players' : 'Review Import'}</DialogTitle>
        </DialogHeader>

        {/* Paste step and preview step JSX — move from RosterEditor.tsx lines ~257-358 */}
        {/* Replace handleImportParse → handleParse, handleImportSave → handleSave, etc. */}
        {/* Replace updateImportRow → updateRow, removeImportRow → removeRow */}
      </DialogContent>
    </Dialog>
  );
}

export type { ImportRow };
```

**Step 2: Update RosterEditor.tsx**

Remove the import dialog state (`isImporting`, `importText`, `importStep`, `importRows`), handlers (`handleImportParse`, `handleImportSave`, `handleImportClose`, `updateImportRow`, `removeImportRow`), and the `ImportRow` interface.

Replace with:

```tsx
import { PlayerImportDialog, type ImportRow } from '@/components/game/PlayerImportDialog.tsx';

function handleImportRows(rows: ImportRow[]) {
  if (!teamId || !rosterId) return;
  for (const row of rows) {
    if (row.existingPlayerId) {
      const existing = roster?.players.find((p) => p.id === row.existingPlayerId);
      dispatch({
        type: 'UPDATE_PLAYER',
        payload: {
          teamId,
          rosterId,
          player: {
            id: row.existingPlayerId,
            name: row.name.trim(),
            skillRanking: row.skillRanking,
            canPlayGoalie: row.canPlayGoalie,
            primaryPosition: existing?.primaryPosition ?? null,
            secondaryPositions: existing?.secondaryPositions ?? [],
            createdAt: existing?.createdAt ?? Date.now(),
          },
        },
      });
    } else {
      dispatch({
        type: 'ADD_PLAYER',
        payload: {
          teamId,
          rosterId,
          player: {
            id: generateId(),
            name: row.name.trim(),
            skillRanking: row.skillRanking,
            canPlayGoalie: row.canPlayGoalie,
            primaryPosition: null,
            secondaryPositions: [],
            createdAt: Date.now(),
          },
        },
      });
    }
  }
}

// In JSX:
<PlayerImportDialog
  existingPlayers={roster.players}
  onImport={handleImportRows}
  trigger={
    <Button variant="outline" size="sm">
      Import Players
    </Button>
  }
/>;
```

**Step 3: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

**Step 4: Commit**

```bash
git add src/components/game/PlayerImportDialog.tsx src/pages/RosterEditor.tsx
git commit -m "refactor: extract PlayerImportDialog from RosterEditor"
```

---

### Task 12: Extract undo system from AppContext

Extract the undo stack, `produceWithPatches`, and `getUndoDescription` into a dedicated hook.

**Files:**

- Create: `src/hooks/useUndoReducer.ts`
- Modify: `src/context/AppContext.tsx`

**Step 1: Create the hook**

Create `src/hooks/useUndoReducer.ts`:

```ts
import { useReducer, useCallback, useRef, useState, useEffect } from 'react';
import { produce, produceWithPatches, applyPatches, type Patch } from 'immer';
import type { AppState, AppAction } from '@/context/AppContext.tsx';
import { applyAction, appReducer } from '@/context/AppContext.tsx';

interface UndoEntry {
  description: string;
  inversePatches: Patch[];
  timestamp: number;
}

const MAX_UNDO = 30;

const UNDOABLE_ACTIONS = new Set<AppAction['type']>([
  'DELETE_TEAM',
  'DELETE_ROSTER',
  'DELETE_PLAYER',
  'DELETE_GAME',
  'DELETE_GAME_CONFIG',
  'IMPORT_DATA',
  'MERGE_DATA',
]);

function getUndoDescription(action: AppAction, state: AppState): string {
  switch (action.type) {
    case 'DELETE_TEAM': {
      const team = state.teams[action.payload];
      return `Deleted ${team?.name ?? 'team'}`;
    }
    case 'DELETE_ROSTER': {
      const team = state.teams[action.payload.teamId];
      const roster = team?.rosters.find((r) => r.id === action.payload.rosterId);
      return `Deleted roster ${roster?.name ?? ''}`.trim();
    }
    case 'DELETE_PLAYER': {
      const team = state.teams[action.payload.teamId];
      const roster = team?.rosters.find((r) => r.id === action.payload.rosterId);
      const player = roster?.players.find((p) => p.id === action.payload.playerId);
      return `Removed ${player?.name ?? 'player'}`;
    }
    case 'DELETE_GAME': {
      const game = state.games[action.payload];
      return `Deleted ${game?.name ?? 'game'}`;
    }
    case 'DELETE_GAME_CONFIG': {
      const team = state.teams[action.payload.teamId];
      const config = team?.gameConfigs.find((c) => c.id === action.payload.configId);
      return `Deleted config ${config?.name ?? ''}`.trim();
    }
    case 'IMPORT_DATA':
      return 'Imported data (replaced all)';
    case 'MERGE_DATA':
      return 'Merged imported data';
    default:
      return 'Action';
  }
}

export function useUndoReducer(initialState: AppState) {
  const [state, rawDispatch] = useReducer(appReducer, initialState);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const undoStackRef = useRef<UndoEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const dispatch = useCallback((action: AppAction) => {
    if (UNDOABLE_ACTIONS.has(action.type)) {
      const currentState = stateRef.current;
      const description = getUndoDescription(action, currentState);
      const [nextState, , inversePatches] = produceWithPatches(currentState, (draft) =>
        applyAction(draft, action),
      );
      undoStackRef.current.push({ description, inversePatches, timestamp: Date.now() });
      if (undoStackRef.current.length > MAX_UNDO) {
        undoStackRef.current.splice(0, undoStackRef.current.length - MAX_UNDO);
      }
      setCanUndo(true);
      rawDispatch({ type: 'LOAD_DATA', payload: nextState });
    } else {
      rawDispatch(action);
    }
  }, []);

  const undo = useCallback((): string | null => {
    const entry = undoStackRef.current.pop();
    if (!entry) return null;
    const restored = applyPatches(stateRef.current, entry.inversePatches);
    rawDispatch({ type: 'LOAD_DATA', payload: restored as AppState });
    setCanUndo(undoStackRef.current.length > 0);
    return entry.description;
  }, []);

  return { state, dispatch, undo, canUndo };
}
```

**Step 2: Simplify AppContext.tsx**

Replace the inline undo logic in `AppProvider` with:

```tsx
import { useUndoReducer } from '@/hooks/useUndoReducer.ts';

export function AppProvider({ children }: { children: ReactNode }) {
  const initialState = useMemo(() => {
    const saved = loadData();
    if (saved)
      return {
        teams: saved.teams,
        games: saved.games,
        favoriteDrillIds: saved.favoriteDrillIds ?? [],
      };
    return INITIAL_STATE;
  }, []);

  const { state, dispatch, undo, canUndo } = useUndoReducer(initialState);

  // Persistence (keep as-is)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveData({
        version: CURRENT_VERSION,
        teams: state.teams,
        games: state.games,
        favoriteDrillIds: state.favoriteDrillIds,
      });
    }, 500);
    return () => clearTimeout(saveTimeout.current);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch, undo, canUndo }}>{children}</AppContext.Provider>
  );
}
```

Remove from AppContext.tsx: `UndoEntry`, `MAX_UNDO`, `UNDOABLE_ACTIONS`, `getUndoDescription`, the inline `stateRef`, `undoStackRef`, `canUndo`, `dispatch` callback, and `undo` callback. Also remove `enablePatches`, `produceWithPatches`, `applyPatches`, and `Patch` imports if no longer used.

Keep exports of `applyAction`, `appReducer`, `AppState`, `AppAction`, `AppContext`, `AppContextValue`, and `AppProvider`.

**Step 3: Run tests and build**

```bash
pnpm vitest run
pnpm build
```

The existing `AppContext.test.ts` should continue to pass since it tests via the provider.

**Step 4: Commit**

```bash
git add src/hooks/useUndoReducer.ts src/context/AppContext.tsx
git commit -m "refactor: extract undo system from AppContext into useUndoReducer hook"
```

---

### Task 13: Final verification

**Step 1: Run full test suite**

```bash
pnpm vitest run
```

Expected: All tests pass.

**Step 2: Run build**

```bash
pnpm build
```

Expected: TypeScript compiles with no errors, Vite bundles successfully.

**Step 3: Run lint**

```bash
pnpm lint
```

Expected: No lint errors.

**Step 4: Run dev server and smoke test**

```bash
pnpm dev
```

Manually verify:

- Dashboard loads, team list renders
- Create a team → add roster → add players
- Create game config → new game → generate rotations
- Rotation grid renders with stats cards
- Settings sheet opens and works
- Start game → live mode works
- Practice page generates plans
- Import players dialog works

**Step 5: Commit any lint/type fixes if needed**

```bash
git add -A
git commit -m "refactor: fix lint/type issues from architecture refactor"
```

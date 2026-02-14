# Unified Live Grid Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the RotationGrid and GameDay views into a single adaptive page that serves as both the planning grid and the live game-day interface.

**Architecture:** The existing `RotationGrid.tsx` page gains game-state awareness (setup / in-progress / completed) to render different overlays. A new `LiveBottomBar` component provides sticky timer + controls. Period collapsing and auto-scroll are local UI state. The separate `GameDay.tsx` page and `/live` route are removed.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Popover, Button, Badge), existing `usePeriodTimer` hook, existing `useSolver` hook.

**Design doc:** `docs/plans/2026-02-14-unified-live-grid-design.md`

---

### Task 1: Fix Timer NaN Bug

**Files:**
- Modify: `src/hooks/usePeriodTimer.ts:37-42`

**Step 1: Write the failing test**

Create `src/hooks/usePeriodTimer.test.ts`:

```ts
import { formatTime } from '@/hooks/usePeriodTimer.ts';

describe('formatTime', () => {
  it('formats 0ms as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats NaN as 0:00', () => {
    expect(formatTime(NaN)).toBe('0:00');
  });

  it('formats normal time correctly', () => {
    expect(formatTime(90000)).toBe('1:30');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/hooks/usePeriodTimer.test.ts`
Expected: FAIL — `formatTime` is not exported (it's a local function).

**Step 3: Export `formatTime` and add NaN guard**

In `src/hooks/usePeriodTimer.ts`, change the `formatTime` function:

```ts
export function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/hooks/usePeriodTimer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/usePeriodTimer.ts src/hooks/usePeriodTimer.test.ts
git commit -m "fix: guard formatTime against NaN input"
```

---

### Task 2: Create LiveBottomBar Component

**Files:**
- Create: `src/components/game/LiveBottomBar.tsx`
- Test: `src/components/game/LiveBottomBar.test.tsx`

**Step 1: Write the failing test**

Create `src/components/game/LiveBottomBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveBottomBar } from './LiveBottomBar.tsx';
import type { UsePeriodTimerResult } from '@/hooks/usePeriodTimer.ts';

function buildTimer(overrides?: Partial<UsePeriodTimerResult>): UsePeriodTimerResult {
  return {
    elapsedMs: 330000,
    isRunning: true,
    formattedElapsed: '5:30',
    formattedDuration: '25:00',
    progress: 0.22,
    markers: [{ progress: 0.5, timeMs: 750000 }],
    periodIndex: 0,
    isOvertime: false,
    play: vi.fn(),
    pause: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

describe('LiveBottomBar', () => {
  it('renders timer display', () => {
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={false}
        isCrossingPeriod={false}
        swapPlayerName={null}
        onCancelSwap={vi.fn()}
      />
    );
    expect(screen.getByText(/5:30/)).toBeInTheDocument();
    expect(screen.getByText(/25:00/)).toBeInTheDocument();
  });

  it('shows NEXT button', () => {
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={false}
        isCrossingPeriod={false}
        swapPlayerName={null}
        onCancelSwap={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('shows END GAME on last rotation', () => {
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={true}
        isCrossingPeriod={false}
        swapPlayerName={null}
        onCancelSwap={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /end game/i })).toBeInTheDocument();
  });

  it('shows swap mode indicator when swapPlayerName is set', () => {
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={false}
        isCrossingPeriod={false}
        swapPlayerName="Alex"
        onCancelSwap={vi.fn()}
      />
    );
    expect(screen.getByText(/swapping alex/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancelSwap when cancel is clicked', async () => {
    const onCancelSwap = vi.fn();
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={false}
        isCrossingPeriod={false}
        swapPlayerName="Alex"
        onCancelSwap={onCancelSwap}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancelSwap).toHaveBeenCalled();
  });

  it('shows NEXT PERIOD at period boundary', () => {
    render(
      <LiveBottomBar
        timer={buildTimer()}
        onAdvance={vi.fn()}
        isLastRotation={false}
        isCrossingPeriod={true}
        swapPlayerName={null}
        onCancelSwap={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /next period/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/game/LiveBottomBar.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement LiveBottomBar**

Create `src/components/game/LiveBottomBar.tsx`:

```tsx
import { PlayIcon, PauseIcon, RotateCcwIcon, XIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import type { UsePeriodTimerResult } from '@/hooks/usePeriodTimer.ts';

interface LiveBottomBarProps {
  timer: UsePeriodTimerResult;
  onAdvance: () => void;
  isLastRotation: boolean;
  isCrossingPeriod: boolean;
  swapPlayerName: string | null;
  onCancelSwap: () => void;
}

export function LiveBottomBar({
  timer,
  onAdvance,
  isLastRotation,
  isCrossingPeriod,
  swapPlayerName,
  onCancelSwap,
}: LiveBottomBarProps) {
  const nextMarker = timer.markers.find((m) => timer.elapsedMs < m.timeMs);
  const nextSubMin = nextMarker ? Math.ceil((nextMarker.timeMs - timer.elapsedMs) / 60000) : null;

  const advanceLabel = isLastRotation
    ? 'End Game'
    : isCrossingPeriod
      ? 'Next Period'
      : 'Next';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg animate-in slide-in-from-bottom duration-300">
      {/* Progress strip along top edge */}
      <div className="relative h-1 bg-secondary">
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-1000",
            timer.isOvertime ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${timer.progress * 100}%` }}
        />
        {timer.markers.map((marker, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
            style={{ left: `${marker.progress * 100}%` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Left: Timer + controls */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-mono font-bold tabular-nums text-lg",
            timer.isOvertime && "text-destructive",
          )}>
            {timer.formattedElapsed}
          </span>
          <span className="text-sm text-muted-foreground">/ {timer.formattedDuration}</span>
          {timer.isRunning ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={timer.pause} aria-label="Pause timer">
              <PauseIcon className="size-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={timer.play} aria-label="Start timer">
              <PlayIcon className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={timer.reset} aria-label="Reset timer">
            <RotateCcwIcon className="size-4" />
          </Button>
        </div>

        {/* Center: swap mode indicator OR next sub hint */}
        <div className="flex-1 text-center text-sm">
          {swapPlayerName ? (
            <div className="flex items-center justify-center gap-2">
              <span className="font-medium text-primary">
                Swapping {swapPlayerName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={onCancelSwap}
                aria-label="Cancel swap"
              >
                <XIcon className="size-3 mr-1" />
                Cancel
              </Button>
            </div>
          ) : nextSubMin != null && !timer.isOvertime ? (
            <span className="text-muted-foreground">Next sub ~{nextSubMin} min</span>
          ) : null}
        </div>

        {/* Right: Advance button */}
        <Button
          size="lg"
          className="px-6"
          onClick={onAdvance}
          aria-label={advanceLabel}
        >
          {advanceLabel}
          {!isLastRotation && <ChevronRightIcon className="size-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/game/LiveBottomBar.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/game/LiveBottomBar.tsx src/components/game/LiveBottomBar.test.tsx
git commit -m "feat: add LiveBottomBar component for game-day controls"
```

---

### Task 3: Create PlayerPopover Component

**Files:**
- Create: `src/components/game/PlayerPopover.tsx`
- Test: `src/components/game/PlayerPopover.test.tsx`

**Step 1: Write the failing test**

Create `src/components/game/PlayerPopover.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerPopover } from './PlayerPopover.tsx';
import type { PlayerStats } from '@/types/domain.ts';

describe('PlayerPopover', () => {
  const stats: PlayerStats = {
    rotationsPlayed: 5,
    rotationsBenched: 2,
    rotationsGoalie: 1,
    playPercentage: 75,
    benchPercentage: 25,
  };

  it('shows player stats when trigger is clicked', async () => {
    render(
      <PlayerPopover
        playerName="Alex"
        stats={stats}
        isRemoved={false}
        onRemove={vi.fn()}
        onAddBack={vi.fn()}
      >
        <button>Alex</button>
      </PlayerPopover>
    );
    await userEvent.click(screen.getByText('Alex'));
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/5 played/)).toBeInTheDocument();
  });

  it('shows remove button when not removed', async () => {
    const onRemove = vi.fn();
    render(
      <PlayerPopover
        playerName="Alex"
        stats={stats}
        isRemoved={false}
        onRemove={onRemove}
        onAddBack={vi.fn()}
      >
        <button>Alex</button>
      </PlayerPopover>
    );
    await userEvent.click(screen.getByText('Alex'));
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('shows add back button when removed', async () => {
    render(
      <PlayerPopover
        playerName="Alex"
        stats={stats}
        isRemoved={true}
        onRemove={vi.fn()}
        onAddBack={vi.fn()}
      >
        <button>Alex</button>
      </PlayerPopover>
    );
    await userEvent.click(screen.getByText('Alex'));
    expect(screen.getByRole('button', { name: /add back/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/game/PlayerPopover.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement PlayerPopover**

Create `src/components/game/PlayerPopover.tsx`:

```tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { PlayerStats } from '@/types/domain.ts';

interface PlayerPopoverProps {
  playerName: string;
  stats: PlayerStats | undefined;
  isRemoved: boolean;
  onRemove: () => void;
  onAddBack: () => void;
  children: React.ReactNode;
}

export function PlayerPopover({
  playerName,
  stats,
  isRemoved,
  onRemove,
  onAddBack,
  children,
}: PlayerPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-2">
          <p className="font-medium text-sm">{playerName}</p>
          {stats && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{stats.rotationsPlayed} played &middot; {stats.rotationsBenched} bench{stats.rotationsGoalie > 0 ? ` · ${stats.rotationsGoalie} GK` : ''}</p>
              <p className="font-medium text-foreground text-sm">{stats.playPercentage}%</p>
            </div>
          )}
          {isRemoved ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={onAddBack}
            >
              Add back
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              className="w-full text-xs"
              onClick={onRemove}
            >
              Remove from game
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/game/PlayerPopover.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/game/PlayerPopover.tsx src/components/game/PlayerPopover.test.tsx
git commit -m "feat: add PlayerPopover for in-grid player management"
```

---

### Task 4: Add Period Collapsing Logic

This is a helper hook that manages which periods are collapsed. It computes the rotation-to-period mapping from the schedule and handles auto-collapsing elapsed periods.

**Files:**
- Create: `src/hooks/usePeriodCollapse.ts`
- Test: `src/hooks/usePeriodCollapse.test.ts`

**Step 1: Write the failing test**

Create `src/hooks/usePeriodCollapse.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { usePeriodCollapse } from './usePeriodCollapse.ts';

describe('usePeriodCollapse', () => {
  it('starts with no periods collapsed in setup mode', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ totalPeriods: 4, currentPeriodIndex: 0, isLive: false })
    );
    expect(result.current.collapsedPeriods.size).toBe(0);
  });

  it('auto-collapses elapsed periods on initial load in live mode', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ totalPeriods: 4, currentPeriodIndex: 2, isLive: true })
    );
    expect(result.current.collapsedPeriods.has(0)).toBe(true);
    expect(result.current.collapsedPeriods.has(1)).toBe(true);
    expect(result.current.collapsedPeriods.has(2)).toBe(false);
  });

  it('auto-collapses previous period when current period advances', () => {
    const { result, rerender } = renderHook(
      ({ currentPeriodIndex }) =>
        usePeriodCollapse({ totalPeriods: 4, currentPeriodIndex, isLive: true }),
      { initialProps: { currentPeriodIndex: 0 } }
    );
    expect(result.current.collapsedPeriods.size).toBe(0);

    rerender({ currentPeriodIndex: 1 });
    expect(result.current.collapsedPeriods.has(0)).toBe(true);
    expect(result.current.collapsedPeriods.has(1)).toBe(false);
  });

  it('toggles a period collapsed state', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ totalPeriods: 4, currentPeriodIndex: 2, isLive: true })
    );
    // Period 0 is auto-collapsed; toggle it open
    act(() => result.current.togglePeriod(0));
    expect(result.current.collapsedPeriods.has(0)).toBe(false);

    // Toggle it closed again
    act(() => result.current.togglePeriod(0));
    expect(result.current.collapsedPeriods.has(0)).toBe(true);
  });

  it('never auto-collapses the current period', () => {
    const { result } = renderHook(() =>
      usePeriodCollapse({ totalPeriods: 4, currentPeriodIndex: 1, isLive: true })
    );
    expect(result.current.collapsedPeriods.has(1)).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/hooks/usePeriodCollapse.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement usePeriodCollapse**

Create `src/hooks/usePeriodCollapse.ts`:

```ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePeriodCollapseParams {
  totalPeriods: number;
  currentPeriodIndex: number;
  isLive: boolean;
}

export function usePeriodCollapse({ totalPeriods, currentPeriodIndex, isLive }: UsePeriodCollapseParams) {
  const [collapsedPeriods, setCollapsedPeriods] = useState<Set<number>>(() => {
    if (!isLive) return new Set();
    // On initial load in live mode, collapse all elapsed periods
    const initial = new Set<number>();
    for (let i = 0; i < currentPeriodIndex; i++) {
      initial.add(i);
    }
    return initial;
  });

  const prevPeriodRef = useRef(currentPeriodIndex);

  useEffect(() => {
    if (!isLive) return;
    if (prevPeriodRef.current !== currentPeriodIndex && currentPeriodIndex > prevPeriodRef.current) {
      // Auto-collapse all periods before the current one
      setCollapsedPeriods((prev) => {
        const next = new Set(prev);
        for (let i = prevPeriodRef.current; i < currentPeriodIndex; i++) {
          next.add(i);
        }
        return next;
      });
    }
    prevPeriodRef.current = currentPeriodIndex;
  }, [currentPeriodIndex, isLive]);

  const togglePeriod = useCallback((periodIndex: number) => {
    setCollapsedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(periodIndex)) {
        next.delete(periodIndex);
      } else {
        next.add(periodIndex);
      }
      return next;
    });
  }, []);

  return { collapsedPeriods, togglePeriod };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/hooks/usePeriodCollapse.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/usePeriodCollapse.ts src/hooks/usePeriodCollapse.test.ts
git commit -m "feat: add usePeriodCollapse hook for period collapse state"
```

---

### Task 5: Refactor RotationGrid — Add Live Mode State & Hooks

This is the core refactor. The RotationGrid component gains awareness of game status and wires up all the new hooks (timer, period collapse, player management).

**Files:**
- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Add live mode state and hooks to RotationGrid**

At the top of the `RotationGrid` function, after the existing hook calls (~line 26), add:

```tsx
import { usePeriodTimer } from '@/hooks/usePeriodTimer.ts';
import { usePeriodCollapse } from '@/hooks/usePeriodCollapse.ts';
import { LiveBottomBar } from '@/components/game/LiveBottomBar.tsx';
import { PlayerPopover } from '@/components/game/PlayerPopover.tsx';
import { ConfirmDialog } from '@/components/ui/confirm-dialog.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { ChevronRightIcon } from 'lucide-react';
```

Add these state/derived values after existing state declarations:

```tsx
const isLive = game?.status === 'in-progress';
const isCompleted = game?.status === 'completed';
const currentRotationIndex = game?.currentRotationIndex ?? 0;
const currentRotation = schedule?.rotations[currentRotationIndex];
const nextRotation = schedule?.rotations[currentRotationIndex + 1];
const currentPeriodIndex = currentRotation?.periodIndex ?? 0;

const timer = usePeriodTimer(
  isLive ? game : undefined,
  config,
  currentRotation,
  dispatch,
);

const { collapsedPeriods, togglePeriod } = usePeriodCollapse({
  totalPeriods: config?.periods ?? 1,
  currentPeriodIndex,
  isLive,
});

const [removingPlayerId, setRemovingPlayerId] = useState<PlayerId | null>(null);
```

**Step 2: Update `handleStartGame` to NOT navigate away**

Change `handleStartGame` (currently at line 90-99) to remove the `navigate()` call:

```tsx
function handleStartGame() {
  if (!game) return;
  const updatedGame: Game = {
    ...game,
    status: 'in-progress',
    startedAt: Date.now(),
  };
  dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
  // No navigation — same page transitions to live mode
}
```

**Step 3: Add advance, end-game, and player management handlers**

Below `handleStartGame`, add:

```tsx
function handleAdvance() {
  if (!game) return;
  if (game.currentRotationIndex >= (schedule?.rotations.length ?? 0) - 1) {
    handleEndGame();
    return;
  }
  dispatch({ type: 'ADVANCE_ROTATION', payload: game.id });
}

function handleEndGame() {
  if (!game) return;
  const updatedGame: Game = {
    ...game,
    status: 'completed',
    completedAt: Date.now(),
  };
  dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
}

function handleConfirmRemovePlayer() {
  if (!game || !config || !schedule || !removingPlayerId) return;
  dispatch({ type: 'REMOVE_PLAYER_FROM_GAME', payload: { gameId: game.id, playerId: removingPlayerId } });

  const remainingPlayers = activePlayers.filter((p) => p.id !== removingPlayerId);
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
  if (!game || !roster || !config || !schedule) return;
  dispatch({ type: 'ADD_PLAYER_TO_GAME', payload: { gameId: game.id, playerId } });

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
```

**Step 4: Update `handleCellClick` to respect live mode restrictions**

Modify `handleCellClick` (currently at line 61-88) to block clicks on past rotations in live mode:

```tsx
function handleCellClick(rotationIndex: number, playerId: PlayerId) {
  // In live mode, block interaction with past rotations
  if (isLive && rotationIndex < currentRotationIndex) return;
  // In completed mode, block all interaction
  if (isCompleted) return;

  if (!swapSource) {
    setSwapSource({ rotationIndex, playerId });
    return;
  }

  if (swapSource.rotationIndex === rotationIndex && swapSource.playerId === playerId) {
    setSwapSource(null);
    return;
  }

  if (swapSource.rotationIndex === rotationIndex && schedule) {
    const newSchedule = previewSwap(
      schedule,
      rotationIndex,
      swapSource.playerId,
      playerId,
      activePlayers,
    );
    dispatch({
      type: 'SET_GAME_SCHEDULE',
      payload: { gameId: game.id, schedule: newSchedule },
    });
    setSwapSource(null);
  } else {
    setSwapSource({ rotationIndex, playerId });
  }
}
```

**Step 5: Commit**

```bash
git add src/pages/RotationGrid.tsx
git commit -m "feat: add live mode state, hooks, and handlers to RotationGrid"
```

---

### Task 6: Refactor RotationGrid — Update Header for Live Mode

**Files:**
- Modify: `src/pages/RotationGrid.tsx` (header section, ~lines 157-173)

**Step 1: Replace the header to adapt based on game state**

The header should show different buttons in setup vs live vs completed mode:

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-xl font-bold">{game.name}</h1>
    <p className="text-sm text-muted-foreground">
      {isLive ? (
        <>Rotation {currentRotationIndex + 1} of {schedule.rotations.length} &middot; Period {currentPeriodIndex + 1}</>
      ) : (
        team?.name
      )}
    </p>
  </div>
  <div className="flex gap-2">
    {!isLive && !isCompleted && (
      <>
        <Button variant="ghost" size="sm" onClick={handleOpenSettings} title="Edit game settings">
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={solver.isRunning}>
          {solver.isRunning ? 'Solving...' : 'Regenerate'}
        </Button>
        <Button size="sm" onClick={handleStartGame}>
          Start Game
        </Button>
      </>
    )}
    {isLive && (
      <Button variant="outline" size="sm" onClick={handleEndGame}>
        End Game
      </Button>
    )}
  </div>
</div>
```

**Step 2: Commit**

```bash
git add src/pages/RotationGrid.tsx
git commit -m "feat: adapt RotationGrid header for live/setup/completed modes"
```

---

### Task 7: Refactor RotationGrid — Grid Visual Treatments

This is the core grid rendering change. The grid table gets period collapsing, column highlighting, dimming, and sub change indicators.

**Files:**
- Modify: `src/pages/RotationGrid.tsx` (grid table section, ~lines 232-316)

**Step 1: Add auto-scroll ref and effect**

Before the `return` statement, add:

```tsx
const gridRef = useRef<HTMLDivElement>(null);

// Auto-scroll to current rotation column
useEffect(() => {
  if (!isLive || !gridRef.current) return;
  const table = gridRef.current;
  const currentCol = table.querySelector('[data-current-rotation]');
  if (currentCol) {
    const tableRect = table.getBoundingClientRect();
    const colRect = currentCol.getBoundingClientRect();
    const targetScroll = colRect.left - tableRect.left + table.scrollLeft - tableRect.width / 3;
    table.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
  }
}, [isLive, currentRotationIndex]);
```

**Step 2: Compute period groups and sub changes**

Before the grid JSX, add helper computations:

```tsx
// Group rotations by period for collapse rendering
const periodGroups = useMemo(() => {
  if (!schedule) return [];
  const groups: { periodIndex: number; rotations: typeof schedule.rotations }[] = [];
  for (const rotation of schedule.rotations) {
    const existing = groups.find((g) => g.periodIndex === rotation.periodIndex);
    if (existing) {
      existing.rotations.push(rotation);
    } else {
      groups.push({ periodIndex: rotation.periodIndex, rotations: [rotation] });
    }
  }
  return groups;
}, [schedule]);

// Compute which cells in the next rotation are changing (for sub highlighting)
const changingPlayerIds = useMemo(() => {
  if (!isLive || !currentRotation || !nextRotation) return new Set<PlayerId>();
  const changing = new Set<PlayerId>();
  for (const [playerId, nextAssignment] of Object.entries(nextRotation.assignments)) {
    const currentAssignment = currentRotation.assignments[playerId];
    if (currentAssignment !== nextAssignment) {
      changing.add(playerId as PlayerId);
    }
  }
  return changing;
}, [isLive, currentRotation, nextRotation]);
```

**Step 3: Replace the grid table with period-aware rendering**

Remove the `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` wrapper entirely (no more grid/cards toggle). Replace with the live-aware grid:

```tsx
{/* Grid — remove the Tabs wrapper, just render the grid directly */}
<div ref={gridRef} className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b">
        <th className="text-left py-2 pr-3 sticky left-0 bg-background z-10 font-medium">
          Player
        </th>
        {periodGroups.map((group) => {
          const isCollapsed = collapsedPeriods.has(group.periodIndex);
          if (isCollapsed) {
            return (
              <th
                key={`p${group.periodIndex}`}
                className="text-center py-2 px-1 font-medium min-w-[40px] cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => togglePeriod(group.periodIndex)}
              >
                <div className="text-xs text-muted-foreground">
                  P{group.periodIndex + 1} <ChevronRightIcon className="inline size-3" />
                </div>
              </th>
            );
          }
          return group.rotations.map((r, i) => {
            const isCurrent = isLive && r.index === currentRotationIndex;
            return (
              <th
                key={r.index}
                className={cn(
                  "text-center py-2 px-1 font-medium min-w-[60px]",
                  isCurrent && "bg-primary/10",
                )}
                data-current-rotation={isCurrent ? '' : undefined}
              >
                <div>R{r.index + 1}</div>
                {i === 0 && (
                  <div
                    className="text-xs text-muted-foreground font-normal cursor-pointer hover:text-foreground"
                    onClick={() => isLive && togglePeriod(group.periodIndex)}
                  >
                    P{r.periodIndex + 1}{isLive ? ' ▾' : ''}
                  </div>
                )}
                {i > 0 && <div className="text-xs invisible">P</div>}
              </th>
            );
          });
        })}
        <th className="text-center py-2 px-2 font-medium">Play%</th>
      </tr>
    </thead>
    <tbody>
      {sortedPlayers.map((player) => {
        const stats = schedule.playerStats[player.id];
        const isRemoved = game.removedPlayerIds.includes(player.id);
        return (
          <tr key={player.id} className={cn("border-b", isRemoved && "opacity-40")}>
            <td className="py-1.5 pr-3 sticky left-0 bg-background z-10">
              {isLive ? (
                <PlayerPopover
                  playerName={player.name}
                  stats={stats}
                  isRemoved={isRemoved}
                  onRemove={() => setRemovingPlayerId(player.id)}
                  onAddBack={() => handleAddPlayerBack(player.id)}
                >
                  <button className={cn(
                    "whitespace-nowrap text-left hover:text-primary transition-colors",
                    isRemoved && "line-through",
                  )}>
                    {player.name}
                  </button>
                </PlayerPopover>
              ) : (
                <span className="whitespace-nowrap">{player.name}</span>
              )}
            </td>
            {periodGroups.map((group) => {
              const isCollapsed = collapsedPeriods.has(group.periodIndex);
              if (isCollapsed) {
                // Show a single empty cell for collapsed period
                return <td key={`p${group.periodIndex}`} className="px-1" />;
              }
              return group.rotations.map((rotation) => {
                const assignment = rotation.assignments[player.id];
                if (!assignment) return <td key={rotation.index} />;
                const usePositions = config?.usePositions ?? false;
                const fieldPosition = rotation.fieldPositions?.[player.id];
                const display = getAssignmentDisplay(assignment, fieldPosition, usePositions);

                const isCurrent = isLive && rotation.index === currentRotationIndex;
                const isPast = isLive && rotation.index < currentRotationIndex;
                const isNext = isLive && rotation.index === currentRotationIndex + 1;
                const isChanging = isNext && changingPlayerIds.has(player.id);
                const isSelected =
                  swapSource?.rotationIndex === rotation.index &&
                  swapSource?.playerId === player.id;
                const isSwapTarget =
                  swapSource && swapSource.rotationIndex === rotation.index && !isSelected;

                return (
                  <td
                    key={rotation.index}
                    className={cn(
                      "text-center py-1.5 px-1",
                      isCurrent && "bg-primary/10",
                      isCurrent && "border-l-2 border-r-2 border-primary/30",
                      isPast && "opacity-40",
                    )}
                    onClick={isPast || isCompleted ? undefined : () => handleCellClick(rotation.index, player.id)}
                  >
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded text-xs font-medium transition-all",
                        display.className,
                        isPast ? "cursor-default" : "cursor-pointer",
                        isSelected && "ring-2 ring-primary ring-offset-1 animate-pulse",
                        isSwapTarget && "ring-1 ring-primary/50 hover:ring-2 hover:ring-primary",
                        swapSource && !isSelected && !isSwapTarget && "opacity-70",
                        isChanging && "ring-2 ring-dashed ring-accent-foreground/40",
                      )}
                      title={fieldPosition ? SUB_POSITION_LABELS[fieldPosition] : undefined}
                    >
                      {display.label}
                    </span>
                  </td>
                );
              });
            })}
            <td className="text-center py-1.5 px-2">
              <span
                className={`text-xs font-medium ${
                  stats && stats.playPercentage < (config?.minPlayPercentage ?? 50)
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
              >
                {stats?.playPercentage ?? 0}%
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
    <tfoot>
      <tr className="border-t font-medium">
        <td className="py-2 pr-3 sticky left-0 bg-background z-10 text-sm">Team Strength</td>
        {periodGroups.map((group) => {
          const isCollapsed = collapsedPeriods.has(group.periodIndex);
          if (isCollapsed) return <td key={`p${group.periodIndex}`} />;
          return group.rotations.map((rotation) => {
            const isCurrent = isLive && rotation.index === currentRotationIndex;
            const isPast = isLive && rotation.index < currentRotationIndex;
            return (
              <td
                key={rotation.index}
                className={cn(
                  "text-center py-2 px-1 text-sm",
                  isCurrent && "bg-primary/10 border-l-2 border-r-2 border-primary/30",
                  isPast && "opacity-40",
                )}
              >
                {rotation.teamStrength}
              </td>
            );
          });
        })}
        <td />
      </tr>
    </tfoot>
  </table>
</div>

{/* Swap instruction (non-live mode only, since bottom bar handles it in live mode) */}
{swapSource && !isLive && (
  <p className="text-sm text-muted-foreground mt-2">
    Selected {playerMap.get(swapSource.playerId)?.name} in R{swapSource.rotationIndex + 1}.
    Click another player in the same rotation to swap, or click again to deselect.
  </p>
)}
```

**Step 4: Commit**

```bash
git add src/pages/RotationGrid.tsx
git commit -m "feat: add period collapsing, column highlighting, and sub change indicators to grid"
```

---

### Task 8: Wire Up LiveBottomBar and ConfirmDialog in RotationGrid

**Files:**
- Modify: `src/pages/RotationGrid.tsx` (bottom of the component's return JSX)

**Step 1: Add LiveBottomBar and ConfirmDialog to the page**

After the grid and before the closing `</div>`, add:

```tsx
{/* Live bottom bar */}
{isLive && schedule && (
  <>
    {/* Spacer so grid content isn't hidden behind fixed bottom bar */}
    <div className="h-20" />
    <LiveBottomBar
      timer={timer}
      onAdvance={handleAdvance}
      isLastRotation={currentRotationIndex >= schedule.rotations.length - 1}
      isCrossingPeriod={
        nextRotation != null &&
        nextRotation.periodIndex !== currentRotation?.periodIndex
      }
      swapPlayerName={swapSource ? playerMap.get(swapSource.playerId)?.name ?? null : null}
      onCancelSwap={() => setSwapSource(null)}
    />
  </>
)}

{/* Player removal confirmation */}
<ConfirmDialog
  open={removingPlayerId !== null}
  onConfirm={handleConfirmRemovePlayer}
  onCancel={() => setRemovingPlayerId(null)}
  title={`Remove ${removingPlayerId ? playerMap.get(removingPlayerId)?.name ?? 'player' : 'player'}?`}
  description="They will be removed from remaining rotations. The schedule will be recalculated."
  confirmLabel="Remove"
  variant="destructive"
/>
```

**Step 2: Hide stats cards and settings sheet during live mode**

Wrap the overall stats cards (lines 200-222), player statistics card (lines 392-424), and card view tab content in a condition:

```tsx
{/* Overall stats — hide during live game */}
{!isLive && (
  <div className="grid grid-cols-3 gap-3">
    {/* ... existing stats cards ... */}
  </div>
)}
```

```tsx
{/* Player Stats — hide during live game */}
{!isLive && (
  <Card>
    {/* ... existing player statistics card ... */}
  </Card>
)}
```

**Step 3: Commit**

```bash
git add src/pages/RotationGrid.tsx
git commit -m "feat: wire up LiveBottomBar and ConfirmDialog in RotationGrid"
```

---

### Task 9: Remove GameDay Page and /live Route

**Files:**
- Delete: `src/pages/GameDay.tsx`
- Modify: `src/App.tsx` (remove /live route, add redirect)

**Step 1: Update App.tsx routes**

In `src/App.tsx`:
- Remove the `GameDay` import (line 9)
- Replace the `/live` route (line 23) with a redirect to `/rotations`:

```tsx
<Route path="games/:gameId/live" element={<Navigate to="../rotations" replace />} />
```

This preserves any existing links/bookmarks by redirecting to the new unified view.

**Step 2: Delete GameDay.tsx**

Remove `src/pages/GameDay.tsx`.

**Step 3: Clean up any remaining references to /live**

Search for `'/live'` or `"/live"` or `/live` in the codebase and update:
- `RotationGrid.tsx` line 98: `navigate(`/games/${game.id}/live`)` — should already be removed in Task 5
- Any other references

**Step 4: Run full test suite to verify nothing breaks**

Run: `pnpm test:run`
Expected: All existing tests pass. Any tests importing GameDay will fail and should be removed.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove GameDay page, redirect /live to /rotations"
```

---

### Task 10: Remove Card View Toggle

**Files:**
- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Remove card view related code**

- Remove the `view` state (`useState<'grid' | 'cards'>('grid')`)
- Remove the `Tabs` import
- Remove all card view JSX (the `TabsContent value="cards"` section)
- Remove the `TabsList` and `TabsTrigger` elements
- The grid is now always rendered directly, not inside a tab

**Step 2: Clean up unused imports**

Remove imports that are no longer needed: `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`.

**Step 3: Run tests**

Run: `pnpm test:run`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/RotationGrid.tsx
git commit -m "refactor: remove card view toggle from RotationGrid"
```

---

### Task 11: Integration Testing

**Files:**
- Create: `src/pages/RotationGrid.test.tsx`

**Step 1: Write integration tests for the unified view**

Key scenarios to test:
1. Setup mode: grid renders all rotations, Start Game button visible, no bottom bar
2. Live mode: Start Game → bottom bar appears, past rotations are dimmed
3. Swap mode: click a cell → bottom bar shows "Swapping [name]", click cancel → swap cancelled
4. Period collapse: in live mode with period 2 active, period 1 should be collapsed
5. Player removal: click player name → popover → remove → confirm dialog
6. End game: on last rotation, advance → game status completed

Use the existing factory functions (`buildSchedule`, `playerFactory`, `gameConfigFactory`) to create test data. Wrap the component in `AppProvider` with pre-seeded state.

**Step 2: Run tests**

Run: `pnpm vitest run src/pages/RotationGrid.test.tsx`
Expected: PASS

**Step 3: Run full test suite**

Run: `pnpm test:run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/pages/RotationGrid.test.tsx
git commit -m "test: add integration tests for unified live grid"
```

---

### Task 12: Run Build and Lint

**Step 1: Type-check and build**

Run: `pnpm build`
Expected: No TypeScript errors, successful build.

**Step 2: Lint**

Run: `pnpm lint`
Expected: No lint errors.

**Step 3: Fix any issues found and commit**

```bash
git add -A
git commit -m "chore: fix lint and type errors from unified grid refactor"
```

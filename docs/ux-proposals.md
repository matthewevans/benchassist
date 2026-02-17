# UX Improvement Proposals

Each proposal identifies the deficiency, explains why it matters, and provides a concrete implementation approach with files to create/modify.

---

## Table of Contents

1. [Undo System (Activity Log)](#1-undo-system-activity-log)
2. [End-Game Confirmation](#2-end-game-confirmation)
3. [Active Game Resume Banner](#3-active-game-resume-banner)
4. [Rotation Grid Mobile Readability](#4-rotation-grid-mobile-readability)
5. [Player Delete Confirmation](#5-player-delete-confirmation)
6. [Empty Config Dropdown Dead End](#6-empty-config-dropdown-dead-end)
7. [Nav Active State Mismatch](#7-nav-active-state-mismatch)
8. [Touch Target Sizes](#8-touch-target-sizes)
9. [Brand Color Palette](#9-brand-color-palette)
10. [First-Run Onboarding](#10-first-run-onboarding)
11. [Swap Interaction Discoverability](#11-swap-interaction-discoverability)
12. [GameSetup Step Indicator](#12-gamesetup-step-indicator)
13. [Status Label Text](#13-status-label-text)
14. [Landscape Hint](#14-landscape-hint)
15. [Grid Keyboard Accessibility](#15-grid-keyboard-accessibility)
16. [Back Navigation from Deep Pages](#16-back-navigation-from-deep-pages)
17. [Dashboard / Teams Page Clarity](#17-dashboard--teams-page-clarity)
18. [Team Name Inline Edit Affordance](#18-team-name-inline-edit-affordance)
19. [Import Merge Option](#19-import-merge-option)
20. [Inline Team Name Edit Accessible Label](#20-inline-team-name-edit-accessible-label)

---

## 1. Undo System (Activity Log)

**Deficiency:** Every destructive action (delete team, roster, player, config, game; import replacing all data) is immediately permanent. One wrong tap deletes hours of setup.

**Why it matters:** All user data lives in localStorage — there's no server backup. Accidental deletions are catastrophic and unrecoverable.

### Approach: Pre-action state snapshots + toast undo

We use Immer's `produceWithPatches()` to capture inverse patches for every destructive action. When the user triggers undo, we apply the inverse patches to restore state. This is a first-class Immer feature designed exactly for undo/redo.

**Why inverse patches over full snapshots:** Full snapshots are simpler but wasteful — a rotation schedule alone can be large. Inverse patches only store what changed, so 30 undo entries cost kilobytes, not megabytes. Immer guarantees correctness when patches are applied in LIFO order.

**Why not action-replay or manual inverse logic:** Action replay requires deterministic reducers (ours uses `Date.now()`). Manual inverse logic is fragile and requires maintaining a parallel reverse-action for every action type. Immer patches are generated automatically from the actual mutation.

### Implementation

**New files:**

- `src/hooks/useUndo.ts` — hook exposing `undo()` and `canUndo` + `lastEntry` (for the toast)
- `src/components/ui/toast.tsx` — minimal toast component (or install `sonner` via shadcn)

**Modified files:**

- `src/context/AppContext.tsx` — core changes:

```typescript
import { produceWithPatches, applyPatches, enablePatches, type Patch } from 'immer';

enablePatches();

interface UndoEntry {
  description: string;
  inversePatches: Patch[];
  timestamp: number;
}

const MAX_UNDO = 30;

// Actions that get undo tracking
const UNDOABLE_ACTIONS = new Set<AppAction['type']>([
  'DELETE_TEAM',
  'DELETE_ROSTER',
  'DELETE_PLAYER',
  'DELETE_GAME',
  'DELETE_GAME_CONFIG',
  'IMPORT_DATA',
]);
```

The reducer switches from `produce()` to `produceWithPatches()`. This is a drop-in change — same callback signature, but it returns `[nextState, patches, inversePatches]` instead of just `nextState`.

The `AppProvider` wraps `rawDispatch` to intercept undoable actions, push inverse patches onto a stack (stored in a `useRef` to avoid re-render loops), and surface the undo stack via context.

```typescript
// Simplified dispatch wrapper
const dispatch = useCallback((action: AppAction) => {
  if (UNDOABLE_ACTIONS.has(action.type)) {
    // Compute next state + patches via produceWithPatches
    // Push { description, inversePatches } onto undoStackRef
    // Then apply state via rawDispatch
  }
  rawDispatch(action);
}, []);

// Undo applies inverse patches
function undo() {
  const entry = undoStackRef.current.pop();
  if (!entry) return;
  const restored = applyPatches(stateRef.current, entry.inversePatches);
  rawDispatch({ type: 'LOAD_DATA', payload: restored });
  return entry.description; // for the toast
}
```

A `stateRef` (kept in sync with state via `useEffect`) lets us read current state outside of render.

**Toast component:** After any destructive action, show a toast: `"Deleted Thunder FC" [Undo]`. The undo button calls `undo()`. Toast auto-dismisses after 8 seconds. Use `sonner` (shadcn's recommended toast lib) — it's one `npx shadcn@latest add sonner` command and 3 lines to integrate.

**Description generation:** A small `getUndoDescription()` function maps action type + payload to a human-readable string (e.g., `DELETE_TEAM` → `"Deleted [team.name]"`, `DELETE_PLAYER` → `"Removed [player.name] from roster"`).

### Edge cases handled

- **Undo during live game:** Inverse patches restore exact previous state. If the user undoes a `DELETE_GAME`, the game reappears with its prior status. If they're on the rotation page, the component re-renders with the restored game. No special casing needed.
- **Multiple undos:** Each undo pops the stack and dispatches LOAD_DATA, which itself is NOT undoable (it's not in `UNDOABLE_ACTIONS`). So undos don't create undo entries.
- **Persistence:** LOAD_DATA triggers the existing 500ms debounce save. Restored state auto-persists.
- **Stack overflow:** Capped at 30 entries. Oldest entries are dropped.
- **Import undo:** IMPORT_DATA is tracked, so a user who accidentally imports can undo it and get their previous data back.

### What this does NOT cover

- Undo for edits (rename team, update player skill). These are low-risk and the confirmation dialog pattern is sufficient.
- Undo for game state changes (advance rotation, timer). These are in-game operations that shouldn't be undoable via a global mechanism — the existing "Retreat" button handles that.

---

## 2. End-Game Confirmation

**Deficiency:** The "End Game" button in both the header (`RotationGrid.tsx:457`) and the `LiveBottomBar` triggers `handleEndGame()` directly — no confirmation. Completing a game is irreversible (status → `completed`, no resume path).

**Why it matters:** During a live game on a field, accidental taps are common. Ending a game prematurely means the coach loses live tracking for the rest of the match.

### Approach

Add a `ConfirmDialog` before ending. The infrastructure already exists — `ConfirmDialog` is used for every other destructive action.

**Modified file:** `src/pages/RotationGrid.tsx`

Add state:

```typescript
const [confirmEndGame, setConfirmEndGame] = useState(false);
```

Change both "End Game" buttons to call `setConfirmEndGame(true)` instead of `handleEndGame()` directly. Add:

```tsx
<ConfirmDialog
  open={confirmEndGame}
  onConfirm={() => {
    setConfirmEndGame(false);
    handleEndGame();
  }}
  onCancel={() => setConfirmEndGame(false)}
  title="End this game?"
  description="The game will be marked as completed. You won't be able to resume live tracking."
  confirmLabel="End Game"
  variant="destructive"
/>
```

Update `handleAdvance()` to also use the confirmation when `isLastRotation` is true (since advancing past the last rotation calls `handleEndGame()`).

---

## 3. Active Game Resume Banner

**Deficiency:** If the app restarts mid-game (phone dies, accidental close, PWA refresh), the user lands on the Dashboard with no indication that a live game exists. They have to manually navigate to History, find the game, and tap in.

**Why it matters:** During a real match, every second counts. A coach whose phone restarts needs to be back in the live game view instantly.

### Approach

Add an "active game" banner at the top of the Dashboard when any game has `status: 'in-progress'`.

**Modified file:** `src/pages/Dashboard.tsx`

```typescript
const activeGame = Object.values(state.games).find((g) => g.status === 'in-progress');
const activeTeam = activeGame ? state.teams[activeGame.teamId] : undefined;
```

Render at the very top of the page (before the logo):

```tsx
{
  activeGame && (
    <Link to={`/games/${activeGame.id}/rotations`}>
      <Card className="border-green-500 bg-green-50 dark:bg-green-950/30">
        <CardContent className="py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Game in progress</p>
            <p className="text-xs text-muted-foreground">
              {activeGame.name} · {activeTeam?.name} · Rotation{' '}
              {activeGame.currentRotationIndex + 1}
            </p>
          </div>
          <Badge className="bg-green-600">Resume →</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
```

Uses the existing green status color to create visual urgency. The card is a link — one tap returns to the game.

---

## 4. Rotation Grid Mobile Readability

**Deficiency:** The grid is a wide horizontal-scroll table with small cells (`min-w-[60px]` in setup, `min-w-[76px]` in live). On a phone screen, a coach standing on a field in sunlight struggles to read and interact with it.

**Why it matters:** This is the most-used screen during the most critical moment (the actual game). Usability here is non-negotiable.

### Approach: "Now / Next" card view as default in live mode

In live mode, add a card-based "focus view" that shows only the current and next rotation as two side-by-side cards. The full grid is still available via a "Show Grid" toggle.

**New file:** `src/components/game/LiveFocusView.tsx`

```tsx
// Two-card layout:
// LEFT: "Now — Rotation X" with player list (field + bench grouped)
// RIGHT: "Next — Rotation X+1" with substitution highlights

// Each card lists:
// Field players sorted by position (if using positions) or skill
// Bench players in a muted section below
// Changing players highlighted with a colored indicator
```

**Modified file:** `src/pages/RotationGrid.tsx`

Add a `viewMode` state: `'focus' | 'grid'`, defaulting to `'focus'` in live mode and `'grid'` in setup/completed mode.

```typescript
const [viewMode, setViewMode] = useState<'focus' | 'grid'>(isLive ? 'focus' : 'grid');
```

Toggle button in the live header:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setViewMode((v) => (v === 'focus' ? 'grid' : 'focus'))}
>
  {viewMode === 'focus' ? 'Grid View' : 'Focus View'}
</Button>
```

The focus view renders `LiveFocusView` with large, readable text (text-base/text-lg), generous touch targets, and clear field/bench grouping. Substitution changes are highlighted with a colored left border and "IN" / "OUT" labels.

The grid view remains available for coaches who prefer the full picture.

---

## 5. Player Delete Confirmation

**Deficiency:** In `RosterEditor.tsx:525-529`, the "Remove" button calls `handleDeletePlayer()` directly — no confirmation. Every other destructive action in the app has a confirmation dialog.

**Why it matters:** Accidental player deletion loses their skill ranking, position, and goalie status. It's also an inconsistency — users learn to expect confirmations for destructive actions and then get surprised here.

### Approach

Add a `ConfirmDialog`, matching the existing pattern used everywhere else.

**Modified file:** `src/pages/RosterEditor.tsx`

Add state:

```typescript
const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
const deletingPlayer = roster?.players.find((p) => p.id === deletingPlayerId);
```

Change the Remove button:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="text-destructive"
  onClick={() => setDeletingPlayerId(player.id)}
>
  Remove
</Button>
```

Add dialog:

```tsx
<ConfirmDialog
  open={deletingPlayerId !== null}
  onConfirm={() => {
    if (deletingPlayerId) handleDeletePlayer(deletingPlayerId);
    setDeletingPlayerId(null);
  }}
  onCancel={() => setDeletingPlayerId(null)}
  title={`Remove ${deletingPlayer?.name ?? 'player'}?`}
  description="This player will be permanently removed from this roster."
  confirmLabel="Remove"
  variant="destructive"
/>
```

With the undo system from Proposal 1, the DELETE_PLAYER action will also be captured in the undo stack, providing a double safety net.

---

## 6. Empty Config Dropdown Dead End

**Deficiency:** On GameSetup, if a team has no game configurations, the config Select dropdown is empty. The user is stuck with no explanation and no way to create a config inline.

**Why it matters:** This is the single biggest workflow blocker for new users. Creating a game is the primary flow, and it dead-ends silently.

### Approach: Inline template quick-create + contextual help

Show the same template quick-create buttons (5v5, 7v7, 9v9, 11v11) that exist on the TeamManagement page, right below the config dropdown when the list is empty.

**Modified file:** `src/pages/GameSetup.tsx`

After the config Select component, add:

```tsx
{
  selectedTeam && selectedTeam.gameConfigs.length === 0 && (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">No configurations yet. Quick-create one:</p>
      <div className="flex flex-wrap gap-2">
        {GAME_CONFIG_TEMPLATES.map((template) => (
          <Button
            key={template.name}
            variant="outline"
            size="sm"
            onClick={() => {
              const config: GameConfig = {
                id: generateId(),
                teamId: teamId,
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
              dispatch({ type: 'ADD_GAME_CONFIG', payload: { teamId, config } });
              setConfigId(config.id);
            }}
          >
            {template.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

Import `GAME_CONFIG_TEMPLATES` and `DEFAULT_GAME_RULES` from `@/types/domain.ts` (already used in TeamManagement).

This gives the same one-tap creation that exists on the team page, right where the user needs it. After clicking a template, it auto-selects the new config in the dropdown.

Similarly, if the team has no rosters, show a message below the roster Select:

```tsx
{
  selectedTeam && selectedTeam.rosters.length === 0 && (
    <p className="text-sm text-muted-foreground">
      No rosters yet.{' '}
      <Link to={`/teams/${teamId}`} className="text-primary underline">
        Add players to a roster
      </Link>{' '}
      first.
    </p>
  );
}
```

---

## 7. Nav Active State Mismatch

**Deficiency:** In `AppShell.tsx:56`, the active check is `location.pathname === item.path` — strict equality. So `/teams/abc123` doesn't highlight "Teams," `/games/new` doesn't highlight "History," and `/games/xyz/rotations` highlights nothing.

**Why it matters:** Users lose spatial context. The nav bar should always tell them which section they're in.

### Approach: Prefix-based matching with special handling for the root

**Modified file:** `src/components/layout/AppShell.tsx`

Replace the nav item definition and matching logic:

```typescript
const NAV_ITEMS = [
  { path: '/', label: 'Teams', matchPrefixes: ['/', '/teams'] },
  { path: '/practice', label: 'Practice', matchPrefixes: ['/practice'] },
  { path: '/games', label: 'History', matchPrefixes: ['/games'] },
];

function isActive(pathname: string, item: (typeof NAV_ITEMS)[number]): boolean {
  for (const prefix of item.matchPrefixes) {
    if (prefix === '/') {
      // Root matches exact '/' and '/teams/*'
      if (pathname === '/' || pathname.startsWith('/teams')) return true;
    } else {
      if (pathname === prefix || pathname.startsWith(prefix + '/')) return true;
    }
  }
  return false;
}
```

Replace the className condition:

```tsx
isActive(location.pathname, item)
  ? 'bg-primary text-primary-foreground'
  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground';
```

Now:

- `/` → "Teams" active
- `/teams/abc` → "Teams" active
- `/teams/abc/rosters/xyz` → "Teams" active
- `/practice` → "Practice" active
- `/games` → "History" active
- `/games/new` → "History" active
- `/games/xyz/rotations` → "History" active

---

## 8. Touch Target Sizes

**Deficiency:** Several frequently-used interactive elements are 32px or smaller:

- Timer controls in LiveBottomBar: `h-8 w-8` (32x32px)
- Skill popover trigger in RosterEditor: `w-8 h-8` (32x32px)
- Theme toggle: `h-8 w-8` (32x32px)
- Import row remove button: `h-6` (24px)

Apple HIG recommends 44px; Material Design recommends 48dp. 32px is too small for field conditions.

### Approach

Increase sizes for live game controls (highest priority) and secondary controls.

**Modified files:**

`src/components/game/LiveBottomBar.tsx` — Timer controls:

```tsx
// Change h-8 w-8 → h-11 w-11 for Play/Pause/Reset
<Button variant="ghost" size="icon" className="h-11 w-11" ...>
```

The Previous/Next navigation buttons are already `size="lg"` which is fine.

`src/pages/RosterEditor.tsx` — Skill popover:

```tsx
// Change w-8 h-8 → w-10 h-10 (40px, acceptable for non-field use)
<button className="w-10 h-10 rounded-full ..."
```

`src/components/layout/AppShell.tsx` — Theme toggle:

```tsx
// Change h-8 w-8 → h-9 w-9 (36px, adequate for non-critical control)
<Button variant="ghost" size="sm" onClick={cycle} className="h-9 w-9 p-0" ...>
```

`src/pages/RosterEditor.tsx` — Import row remove:

```tsx
// Change h-6 → h-8 (32px minimum, adequate since this is a desktop-oriented dialog)
<Button variant="ghost" size="sm" className="h-8 px-2 ..."
```

The principle: field-facing controls (LiveBottomBar) get 44px+; management UI (roster editor, settings) gets 36-40px.

---

## 9. Brand Color Palette

**Deficiency:** The entire color system is achromatic — every OKLch value has chroma `0` (pure grayscale). The green `#16a34a` in the PWA manifest appears nowhere in the actual UI. The app looks clinical and default.

**Why it matters:** This is a tool for rec league soccer coaches — mostly parent volunteers. A warmer, branded palette communicates polish and builds trust. The disconnect between the green PWA splash screen and the grayscale app interior is jarring.

### Approach: Introduce green as the primary brand color

The PWA manifest already declares `theme_color: '#16a34a'` (Tailwind green-600). Adopt this as the `--primary` token.

**Modified file:** `src/index.css`

Light mode:

```css
--primary: oklch(0.532 0.157 149.48); /* ~#16a34a green-600 */
--primary-foreground: oklch(0.985 0 0); /* white text on green */
--ring: oklch(0.532 0.157 149.48); /* focus ring matches primary */
```

Dark mode:

```css
--primary: oklch(0.696 0.17 162.48); /* lighter green for dark bg */
--primary-foreground: oklch(0.145 0 0); /* dark text on light green */
--ring: oklch(0.696 0.17 162.48);
```

This single change cascades through the entire app because all components use the `primary` token:

- Nav active state → green pill
- Primary buttons (New Team, Start Game, Generate) → green
- Live game progress bar → green
- Focus rings → green
- Grid "Now" column highlight → green tint

No component code changes needed — it's purely CSS variables.

To verify the green works well everywhere, search for any hardcoded color classes on buttons/badges that might clash. The existing `bg-green-100 text-green-800` on the "in-progress" status badge (GameHistory) would now be redundant with primary — could be left as-is since status badges use their own palette intentionally.

---

## 10. First-Run Onboarding

**Deficiency:** A new user sees a logo + empty state cards + export/import buttons. No guided setup, no walkthrough, no indication of what to do first.

**Why it matters:** A coach downloading this 30 minutes before a game needs to be productive in under 2 minutes. The current empty state doesn't communicate the setup flow.

### Approach: Getting Started checklist card on Dashboard (empty state only)

When there are no teams, replace the generic "No teams yet" card with a guided checklist.

**Modified file:** `src/pages/Dashboard.tsx`

```tsx
{
  teams.length === 0 && (
    <Card>
      <CardHeader>
        <CardTitle>Get Started</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Step number={1} label="Create a team" done={false} />
        <Step number={2} label="Add players to a roster" done={false} />
        <Step number={3} label="Set up a game format (5v5, 7v7, etc.)" done={false} />
        <Step number={4} label="Generate fair rotations" done={false} />
        <div className="pt-2">
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="w-full">Create Your First Team</Button>
            </DialogTrigger>
            {/* ... existing dialog content */}
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
```

The `Step` component is a simple inline helper:

```tsx
function Step({ number, label, done }: { number: number; label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className={cn(
          'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
          done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {done ? '✓' : number}
      </span>
      <span className={done ? 'line-through text-muted-foreground' : ''}>{label}</span>
    </div>
  );
}
```

For returning users who have at least one team, the existing team card list renders normally. This keeps the change minimal — no new pages, no persistent onboarding state, no tutorials. Just a clear "here's what to do" when the app is empty.

---

## 11. Swap Interaction Discoverability

**Deficiency:** The grid's swap mechanic (click cell → click another cell in same rotation) has no visual onboarding. Before the first click, nothing signals that cells are interactive.

**Why it matters:** Swapping is the core value-add of the rotation grid. If coaches don't discover it, they have to regenerate the entire schedule for any adjustment.

### Approach: Instructional banner above the grid in setup mode

**Modified file:** `src/pages/RotationGrid.tsx`

Add a dismissible hint above the grid in setup mode:

```tsx
{
  !isLive && !isCompleted && !swapSource && (
    <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
      Tap any player cell to swap their position with another player in the same rotation.
    </p>
  );
}
```

This is intentionally simple — no tooltip, no animation, no "don't show again" persistence. It appears only in setup mode when no swap is in progress, and it naturally disappears when the user starts a swap (at which point the existing "Selected [player]..." text takes over).

In live mode, omit this hint — the focus is on game management, not editing. The swap instruction for live mode is already handled by the LiveBottomBar's "Swapping [name]" indicator.

---

## 12. GameSetup Step Indicator

**Deficiency:** GameSetup is a multi-step wizard (Team/Config → Attendance → Goalies → Generate) but there's no progress indication. Users can't tell how many steps remain.

**Why it matters:** Pre-game time is limited. A coach needs to know "am I almost done?" at a glance.

### Approach: Step labels on each card header

Rather than a separate progress bar component (which would fight the collapsible card layout), add step numbers directly to the card titles.

**Modified file:** `src/pages/GameSetup.tsx`

Change the card headers:

```tsx
<CardTitle className="text-base">
  <span className="text-muted-foreground mr-1.5">1.</span>
  Team & Configuration
</CardTitle>

<CardTitle className="text-base">
  <span className="text-muted-foreground mr-1.5">2.</span>
  Attendance ({activePlayers.length} / {selectedRoster.players.length} available)
</CardTitle>

<CardTitle className="text-base">
  <span className="text-muted-foreground mr-1.5">3.</span>
  Goalie Assignment
</CardTitle>
```

The collapsed state of step 1 already shows a summary. Steps 2 and 3 only appear when relevant (roster selected, goalie config enabled), so the numbering self-adjusts — step 2 is always Attendance, step 3 is Goalies (when shown).

This is the lightest-touch approach: no new components, no state tracking, just visible labels that orient the user.

---

## 13. Status Label Text

**Deficiency:** Game status badges show raw enum values: "setup", "in-progress", "completed" (lowercase, programmer terminology).

**Why it matters:** Small polish issue, but "setup" means nothing to a non-technical coach. Consistent, friendly labels improve comprehension.

### Approach: Label map + consistent badge usage

**Modified file:** Create a shared constant (can live in `src/types/domain.ts` or a small utility):

```typescript
export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  setup: 'Ready',
  'in-progress': 'Live',
  completed: 'Done',
};
```

**Modified files:** `src/pages/Dashboard.tsx` and `src/pages/GameHistory.tsx`

In Dashboard, the recent games section currently uses `<span className="text-xs px-2 py-1 rounded-full bg-secondary">{game.status}</span>`. Replace with the Badge component using the status-specific styles from GameHistory:

```tsx
<Badge className={STATUS_STYLES[game.status]}>{GAME_STATUS_LABELS[game.status]}</Badge>
```

Move `STATUS_STYLES` to `src/types/domain.ts` alongside the new labels so both pages share them.

---

## 14. Landscape Hint

**Deficiency:** The rotation grid would benefit significantly from landscape orientation on phones, but there's no prompt or visual hint.

**Why it matters:** Landscape shows more columns without scrolling — exactly what a coach needs.

### Approach: One-time subtle hint on the rotation grid

**Modified file:** `src/pages/RotationGrid.tsx`

Detect portrait orientation and show a hint when the grid has more rotations than can fit on screen:

```typescript
const isPortrait = window.matchMedia('(orientation: portrait)').matches;
const manyRotations = schedule.rotations.length > 4;
```

```tsx
{
  isPortrait && manyRotations && !isCompleted && (
    <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
      <RotateCcwIcon className="size-3" />
      Rotate your phone for a wider view
    </p>
  );
}
```

Placed just above the grid. Uses the already-imported `RotateCcwIcon` from lucide. Disappears when the user rotates to landscape (media query changes, re-render). No dismiss state needed — if they rotate, it goes away; if they don't, it's unobtrusive.

---

## 15. Grid Keyboard Accessibility

**Deficiency:** Grid cells are `<td>` elements with `onClick` handlers but no `tabIndex`, `role`, or keyboard support. The swap interaction is entirely mouse/touch driven.

**Why it matters:** WCAG 2.1 compliance requires interactive elements to be keyboard-accessible. While the primary use case is mobile, the app should work for all users.

### Approach: Add keyboard interaction to grid cells

**Modified file:** `src/pages/RotationGrid.tsx`

On each interactive `<td>`:

```tsx
<td
  role="button"
  tabIndex={isPast || isCompleted ? -1 : 0}
  aria-label={`${player.name}, Rotation ${rotation.index + 1}, ${display.label}`}
  onClick={() => handleCellClick(rotation.index, player.id)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCellClick(rotation.index, player.id);
    }
  }}
  // ... existing className
>
```

The `tabIndex={0}` makes cells focusable via Tab. `role="button"` announces them correctly. Enter/Space triggers the same click handler. Past and completed cells get `tabIndex={-1}` so they're skipped during Tab navigation.

This is a targeted accessibility improvement — no layout changes, no new components.

---

## 16. Back Navigation from Deep Pages

**Deficiency:** RotationGrid, GameSetup, and GameHistory have no breadcrumb or back-link navigation. In standalone PWA mode (no browser chrome), users on these pages have no way back except the top nav.

**Why it matters:** The top nav items (Teams, Practice, History) help with top-level navigation, but within a game context, the user wants to go back to the team, not to the generic page.

### Approach: Contextual breadcrumbs on all sub-pages

The pattern already exists in TeamManagement and RosterEditor. Extend it.

**Modified file:** `src/pages/RotationGrid.tsx`

Add breadcrumb above the header:

```tsx
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <Link to="/" className="hover:text-foreground">
    Teams
  </Link>
  <span>/</span>
  <Link to={`/teams/${game.teamId}`} className="hover:text-foreground">
    {team?.name}
  </Link>
  <span>/</span>
  <span className="text-foreground">{game.name}</span>
</div>
```

**Modified file:** `src/pages/GameSetup.tsx`

```tsx
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <Link to="/" className="hover:text-foreground">
    Teams
  </Link>
  {selectedTeam && (
    <>
      <span>/</span>
      <Link to={`/teams/${teamId}`} className="hover:text-foreground">
        {selectedTeam.name}
      </Link>
    </>
  )}
  <span>/</span>
  <span className="text-foreground">New Game</span>
</div>
```

In live mode (RotationGrid), consider hiding the breadcrumb to maximize screen space — the coach doesn't need navigation during a game. Show it in setup and completed modes only.

---

## 17. Dashboard / Teams Page Clarity

**Deficiency:** The root `/` doubles as both a dashboard (hero logo, recent games, export/import) and the teams list. Recent games appear here AND on the History page. The hero logo consumes ~160px of vertical space on every visit.

**Why it matters:** On mobile, the team cards (the most common destination) are pushed below the fold by the logo. Duplicate recent games across two pages is confusing.

### Approach: Shrink the logo, remove duplicate content

**Modified file:** `src/pages/Dashboard.tsx`

1. Reduce the logo from `h-40` to `h-20`:

```tsx
<img src={...} className="h-20 dark:hidden" />
```

2. Remove the "Recent Games" section entirely. It duplicates the History page and adds visual noise. The nav has a "History" link for that purpose.

3. Move the "Data" section (export/import) behind a collapsible or into a settings area. For now, keeping it is fine since it's at the bottom and doesn't push content.

These two changes free ~200px of vertical space, putting team cards above the fold on most phones.

---

## 18. Team Name Inline Edit Affordance

**Deficiency:** On TeamManagement, the team name is editable by clicking it, but there's no visual indicator. The cursor changes on hover (invisible on mobile).

**Why it matters:** Users won't discover the rename feature on touch devices.

### Approach: Add a pencil icon

**Modified file:** `src/pages/TeamManagement.tsx`

Import `PencilIcon` from lucide-react. Change the team name display:

```tsx
<h1
  className="text-2xl font-bold cursor-pointer hover:text-primary group flex items-center gap-1.5"
  onClick={() => {
    setEditName(team.name);
    setIsEditing(true);
  }}
>
  {team.name}
  <PencilIcon className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 sm:opacity-60 transition-opacity" />
</h1>
```

On mobile (`sm:opacity-60`), the pencil is always subtly visible. On desktop, it appears on hover via the `group-hover` pattern. This is the standard "inline editable" affordance used in tools like Notion and Linear.

---

## 19. Import Merge Option

**Deficiency:** Import replaces the entire state. No option to merge imported data with existing data.

**Why it matters:** Two coaches sharing a team, or a coach moving between devices, can't combine data.

### Approach: Add a "Merge" button alongside "Replace All" in the import confirmation dialog

**Modified file:** `src/pages/Dashboard.tsx`

Replace the `ConfirmDialog` for import with a custom dialog that offers two options:

```tsx
<Dialog open={importData !== null} onOpenChange={() => setImportData(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Import Backup</DialogTitle>
    </DialogHeader>
    <p className="text-sm text-muted-foreground">
      This backup contains {Object.keys(importData.teams).length} teams and{' '}
      {Object.keys(importData.games).length} games.
    </p>
    <div className="flex flex-col gap-2 pt-2">
      <Button variant="outline" onClick={handleMergeImport}>
        Merge with existing data
      </Button>
      <Button variant="destructive" onClick={handleConfirmImport}>
        Replace all data
      </Button>
      <Button variant="ghost" onClick={() => setImportData(null)}>
        Cancel
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

**New action in reducer:** `MERGE_DATA`

```typescript
case 'MERGE_DATA': {
  // Add teams that don't already exist (by ID)
  for (const [id, team] of Object.entries(action.payload.teams)) {
    if (!draft.teams[id]) {
      draft.teams[id] = team;
    }
  }
  // Add games that don't already exist (by ID)
  for (const [id, game] of Object.entries(action.payload.games)) {
    if (!draft.games[id]) {
      draft.games[id] = game;
    }
  }
  // Merge favorites (union, deduplicate)
  const favSet = new Set([...draft.favoriteDrillIds, ...(action.payload.favoriteDrillIds ?? [])]);
  draft.favoriteDrillIds = [...favSet];
  break;
}
```

Merge semantics: skip-on-conflict (existing data wins). This is the safest default — importing can add new things but never overwrites existing data. The user always has "Replace All" if they want a full overwrite.

---

## 20. Inline Team Name Edit Accessible Label

**Deficiency:** The inline edit Input on TeamManagement has no `aria-label` or associated `<label>`. Screen readers won't announce what the field is for.

**Why it matters:** WCAG 2.1 Level A requires all form inputs to have an accessible name.

### Approach

**Modified file:** `src/pages/TeamManagement.tsx`

Add `aria-label` to the Input:

```tsx
<Input
  value={editName}
  onChange={(e) => setEditName(e.target.value)}
  aria-label="Team name"
  autoFocus
  className="h-8 w-48"
/>
```

One-line change. No visual impact.

---

## Implementation Order

Recommended grouping for implementation:

**Phase 1 — Safety (highest impact, lowest risk):**

- 2: End-game confirmation
- 5: Player delete confirmation
- 20: Accessible label
- 13: Status labels

**Phase 2 — Navigation & Orientation:**

- 7: Nav active state
- 16: Breadcrumbs on all pages
- 3: Active game resume banner
- 17: Dashboard cleanup

**Phase 3 — Core UX:**

- 6: Empty config dead end fix
- 11: Swap discoverability
- 12: Step indicator
- 18: Team name edit affordance

**Phase 4 — Polish & Design:**

- 9: Brand color palette
- 8: Touch targets
- 10: First-run onboarding
- 14: Landscape hint

**Phase 5 — Systems:**

- 1: Undo system
- 15: Grid keyboard accessibility
- 4: Live focus view
- 19: Import merge

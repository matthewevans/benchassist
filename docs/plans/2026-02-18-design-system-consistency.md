# Design System Consistency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize spacing, typography, colors, and component usage across the entire app to follow a consistent design system.

**Architecture:** Pure CSS/className changes across all pages and a few shared UI components. No logic changes, no new dependencies. The CardTitle component gets a default size. All pages adopt consistent heading scales, spacing rhythms, empty state patterns, and button sizing. Hardcoded colors gain dark mode variants.

**Tech Stack:** Tailwind CSS v4, shadcn/ui components, React

---

### Task 1: Fix duplicated @apply rules in index.css

**Files:**

- Modify: `src/index.css:117-126`

**Step 1: Remove duplicate @apply lines**

In `src/index.css`, the `@layer base` block has each rule duplicated. Change:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    @apply bg-background text-foreground;
  }
}
```

To:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Clean build, no errors

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "fix: remove duplicated @apply rules in index.css"
```

---

### Task 2: Add default text-lg to CardTitle component

**Files:**

- Modify: `src/components/ui/card.tsx:35`

**Step 1: Update CardTitle base class**

In `card.tsx`, change the CardTitle className from:

```tsx
className={cn('leading-none font-semibold', className)}
```

To:

```tsx
className={cn('text-lg leading-none font-semibold', className)}
```

This gives all CardTitles a consistent `text-lg` baseline. Any call-site that explicitly sets `text-base` or another size will still override via Tailwind's specificity.

**Step 2: Remove now-redundant `text-lg` from Dashboard CardTitle usage**

In `src/pages/Dashboard.tsx:275`, change:

```tsx
<CardTitle className="text-lg">{team.name}</CardTitle>
```

To:

```tsx
<CardTitle>{team.name}</CardTitle>
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Clean build

**Step 4: Commit**

```bash
git add src/components/ui/card.tsx src/pages/Dashboard.tsx
git commit -m "feat: add default text-lg to CardTitle component"
```

---

### Task 3: Standardize typography scale across all pages

**Files:**

- Modify: `src/pages/RotationGrid.tsx` (lines 493, 522)
- Modify: `src/pages/Practice.tsx` (line 566)
- Modify: `src/components/layout/AppShell.tsx` (line 79)

**Step 1: Fix RotationGrid H1 from text-xl to text-2xl**

In `RotationGrid.tsx`, there are two H1 instances using `text-xl`. Change both to `text-2xl`:

Line 493 — change:

```tsx
<h1 className="text-xl font-bold">{game.name}</h1>
```

To:

```tsx
<h1 className="text-2xl font-bold">{game.name}</h1>
```

Line 522 — change:

```tsx
<h1 className="text-xl font-bold">{game.name}</h1>
```

To:

```tsx
<h1 className="text-2xl font-bold">{game.name}</h1>
```

**Step 2: Fix drill index bold+muted contradiction in Practice**

In `Practice.tsx:566`, change:

```tsx
<span className="text-sm font-bold text-muted-foreground shrink-0">{index}.</span>
```

To:

```tsx
<span className="text-sm font-semibold text-muted-foreground shrink-0">{index}.</span>
```

**Step 3: Eliminate text-[10px] in AppShell footer**

In `AppShell.tsx:79`, change:

```tsx
<footer className="py-2 text-center text-[10px] text-muted-foreground/40">
```

To:

```tsx
<footer className="py-2 text-center text-xs text-muted-foreground/40">
```

**Step 4: Eliminate text-[10px] in RotationGrid column headers**

In `RotationGrid.tsx:682`, change:

```tsx
'text-[10px] font-semibold uppercase tracking-wide',
```

To:

```tsx
'text-xs font-semibold uppercase tracking-wide',
```

**Step 5: Verify build**

Run: `pnpm build`
Expected: Clean build

**Step 6: Commit**

```bash
git add src/pages/RotationGrid.tsx src/pages/Practice.tsx src/components/layout/AppShell.tsx
git commit -m "feat: standardize typography scale — consistent H1 sizes, eliminate arbitrary font sizes"
```

---

### Task 4: Standardize spacing across all pages

**Files:**

- Modify: `src/pages/RotationGrid.tsx` (line 476)
- Modify: `src/pages/GameSetup.tsx` (line 416)

**Step 1: Fix RotationGrid root spacing from space-y-4 to space-y-6**

In `RotationGrid.tsx:476`, change:

```tsx
<div className="space-y-4">
```

To:

```tsx
<div className="space-y-6">
```

**Step 2: Standardize solver progress card padding**

In `GameSetup.tsx:416`, change:

```tsx
<CardContent className="py-4">
```

To:

```tsx
<CardContent className="py-3">
```

This matches the solver progress card in RotationGrid.tsx which already uses `py-3`.

**Step 3: Verify build**

Run: `pnpm build`
Expected: Clean build

**Step 4: Commit**

```bash
git add src/pages/RotationGrid.tsx src/pages/GameSetup.tsx
git commit -m "feat: standardize page spacing — uniform space-y-6 root, consistent card padding"
```

---

### Task 5: Standardize empty state patterns

**Files:**

- Modify: `src/pages/Practice.tsx` (line 517)
- Modify: `src/pages/GameHistory.tsx` (line 30)
- Modify: `src/pages/TeamManagement.tsx` (line 56)
- Modify: `src/pages/RosterEditor.tsx` (line 85)
- Modify: `src/pages/RotationGrid.tsx` (line 247)

Two patterns:

**Pattern A (inline card empty state):** `py-6 text-center text-sm text-muted-foreground` — single sentence, no heading. Already used by TeamManagement rosters/configs and RosterEditor players.

**Pattern B (rich empty state with heading):** `py-6 text-center text-muted-foreground` with child `<p className="text-lg font-medium">Title</p>` and `<p className="text-sm text-muted-foreground mt-1">Description</p>`. Used by GameHistory and Practice.

**Step 1: Fix Practice empty state from pt-6 to py-6**

In `Practice.tsx:517`, change:

```tsx
<CardContent className="pt-6 text-center text-muted-foreground">
```

To:

```tsx
<CardContent className="py-6 text-center text-muted-foreground">
```

**Step 2: Add explicit text-sm to not-found states**

In `TeamManagement.tsx:56`, change:

```tsx
<p className="text-muted-foreground">Team not found</p>
```

To:

```tsx
<p className="text-sm text-muted-foreground">Team not found</p>
```

In `RosterEditor.tsx:85`, change:

```tsx
<p className="text-muted-foreground">Roster not found</p>
```

To:

```tsx
<p className="text-sm text-muted-foreground">Roster not found</p>
```

In `RotationGrid.tsx`, around line 247, change:

```tsx
<p className="text-muted-foreground">Game or schedule not found</p>
```

To:

```tsx
<p className="text-sm text-muted-foreground">Game or schedule not found</p>
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Clean build

**Step 4: Commit**

```bash
git add src/pages/Practice.tsx src/pages/TeamManagement.tsx src/pages/RosterEditor.tsx src/pages/RotationGrid.tsx
git commit -m "feat: standardize empty state patterns — consistent padding and text sizing"
```

---

### Task 6: Fix dark mode for hardcoded colors

**Files:**

- Modify: `src/pages/Dashboard.tsx` (lines 37-48)
- Modify: `src/pages/Practice.tsx` (lines 710-711)

**Step 1: Add dark mode variants to AVATAR_COLORS**

In `Dashboard.tsx`, replace the entire `AVATAR_COLORS` array (lines 37-48):

```tsx
const AVATAR_COLORS = [
  'bg-red-200 text-red-800',
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-yellow-200 text-yellow-800',
  'bg-purple-200 text-purple-800',
  'bg-pink-200 text-pink-800',
  'bg-indigo-200 text-indigo-800',
  'bg-orange-200 text-orange-800',
  'bg-teal-200 text-teal-800',
  'bg-cyan-200 text-cyan-800',
];
```

With:

```tsx
const AVATAR_COLORS = [
  'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
  'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200',
  'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-pink-200 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'bg-teal-200 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'bg-cyan-200 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
];
```

**Step 2: Add dark mode to Practice star icon**

In `Practice.tsx`, in the `StarIcon` component (around line 710), change the filled star:

```tsx
className={`text-yellow-500 ${className ?? ''}`}
```

To:

```tsx
className={`text-yellow-500 dark:text-yellow-400 ${className ?? ''}`}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Clean build

**Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Practice.tsx
git commit -m "fix: add dark mode variants to hardcoded avatar and star icon colors"
```

---

### Task 7: Fix button consistency issues

**Files:**

- Modify: `src/components/game/GameConfigForm.tsx` (line 169)
- Modify: `src/components/game/PlayerPopover.tsx` (lines 38, 42)
- Modify: `src/pages/RosterEditor.tsx` (line 331)
- Modify: `src/pages/TeamManagement.tsx` (lines 155, 158)
- Modify: `src/pages/RotationGrid.tsx` (line 734)

**Step 1: Replace raw button in GameConfigForm with Button component**

In `GameConfigForm.tsx:169`, change:

```tsx
<button className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-foreground transition-colors text-muted-foreground">
  Rules & Balance
  <ChevronDownIcon className={cn('h-4 w-4 transition-transform', rulesOpen && 'rotate-180')} />
</button>
```

To:

```tsx
<Button
  variant="ghost"
  className="flex items-center justify-between w-full px-0 text-sm font-medium text-muted-foreground hover:text-foreground"
>
  Rules & Balance
  <ChevronDownIcon className={cn('h-4 w-4 transition-transform', rulesOpen && 'rotate-180')} />
</Button>
```

Note: `Button` is already imported in this file.

**Step 2: Replace raw button in RotationGrid player name cell**

In `RotationGrid.tsx:734`, change:

```tsx
<button className="text-left">{playerNameEl}</button>
```

To:

```tsx
<button className="text-left hover:text-primary transition-colors">{playerNameEl}</button>
```

(This stays as a raw button because wrapping in the `Button` component would add unwanted height/padding inside a table cell. But we add hover feedback for consistency.)

**Step 3: Remove text-xs override from PlayerPopover buttons**

In `PlayerPopover.tsx`, lines 38 and 42, change:

```tsx
<Button variant="outline" size="sm" className="w-full text-xs" onClick={onAddBack}>
```

To:

```tsx
<Button variant="outline" size="sm" className="w-full" onClick={onAddBack}>
```

And change:

```tsx
<Button variant="destructive" size="sm" className="w-full text-xs" onClick={onRemove}>
```

To:

```tsx
<Button variant="destructive" size="sm" className="w-full" onClick={onRemove}>
```

**Step 4: Remove text-xs override from RosterEditor import remove button**

In `RosterEditor.tsx:331`, change:

```tsx
className = 'h-8 px-2 text-xs text-destructive shrink-0';
```

To:

```tsx
className = 'text-destructive shrink-0';
```

(The `h-8` is redundant with `size="sm"`, and `px-2` plus `text-xs` fight the component defaults. Keep only the semantic `text-destructive` override.)

**Step 5: Standardize TeamManagement header button sizes to sm**

In `TeamManagement.tsx`, change line 155:

```tsx
<Button variant="outline">Practice</Button>
```

To:

```tsx
<Button variant="outline" size="sm">
  Practice
</Button>
```

Change line 158:

```tsx
<Button>New Game</Button>
```

To:

```tsx
<Button size="sm">New Game</Button>
```

These now match the pattern used by RotationGrid and other page headers where action buttons sit alongside the H1.

**Step 6: Verify build**

Run: `pnpm build`
Expected: Clean build

**Step 7: Commit**

```bash
git add src/components/game/GameConfigForm.tsx src/components/game/PlayerPopover.tsx src/pages/RosterEditor.tsx src/pages/TeamManagement.tsx src/pages/RotationGrid.tsx
git commit -m "feat: standardize button usage — remove size overrides, use Button component, consistent header sizes"
```

---

### Task 8: Standardize modal max-heights

**Files:**

- Modify: `src/pages/RotationGrid.tsx` (line 982)

**Step 1: Change Settings Sheet max-height from 80vh to 90vh**

In `RotationGrid.tsx:982`, change:

```tsx
<SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
```

To:

```tsx
<SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
```

This matches the `max-h-[90vh]` used by all other scrollable modals (TeamManagement and RosterEditor dialogs).

**Step 2: Verify build**

Run: `pnpm build`
Expected: Clean build

**Step 3: Commit**

```bash
git add src/pages/RotationGrid.tsx
git commit -m "feat: standardize modal max-height to 90vh across all scrollable dialogs"
```

---

### Task 9: Run full test suite and verify

**Step 1: Run tests**

Run: `pnpm test:run`
Expected: All tests pass

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No new errors

**Step 3: Run build**

Run: `pnpm build`
Expected: Clean build

**Step 4: Manual visual check**

Start dev server with `pnpm dev` and verify:

- Dashboard page headings and card spacing look correct
- TeamManagement header buttons are properly sized
- RotationGrid H1 is now text-2xl
- Dark mode: avatars on Dashboard render correctly
- Practice: star icon is visible in dark mode
- Empty states across all pages have consistent padding
- AppShell footer text is visible (text-xs instead of text-[10px])

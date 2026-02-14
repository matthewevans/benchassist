# UI/UX Polish Pass - Design

## Problem

The roster/game-config setup flows work but feel clunky. Root causes: visual noise from per-item cards, dialog-heavy interactions for simple actions, raw HTML checkboxes inconsistent with shadcn aesthetic, dense forms that don't leverage progressive disclosure, and no dark mode toggle despite CSS being ready.

## Changes

### 1. Switch/Checkbox component swap

Replace all raw `<input type="checkbox">` with shadcn components:

- **Settings toggles** (GameConfigForm rules, player "can play goalkeeper"): use `<Switch>`
- **Selection lists** (attendance, import review goalie checkbox): use shadcn `<Checkbox>`

### 2. Single-container player list

RosterEditor: wrap entire player list in one `<Card>`. Each player becomes a row with `border-b` divider (no border on last child). Remove per-player `<Card>` wrapping. Same content layout per row.

### 3. One-click template config creation

TeamManagement: template buttons shown directly in the Game Configurations section (not inside a dialog). Clicking a template creates the config immediately with template defaults. Config cards become clickable to open the edit dialog with the full GameConfigForm. "Add Config" button opens the dialog with no template pre-filled for custom creation.

GameConfigForm: rules section wrapped in a `<Collapsible>` component, collapsed by default. Basic params (name, field size, periods, duration, rotations) always visible.

### 4. Skill badge popover

RosterEditor: clicking a player's skill ranking badge opens a `<Popover>` with the 5 skill options. Selecting updates immediately via dispatch. Edit dialog remains for name, position, goalie changes.

### 5. Compact attendance layout

GameSetup attendance section: tighter rows with less padding. Same toggle behavior, just denser presentation so the list doesn't dominate the viewport.

### 6. Game setup summary line

After Team & Config selection is complete, show a computed summary line inside the existing card: "12 players · 7v7 · 4 rotations · ~3 benched per rotation". Updates reactively as attendance changes.

### 7. Completed section collapsing in GameSetup

After config selection is complete: the Team & Config card collapses to show only the summary line with an "Edit" button to re-expand. No step indicator circles or wizard chrome. Just natural progressive disclosure. Attendance card appears below.

### 8. Dark mode toggle with system detection

- `useTheme` hook managing `light | dark | system` preference
- On mount: check localStorage, fall back to `prefers-color-scheme`
- Applies/removes `.dark` class on `<html>`
- Listens for system preference changes when in "system" mode
- Sun/moon icon button in AppShell header, cycles `system → light → dark`
- Persist to localStorage

## Components needed

Add from shadcn/ui: `Switch`, `Checkbox` (styled), `Collapsible`, `Popover`. Lucide icons for theme toggle (Sun, Moon, Monitor).

## Scope

All changes are within existing components. No new pages or routes. No domain model changes.

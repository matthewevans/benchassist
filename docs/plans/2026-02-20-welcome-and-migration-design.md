# Welcome Screen & Data Migration — Design

**Date:** 2026-02-20
**Status:** Approved

## Problem

New users arriving at BenchBoss with no data (new device, cleared storage, or shared backup from another coach) have no obvious way to import existing data. The import flow is buried in Settings, which is undiscoverable from the empty Dashboard.

## Scenarios

1. **Returning user, new device** — used BenchBoss on another phone/browser, needs to bring data over
2. **Reinstall / cleared storage** — localStorage wiped, needs to restore from backup
3. **Share between coaches** — one coach exports, another imports

## Solution

Two complementary surfaces, both Apple HIG-compliant:

### 1. Welcome Screen (first-launch gate)

A conditional rendering gate (`AppGate`) inside `App.tsx` that checks:

- No existing app data (`state.teams` is empty)
- No `benchassist_welcomed` flag in localStorage

When both conditions are true, renders a full-screen `<Welcome>` component instead of the normal router/AppShell. This is a presentation layer, not a route — no URL, no browser history interaction.

**Layout:**

- Full-bleed, vertically centered
- App icon (~80px), "Welcome to BenchBoss" (large title, semibold), brief subtitle
- Two actions: "Get Started" (filled primary) and "Restore from Backup" (plain secondary)
- "Get Started" → sets `benchassist_welcomed = true`, re-renders into normal app
- "Restore from Backup" → opens existing `ImportMethodDialog` → `ImportDialog` → dispatches import action + sets welcomed flag
- Respects dark mode, 44pt touch targets, system font conventions

**Why not a route:** Apple HIG treats onboarding as a presentation gate, not a navigation destination. No deep-linking, no back button interaction.

### 2. Dashboard Empty-State Import Link

Below the existing "Get Started" steps and "Create First Team" button, add a secondary grouped-list section:

```
┌────────────────────────────────┐
│  📥  Have a backup?            │
│  Import your data         ›    │
└────────────────────────────────┘
```

- Single tappable `GroupedListRow` with chevron
- Opens `ImportMethodDialog` (reuses existing component)
- Disappears when any team data exists (empty state goes away naturally)
- Acts as a safety net for users who dismissed the Welcome screen

## State Management

- **Welcome flag:** `benchassist_welcomed` in localStorage (string `"true"`)
- **No changes to AppContext/reducer** — the flag is UI chrome, not domain data
- Read synchronously in `AppGate` via `useState(() => ...)` — no flash of wrong content
- Edge case: if localStorage is fully cleared, both `benchassist_data` and `benchassist_welcomed` are gone → Welcome shows again (correct behavior)

## Data Flow

**From Welcome "Restore from Backup":**

1. `ImportMethodDialog` opens (file or paste)
2. `ImportDialog` opens (select data or replace all)
3. Dispatch `MERGE_DATA` or `IMPORT_DATA`
4. Set `benchassist_welcomed = true`
5. `AppGate` re-renders into normal app

**From Dashboard "Import your data":**

1. Same `ImportMethodDialog` → `ImportDialog` flow
2. Dispatch fires, state updates, empty state disappears naturally

## Files Changed

- `src/App.tsx` — extract routes into `AppGate` component with welcome condition
- `src/pages/Welcome.tsx` — new full-screen welcome component
- `src/pages/Dashboard.tsx` — add import link to empty state
- i18n translation files — new keys for welcome screen text

## Testing

- `AppGate`: renders Welcome when no data + no flag; renders routes otherwise
- Welcome: "Get Started" sets flag and dismisses; "Restore from Backup" opens import flow

## HIG Compliance Checklist

- [ ] Full-bleed vertically centered welcome layout
- [ ] 44pt minimum touch targets on all interactive elements
- [ ] System font weights (semibold title, regular body)
- [ ] iOS typography size classes (`text-ios-*`)
- [ ] Semantic color tokens (dark mode)
- [ ] Button hierarchy: filled primary + plain secondary
- [ ] Grouped list styling for Dashboard import row
- [ ] No unnecessary decoration or animation

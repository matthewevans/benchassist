# README Redesign — Design Document

**Date:** 2026-02-19
**Status:** Approved

## Goal

Redesign the README.md with Apple HIG-inspired elegance. End-user focused, visual-first, with the mobile PWA experience front and center. New screenshots captured from the running app.

## Design Principles

- **Clarity** (HIG): Content is the UI. Every element earns its place.
- **Deference** (HIG): Structure serves content, never competes with it.
- **Progressive disclosure**: Developer details are accessible but don't clutter the first impression.
- **App Store energy**: The README should feel like a product page, not a technical spec.

## Decisions Made

| Decision          | Choice                                        | Rationale                                                                          |
| ----------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Screenshot format | Mix: mobile hero + desktop detail             | Mobile-first reflects primary use case (sideline). Desktop shows data-dense views. |
| Theme             | Dark mode only                                | App's visual identity. Consistent and sleek.                                       |
| Audience priority | End-users first                               | Lead with value prop and visuals. Dev docs lower.                                  |
| Architecture docs | Keep in README, visible                       | Contributor selling point. Rename to "Under the Hood."                             |
| Project Structure | Collapsible `<details>`                       | Useful for devs, not needed by default.                                            |
| Commands table    | Collapsible `<details>`                       | Same reasoning.                                                                    |
| Hero screens      | Live Focus + Rotation Grid + Practice Planner | The 3 things coaches care about most.                                              |

## README Structure

### 1. Header

- 96px centered logo
- App name as `<h1>`
- Tagline: **"The sideline rotation manager for youth soccer coaches."**
- Sub-line: _"A free, open-source PWA — no backend, no accounts, all data on your device."_
- Nav links: Try the Live App · Features · Screenshots · Getting Started

### 2. Install CTA

Blockquote callout:

> **Get BenchAssist** — Open the [live app](...) on your phone, tap Share → Add to Home Screen. No app store needed.

### 3. Screenshot Hero (Mobile)

Three phone-width screenshots in a centered row:

1. **Live Focus View** — Now/Next rotation cards with period timer
2. **Rotation Grid** — Full grid with position badges and play% column
3. **Practice Planner** — Drill library with age bracket filters

Caption below: _"Live game day — track rotations, plan practices, all from the sideline."_

### 4. Features

Six features, each as bold title + 1-2 sentences. No bullet sub-lists. Order:

1. **Smart Rotation Solver** — Balanced schedules, Web Worker, constraint rules
2. **Live Game Mode** — Period timers, audio alerts, Now/Next focus, mid-game re-solve
3. **Position-Aware Scheduling** — 14 sub-positions, auto-assign to formation slots
4. **Practice Planner** — ~100 drills, age brackets, plan generation
5. **Team & Roster Management** — Bulk import, skill rankings, goalie eligibility
6. **Data Portability** — Export/import, schema migrations, 8-second undo, all local

### 5. Desktop Screenshots

Two wider screenshots in a table:

1. **Rotation Grid** (desktop) — Full grid with stats panel
2. **Team Management** (desktop) — Rosters, game configs, player avatars

### 6. Getting Started

- Prerequisites: Node 20+, pnpm 9+
- Clone + install + run (code block)
- `<details>` for full commands table

### 7. Tech Stack

Current table, unchanged.

### 8. Under the Hood

Renamed from "Architecture Overview." Same content, trimmed slightly to remove solver detail duplicated in Features section.

### 9. Project Structure

Inside `<details>` block. Current file tree, unchanged.

### 10. Contributing

Unchanged.

### 11. License

Unchanged.

## Screenshot Capture Plan

Capture from running dev server via Chrome DevTools MCP.

### Mobile Screenshots (390×844, iPhone 14 viewport)

Navigate to each page, set viewport to 390×844, take screenshot:

1. `/games/:gameId/rotations` — Live Focus View (game in-progress, focus mode)
2. `/games/:gameId/rotations` — Rotation Grid (setup mode, showing grid with stats)
3. `/practice` — Practice Planner (with drills visible)

### Desktop Screenshots (1280px width)

1. `/games/:gameId/rotations` — Full rotation grid with player stats visible
2. `/teams/:teamId` — Team management page with roster and configs

### File Destinations

- `docs/screenshots/live-focus-mobile.png`
- `docs/screenshots/rotation-grid-mobile.png`
- `docs/screenshots/practice-planner-mobile.png`
- `docs/screenshots/rotation-grid-desktop.png`
- `docs/screenshots/team-management-desktop.png`

Old screenshot files will be removed after the new ones are in place.

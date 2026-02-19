# README Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign README.md with Apple HIG-inspired elegance — new screenshots, end-user-focused structure, visual-first layout.

**Architecture:** Content/documentation task. Use Chrome DevTools MCP to capture screenshots from the running dev server (localhost:5173). Write the README in markdown with HTML for layout control.

**Tech Stack:** Chrome DevTools MCP, GitHub-flavored Markdown, HTML for centering/layout

---

### Task 1: Set Up Demo Game with 7v7 Positions

The current live game uses a "5v5 (No Positions)" config — all players on field, no position badges, no bench. For visually rich screenshots, we need a 7v7 game with position badges (GK, DEF, MID, FWD) and bench rotations.

**Current state:** Dev server running at `localhost:5173/benchassist/`. Team "Thunder FC U12" exists with 10 players and a live "vs Rangers" game (5v5, no positions). The team page has quick-add buttons for 7v7.

**Step 1: End the current game**

Navigate to the live game page, open the game actions menu (uid for "..." button), and end the game so we can create a new one.

- URL: `http://localhost:5173/benchassist/games/861b25e9-4ccd-43ca-bf8a-d02eaf94b2f6/rotations`
- Click the "Game actions" button (three dots menu at top-right)
- Look for "End Game" option and click it
- Confirm if prompted

**Step 2: Add a 7v7 game config**

Navigate to the team page and click the "7v7" quick-add button.

- URL: `http://localhost:5173/benchassist/teams/cbcba394-e07f-46d8-b60b-32569f8902b9`
- Click the "7v7" button in the Game Configurations section
- Verify the 7v7 config appears in the list

**Step 3: Create a new game**

- Click "New Game" in the Actions section
- On the game setup page:
  - Select the 7v7 config
  - Select the Spring 2026 roster
  - Enter an opponent name (e.g., "FC Lightning")
  - Assign at least one goalie (pick a player)
  - Click through to generate rotations
- Verify the rotation grid shows position badges (GK, LB, CB, RB, CM, LM, etc.)

**Step 4: Start the game**

- Click "Start Game" to move the game to in-progress status
- The timer should appear at the bottom
- Advance to Rotation 2 (click "Next") so the Focus view shows meaningful Now/Next data with substitution indicators

**Completion criteria:** A live 7v7 game with position badges, bench players, and the Focus view showing Now (R2) and Next (R3) with substitution arrows.

---

### Task 2: Configure Practice Planner

The practice page currently shows "Select a birth year to get started." We need it populated with drills for the screenshot.

**Step 1: Navigate to Practice with team context**

- URL: `http://localhost:5173/benchassist/practice?team=cbcba394-e07f-46d8-b60b-32569f8902b9`
- This should auto-fill birth year (2014 = U12) and player count (10)

**Step 2: Verify drills are showing**

- If the `?team=` param auto-fills, drills should already be visible
- If not, manually enter birth year "2014" and wait for drills to load
- Scroll to verify drill cards with diagrams are visible

**Completion criteria:** Practice page showing age group, settings, and at least 2-3 drill cards with descriptions.

---

### Task 3: Capture Mobile Screenshots

Set the viewport to iPhone 14 dimensions (390×844) and capture 3 screenshots. The mobile view hides the sidebar and shows the tab bar at the bottom.

**Step 1: Set mobile viewport**

Use Chrome DevTools `emulate` to set viewport to 390×844 with mobile flags:

```
width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true
```

**Step 2: Capture Live Focus View**

- Navigate to the live game's rotation page (Focus tab should be default)
- Wait for the page to render fully
- Take screenshot, save to `docs/screenshots/live-focus-mobile.png`
- Expected: Now/Next rotation cards with position badges, sub arrows, period timer at bottom, tab bar

**Step 3: Capture Rotation Grid (mobile)**

- Click the "Grid" tab on the same page
- Wait for grid to render
- Take screenshot, save to `docs/screenshots/rotation-grid-mobile.png`
- Expected: Compact grid with position badges, bench labels, play% column

**Step 4: Capture Practice Planner (mobile)**

- Navigate to Practice page (with team param or previously configured)
- Scroll to show the age group selector + at least one drill card with diagram
- Take screenshot, save to `docs/screenshots/practice-planner-mobile.png`
- Expected: Birth year, age brackets, settings, drill cards

**Completion criteria:** 3 PNG files in `docs/screenshots/` showing mobile-width dark-mode views.

---

### Task 4: Capture Desktop Screenshots

Reset viewport to desktop dimensions and capture 2 screenshots.

**Step 1: Set desktop viewport**

Reset viewport via `emulate`:

```
width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false
```

Or set to null to clear the mobile emulation.

**Step 2: Capture Rotation Grid (desktop)**

- Navigate to the live game's rotation page, Grid tab
- Take screenshot, save to `docs/screenshots/rotation-grid-desktop.png`
- Expected: Full grid with sidebar, position badges, player stats, team strength scores

**Step 3: Capture Team Management (desktop)**

- Navigate to team page: `http://localhost:5173/benchassist/teams/cbcba394-e07f-46d8-b60b-32569f8902b9`
- Take screenshot, save to `docs/screenshots/team-management-desktop.png`
- Expected: Team details, roster list, game configs, actions — all visible with sidebar

**Completion criteria:** 2 PNG files in `docs/screenshots/` showing desktop-width dark-mode views.

---

### Task 5: Write the New README.md

Replace the current README with the approved design from `docs/plans/2026-02-19-readme-redesign-design.md`.

**File:** Modify `README.md`

**Step 1: Write the complete README**

The full README content follows the approved structure:

1. **Header** — centered logo (96px), `<h1>` app name, two-line tagline, nav links
2. **Install CTA** — blockquote with "Get BenchAssist" + PWA install instructions
3. **Screenshot Hero** — 3 mobile screenshots centered in a `<p>` tag, ~260px each, with caption
4. **Features** — 6 features as `**Bold Title**` + 1-2 sentence descriptions
5. **Desktop Screenshots** — 2 screenshots in a markdown table
6. **Getting Started** — Prerequisites + install code block + collapsible commands table
7. **Tech Stack** — same table as current README
8. **Under the Hood** — renamed architecture section, trimmed to remove solver duplication
9. **Project Structure** — same file tree, wrapped in `<details>`
10. **Contributing** — same as current
11. **License** — same as current

Key formatting notes:

- Use `<p align="center">` for centered elements (logo, screenshots, tagline)
- Mobile screenshots use `width="260"` each with `&nbsp;&nbsp;` spacing
- Desktop screenshots use a 2-column markdown table with `|:---:|:---:|` centering
- `<details><summary>` for collapsible sections
- Keep all image paths relative: `docs/screenshots/...` and `public/...`

**Step 2: Verify rendering**

- Check that all image paths are correct and files exist
- Verify the markdown renders correctly (headers, tables, details blocks)

---

### Task 6: Clean Up Old Screenshots

**Step 1: Remove old screenshot files that are no longer referenced**

Old files to remove:

- `docs/screenshots/dashboard.png`
- `docs/screenshots/rotation-grid.png`
- `docs/screenshots/live-focus.png`
- `docs/screenshots/live-grid.png`
- `docs/screenshots/practice-planner.png`
- `docs/screenshots/team-management.png`

```bash
rm docs/screenshots/dashboard.png docs/screenshots/rotation-grid.png \
   docs/screenshots/live-focus.png docs/screenshots/live-grid.png \
   docs/screenshots/practice-planner.png docs/screenshots/team-management.png
```

---

### Task 7: Commit

**Step 1: Stage all changes**

```bash
git add README.md docs/screenshots/
```

**Step 2: Commit**

```bash
git commit -m "Redesign README with App Store-style layout and new screenshots

- Mobile-first hero gallery (Live Focus, Rotation Grid, Practice Planner)
- Desktop detail screenshots (Grid + Team Management)
- HIG-inspired structure: visual-first, concise features, progressive disclosure
- Collapsible dev sections (commands, project structure)
- Renamed 'Architecture' to 'Under the Hood'
- New tagline: 'The sideline rotation manager for youth soccer coaches'"
```

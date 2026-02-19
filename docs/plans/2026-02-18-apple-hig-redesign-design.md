# Apple HIG Redesign — Design Document

## Goal

Transform BenchAssist from a web-styled PWA into a native iOS/iPadOS-feeling app by adopting Apple's Human Interface Guidelines across typography, colors, spacing, navigation, components, and interaction patterns.

## Decisions

- **Navigation**: Bottom tab bar (iPhone) / sidebar (iPad landscape)
- **Forms/Modals**: Bottom sheets for creation flows, centered alerts for confirmations
- **Color identity**: Keep teal/green as app tint, mapped to Apple's semantic color system
- **Scope**: Full HIG overhaul
- **Approach**: Theme-first (tokens → navigation → sheets → polish)
- **Device priority**: Equal iPhone/iPad

---

## 1. Foundation: Design Tokens

### Typography

System font stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif`

| Style       | Size | Weight       | Tracking | Usage                                            |
| ----------- | ---- | ------------ | -------- | ------------------------------------------------ |
| Large Title | 34px | Bold 700     | -0.4px   | Root tab destinations (Teams, Practice, History) |
| Title 1     | 28px | Regular 400  | 0.36px   | Page section headers                             |
| Title 2     | 22px | Regular 400  | -0.26px  | Card titles, subsections                         |
| Title 3     | 20px | Regular 400  | -0.45px  | Tertiary headings                                |
| Headline    | 17px | Semibold 600 | -0.41px  | Nav bar titles, emphasized labels                |
| Body        | 17px | Regular 400  | -0.41px  | Default text, form inputs                        |
| Callout     | 16px | Regular 400  | -0.32px  | Supporting text                                  |
| Subheadline | 15px | Regular 400  | -0.24px  | Secondary descriptions                           |
| Footnote    | 13px | Regular 400  | -0.08px  | Timestamps, metadata                             |
| Caption 1   | 12px | Regular 400  | 0px      | Badges, tags                                     |
| Caption 2   | 11px | Regular 400  | 0.07px   | Smallest text (build hash)                       |

Body text increases from 14px → 17px (Apple's minimum comfortable reading size on mobile).

### Colors

OKLch values mapped to Apple's semantic system:

**Light mode:**

| Token                    | Value                                      | Apple Equivalent                 |
| ------------------------ | ------------------------------------------ | -------------------------------- |
| `--background`           | `#F2F2F7`                                  | systemGroupedBackground          |
| `--card`                 | `#FFFFFF`                                  | secondarySystemGroupedBackground |
| `--card-foreground`      | `#000000`                                  | label                            |
| `--foreground`           | `#000000`                                  | label                            |
| `--muted-foreground`     | `rgba(60, 60, 67, 0.6)`                    | secondaryLabel                   |
| `--primary`              | teal/green (adjusted for WCAG AA on white) | app tint                         |
| `--primary-foreground`   | `#FFFFFF`                                  | —                                |
| `--secondary`            | `rgba(120, 120, 128, 0.12)`                | tertiarySystemFill               |
| `--secondary-foreground` | `#000000`                                  | label                            |
| `--muted`                | `#F2F2F7`                                  | systemGroupedBackground          |
| `--accent`               | `rgba(120, 120, 128, 0.12)`                | tertiarySystemFill               |
| `--accent-foreground`    | `#000000`                                  | label                            |
| `--destructive`          | `#FF3B30`                                  | systemRed                        |
| `--border`               | `rgba(60, 60, 67, 0.29)`                   | separator                        |
| `--input`                | `rgba(120, 120, 128, 0.12)`                | tertiarySystemFill               |
| `--ring`                 | teal/green                                 | app tint                         |

**Dark mode:**

| Token                    | Value                                         | Apple Equivalent                 |
| ------------------------ | --------------------------------------------- | -------------------------------- |
| `--background`           | `#000000`                                     | systemGroupedBackground          |
| `--card`                 | `#1C1C1E`                                     | secondarySystemGroupedBackground |
| `--card-foreground`      | `#FFFFFF`                                     | label                            |
| `--foreground`           | `#FFFFFF`                                     | label                            |
| `--muted-foreground`     | `rgba(235, 235, 245, 0.6)`                    | secondaryLabel                   |
| `--primary`              | teal/green (brighter/more saturated for dark) | app tint                         |
| `--primary-foreground`   | `#000000`                                     | —                                |
| `--secondary`            | `rgba(118, 118, 128, 0.24)`                   | tertiarySystemFill               |
| `--secondary-foreground` | `#FFFFFF`                                     | label                            |
| `--destructive`          | `#FF453A`                                     | systemRed                        |
| `--border`               | `rgba(84, 84, 88, 0.6)`                       | separator                        |
| `--input`                | `rgba(118, 118, 128, 0.24)`                   | tertiarySystemFill               |

### Spacing & Radii

| Token                 | Value                         | Notes                                |
| --------------------- | ----------------------------- | ------------------------------------ |
| `--radius`            | 10px                          | iOS inset grouped list corner radius |
| Button radius         | 12px standard, 9999px capsule | —                                    |
| Sheet top radius      | 10px                          | iOS sheet standard                   |
| Page margin           | 16px (iPhone), 20px (iPad)    | Apple standard content inset         |
| Section gap           | 35px                          | Apple grouped list section spacing   |
| Min touch target      | 44×44px                       | Apple minimum                        |
| Row height (default)  | 44px                          | Apple list row minimum               |
| Row height (subtitle) | 58px                          | With secondary text                  |

### PWA Native-Feel Base CSS

```css
@layer base {
  * {
    -webkit-tap-highlight-color: transparent;
  }
  body {
    font-family:
      -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  button,
  a,
  [role='button'] {
    touch-action: manipulation;
  }
  @media (display-mode: standalone) {
    html,
    body {
      overscroll-behavior: none;
    }
  }
}
```

Viewport meta tag must include `viewport-fit=cover` for safe area insets.

---

## 2. Navigation

### Tab Bar (iPhone / narrow viewports < 768px)

5 tabs:

| Tab      | Icon (Lucide)   | Label    | Route        |
| -------- | --------------- | -------- | ------------ |
| Teams    | `Users`         | Teams    | `/`          |
| New Game | `PlusCircle`    | New Game | `/games/new` |
| Practice | `ClipboardList` | Practice | `/practice`  |
| History  | `Clock`         | History  | `/games`     |
| Settings | `Settings`      | Settings | `/settings`  |

Styling:

- Height: 49px + `env(safe-area-inset-bottom)`
- Background: translucent material (`rgba(255,255,255,0.72)` light / `rgba(29,29,31,0.72)` dark + `backdrop-filter: saturate(180%) blur(20px)`)
- Top: 0.33px hairline separator
- Selected: app tint (filled icon). Unselected: `#8E8E93`
- Labels: 10px (iPhone), 13px (iPad)
- Fixed at bottom, always visible

### Sidebar (iPad landscape / viewports ≥ 1024px)

- 280px width, translucent material background
- Same items as tab bar in vertical list
- Content area takes remaining width
- Sidebar items: 44px row height, icon + label, active state with tinted background

### Nav Bar (per-page, top)

- Height: 44px standard
- Large title mode (96px) on root tab destinations — collapses on scroll
- Translucent material background (same as tab bar)
- Bottom: 0.33px hairline separator (appears when content scrolls behind)
- Back button: `ChevronLeft` icon + parent page label, app tint color
- Right: action buttons (e.g., `+` Add, `Edit`)
- Title: 17px Semibold, centered (standard) or 34px Bold left-aligned (large)

### Settings Page (new)

Consolidates scattered UI:

- Appearance section: Light / Dark / System (inset grouped list with checkmarks)
- Data section: Export Data, Import Data (rows with disclosure chevrons)
- About section: Version, Build hash

---

## 3. Lists & Cards

### Inset Grouped List Style

Used for: team list, player list, config list, settings, game history.

- Page background: `systemGroupedBackground` (`#F2F2F7` / `#000000`)
- Section: white rounded-rect, 10px radius, 16px horizontal inset from screen edge
- Section header: 13px Regular, uppercase, secondaryLabel color, 6px bottom padding
- Row height: 44px minimum (58px with subtitle)
- Separators: 0.33px hairline, inset 16px from left (aligned with text start)
- Disclosure chevron: systemGray3, right-aligned
- Selected state: systemGray4 background

### Team Row

- 58px height
- Left: Team name (17px body) + subtitle line (`U12 · Coed · 15 players`, 15px subheadline, secondaryLabel)
- Right: Disclosure chevron
- Gender colored dot before subtitle

### Player Row

- 44px height
- Left: Player name (17px body)
- Right: Skill stars + position badge(s) + optional goalie icon
- Swipe left: red "Delete" action
- Swipe right (future): "Edit" action

### Content That Stays as Cards

- Active game banner: prominent, tinted background, resume CTA
- Rotation grid cells: data visualization
- Drill cards: rich content with timing, diagrams, metadata
- Stats summary cards: numerical data display

Card styling: 12px corner radius, subtle shadow (0 1px 3px rgba(0,0,0,0.08)), standard card background.

---

## 4. Sheets & Forms

### Bottom Sheet (replaces Dialog)

Used for: new team, new roster, rename, game config editor, bulk player import.

- Slides up from bottom, spring animation (350ms)
- 10px top corner radius
- Grab indicator: 36×5px, centered, 2.5px radius, systemGray3 color, 5px from top
- Dimmed overlay: black at 30% opacity
- Detents:
  - Half (~50% screen height): simple forms (new team, rename, confirm)
  - Large (full minus status bar gap): complex forms (config editor, bulk import)
- Swipe down to dismiss
- `overscroll-behavior: contain`

### Confirmation Alerts (stays centered)

Used for: delete confirmations, destructive actions.

- 270px fixed width
- 14px corner radius
- Title: 17px Semibold, centered
- Message: 13px Regular, secondaryLabel, centered
- Hairline separator above buttons
- Buttons: full-width, stacked vertically
  - Destructive: red text, regular weight
  - Cancel: bold weight (draws eye to safe option)
  - Positioned: Cancel at bottom (iOS convention)

### Form Inputs

- Inside inset grouped rows or standalone
- 44px minimum height
- 17px body text
- Floating label or left-aligned label with right-aligned input
- Unfocused: no border, cell background only
- Focused: app tint underline/ring
- Select: native `<select>` on mobile (triggers iOS picker wheel)

---

## 5. Buttons

| Level              | Style                                | Height      | Radius | Usage                      |
| ------------------ | ------------------------------------ | ----------- | ------ | -------------------------- |
| Primary            | Filled, app tint bg, white text      | 50px        | 12px   | Start Game, Save, Generate |
| Secondary          | tertiarySystemFill bg, app tint text | 38px        | 12px   | Regenerate, Cancel         |
| Tertiary           | Plain text, app tint color, no bg    | 44px target | —      | Nav actions, inline links  |
| Destructive        | Plain text, systemRed                | 44px target | —      | Delete (in lists/sheets)   |
| Destructive Filled | systemRed bg, white text             | 50px        | 12px   | Confirm delete (rare)      |
| Icon               | Ghost, 44×44px touch area            | 44px        | —      | Toolbar/nav bar actions    |
| Capsule            | Filled or outline, pill shape        | 32px        | 9999px | Filter chips, tags         |

Disabled state: 30–40% opacity on entire button.

### Badges

- Pill: `border-radius: 9999px`, 20px height, 10px horizontal padding, 12px caption font
- Position colors preserved: DEF=purple, MID=green, FWD=orange, GK=yellow
- Status badges: in-progress=systemGreen, completed=systemGray, setup=systemBlue

### Switches

- 51×31px (iOS standard)
- On: `#34C759` (systemGreen). Off: systemGray4
- Spring transition

---

## 6. Materials & Polish

### Translucent Bars

```css
/* Light */
.material-bar {
  background: rgba(249, 249, 249, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
}

/* Dark */
.dark .material-bar {
  background: rgba(29, 29, 31, 0.72);
}
```

### Animations

| Element              | Animation                         | Duration       |
| -------------------- | --------------------------------- | -------------- |
| Page push/pop        | Slide left/right                  | 300ms ease-out |
| Sheet present        | Slide up + spring                 | 350ms spring   |
| Sheet dismiss        | Slide down                        | 250ms ease-in  |
| Tab switch           | Instant (no transition)           | 0ms            |
| Large title collapse | Smooth interpolation              | Scroll-driven  |
| List row tap         | Instant highlight, 300ms fade out | —              |
| Alert appear         | Scale from 1.1 + fade in          | 200ms ease-out |

### Dark Mode

- No card shadows in dark mode
- Tint colors slightly brighter/more saturated
- Separators use different opacity values
- Cards use `#1C1C1E` (not inverted white)

---

## 7. Adaptive Breakpoints

| Range      | Device         | Nav                          | Layout                         |
| ---------- | -------------- | ---------------------------- | ------------------------------ |
| < 768px    | iPhone         | Bottom tab bar + top nav bar | Single column, 16px margins    |
| 768–1023px | iPad portrait  | Bottom tab bar + top nav bar | Single column, 20px margins    |
| ≥ 1024px   | iPad landscape | Sidebar + top nav bar        | Sidebar (280px) + content area |

Content max-width: `max-w-4xl` on the content area (prevents excessive line lengths on large screens).

---

## 8. New/Modified Components

### New Components to Create

| Component        | Purpose                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `TabBar`         | Bottom tab bar with icons, labels, active state, safe area         |
| `Sidebar`        | iPad sidebar variant of tab bar                                    |
| `NavBar`         | Per-page top nav bar with large title support                      |
| `BottomSheet`    | Sheet component with grab indicator, detents, swipe dismiss        |
| `GroupedList`    | iOS inset grouped list wrapper (section headers, separators, rows) |
| `GroupedListRow` | Individual row with chevron, subtitle, swipe actions               |
| `IOSAlert`       | Centered confirmation dialog matching iOS alert style              |
| `Settings` page  | New page consolidating theme + data management                     |

### Components to Restyle

| Component             | Changes                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `AppShell`            | Replace header with NavBar + TabBar/Sidebar layout                   |
| `Button`              | New size/variant system matching iOS hierarchy                       |
| `Card`                | Adjusted radius (12px), shadows, spacing                             |
| `Input`               | 44px height, 17px body text, iOS focus style                         |
| `Select`              | Native picker on mobile                                              |
| `Switch`              | iOS dimensions (51×31px), green on-state                             |
| `Badge`               | Pill shape, position-specific colors                                 |
| `Dialog` → `IOSAlert` | Centered alert for confirmations only                                |
| All page components   | Updated to use GroupedList, new typography scale, NavBar integration |

### Components to Remove

| Component            | Replacement          |
| -------------------- | -------------------- |
| `Dialog` (for forms) | `BottomSheet`        |
| Header nav links     | `TabBar` / `Sidebar` |
| Theme toggle button  | Settings page        |

---

## 9. Route Changes

| Current                       | New                                               | Notes                           |
| ----------------------------- | ------------------------------------------------- | ------------------------------- |
| —                             | `/settings`                                       | New settings page               |
| Export/Import on Dashboard    | Moved to `/settings`                              | Dashboard focuses on teams only |
| Theme toggle in header        | Moved to `/settings`                              | Cleaner nav bar                 |
| All routes wrap in `AppShell` | AppShell becomes TabBar + NavBar + Sidebar layout | —                               |

---

## 10. Files Affected (High-Level)

### Core Infrastructure

- `src/index.css` — Complete token replacement
- `index.html` — Viewport meta tag update
- `src/components/layout/AppShell.tsx` — Full rewrite
- `src/App.tsx` — Add Settings route

### New Files

- `src/components/layout/TabBar.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/NavBar.tsx`
- `src/components/ui/bottom-sheet.tsx`
- `src/components/ui/grouped-list.tsx`
- `src/components/ui/ios-alert.tsx`
- `src/pages/Settings.tsx`

### Restyled Components (all files in `src/components/ui/`)

- `button.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `switch.tsx`, `badge.tsx`, `dialog.tsx`

### All Page Components

- `src/pages/Dashboard.tsx`
- `src/pages/TeamManagement.tsx`
- `src/pages/RosterEditor.tsx`
- `src/pages/GameSetup.tsx`
- `src/pages/RotationGrid.tsx`
- `src/pages/GameHistory.tsx`
- `src/pages/Practice.tsx`

# Apple HIG Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform BenchAssist's UI from web-styled to iOS-native-feeling by applying Apple Human Interface Guidelines across every layer.

**Architecture:** Theme-first approach — replace CSS design tokens first (instant global effect), then build new layout components (TabBar, NavBar, Sidebar), then create new UI primitives (BottomSheet, GroupedList, IOSAlert), then update each page to use the new components. Existing shadcn/ui components are restyled in-place to preserve the component API.

**Tech Stack:** React 19, Tailwind CSS v4, Radix UI primitives, CVA, Lucide icons. No new dependencies — the BottomSheet uses the existing Radix Dialog primitive with bottom-slide styling. Vaul (drawer library) is an option if swipe-to-dismiss proves complex to implement from scratch.

**Design doc:** `docs/plans/2026-02-18-apple-hig-redesign-design.md` — refer to this for exact color values, spacing tokens, and component specs.

---

## Phase 1: Foundation (CSS Tokens & PWA Base)

### Task 1: Update viewport meta tag and PWA base CSS

**Files:**

- Modify: `index.html`
- Modify: `src/index.css`

**Step 1: Update index.html viewport meta**

Add `viewport-fit=cover` and Apple PWA meta tags:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

**Step 2: Add PWA native-feel CSS to index.css**

Add to the `@layer base` block in `src/index.css`:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
    -webkit-tap-highlight-color: transparent;
  }
  body {
    @apply bg-background text-foreground;
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

**Step 3: Run tests to confirm no regressions**

Run: `pnpm test:run`
Expected: All 23 test files pass.

**Step 4: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: add PWA native-feel CSS and viewport-fit=cover"
```

---

### Task 2: Replace color tokens with Apple HIG semantic colors

**Files:**

- Modify: `src/index.css`

**Step 1: Replace `:root` light mode tokens**

Replace the `:root` block with Apple HIG semantic colors. Keep OKLch where possible, use sRGB for Apple's exact alpha-based values:

```css
:root {
  --radius: 0.625rem;
  /* Apple systemGroupedBackground */
  --background: oklch(0.955 0.005 264.05);
  --foreground: oklch(0 0 0);
  /* Apple secondarySystemGroupedBackground */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0 0 0);
  /* App tint: teal/green adjusted for WCAG AA on white */
  --primary: oklch(0.532 0.157 149.48);
  --primary-foreground: oklch(1 0 0);
  /* Apple tertiarySystemFill */
  --secondary: oklch(0.553 0 0 / 12%);
  --secondary-foreground: oklch(0 0 0);
  --muted: oklch(0.955 0.005 264.05);
  /* Apple secondaryLabel */
  --muted-foreground: oklch(0.322 0.005 264 / 60%);
  --accent: oklch(0.553 0 0 / 12%);
  --accent-foreground: oklch(0 0 0);
  /* Apple systemRed #FF3B30 */
  --destructive: oklch(0.627 0.258 29.23);
  /* Apple separator */
  --border: oklch(0.322 0.005 264 / 29%);
  --input: oklch(0.553 0 0 / 12%);
  --ring: oklch(0.532 0.157 149.48);
  /* Chart colors stay the same */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0 0 0);
  --sidebar-primary: oklch(0 0 0);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.553 0 0 / 12%);
  --sidebar-accent-foreground: oklch(0 0 0);
  --sidebar-border: oklch(0.322 0.005 264 / 29%);
  --sidebar-ring: oklch(0.553 0 0);
}
```

**Step 2: Replace `.dark` dark mode tokens**

```css
.dark {
  /* Apple systemGroupedBackground (dark) = #000000 */
  --background: oklch(0 0 0);
  --foreground: oklch(1 0 0);
  /* Apple secondarySystemGroupedBackground (dark) = #1C1C1E */
  --card: oklch(0.195 0 0);
  --card-foreground: oklch(1 0 0);
  --popover: oklch(0.195 0 0);
  --popover-foreground: oklch(1 0 0);
  /* Brighter tint for dark mode */
  --primary: oklch(0.696 0.17 162.48);
  --primary-foreground: oklch(0 0 0);
  /* Apple tertiarySystemFill (dark) */
  --secondary: oklch(0.553 0 0 / 24%);
  --secondary-foreground: oklch(1 0 0);
  --muted: oklch(0.195 0 0);
  /* Apple secondaryLabel (dark) */
  --muted-foreground: oklch(0.941 0.005 264 / 60%);
  --accent: oklch(0.553 0 0 / 24%);
  --accent-foreground: oklch(1 0 0);
  /* Apple systemRed (dark) #FF453A */
  --destructive: oklch(0.646 0.243 26.7);
  /* Apple separator (dark) */
  --border: oklch(0.4 0 0 / 60%);
  --input: oklch(0.553 0 0 / 24%);
  --ring: oklch(0.696 0.17 162.48);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.195 0 0);
  --sidebar-foreground: oklch(1 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.553 0 0 / 24%);
  --sidebar-accent-foreground: oklch(1 0 0);
  --sidebar-border: oklch(0.4 0 0 / 60%);
  --sidebar-ring: oklch(0.553 0 0);
}
```

**Step 3: Run tests**

Run: `pnpm test:run`
Expected: All pass — color tokens don't affect test behavior.

**Step 4: Check dev server visually**

Run: `pnpm dev`
Verify: Background is now the subtle gray (#F2F2F7 light / #000000 dark), cards are white, text is crisp black/white. Dark mode should feel deeper with true black background.

**Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: replace color tokens with Apple HIG semantic colors"
```

---

### Task 3: Add iOS typography utility classes

**Files:**

- Modify: `src/index.css`

**Step 1: Add iOS typography utilities to index.css**

Add a new `@utility` block or use `@layer utilities` with Tailwind v4. These provide semantic text classes matching Apple's type scale:

```css
@layer utilities {
  .text-ios-large-title {
    font-size: 34px;
    line-height: 41px;
    font-weight: 700;
    letter-spacing: -0.4px;
  }
  .text-ios-title1 {
    font-size: 28px;
    line-height: 34px;
    font-weight: 400;
    letter-spacing: 0.36px;
  }
  .text-ios-title2 {
    font-size: 22px;
    line-height: 28px;
    font-weight: 400;
    letter-spacing: -0.26px;
  }
  .text-ios-title3 {
    font-size: 20px;
    line-height: 25px;
    font-weight: 400;
    letter-spacing: -0.45px;
  }
  .text-ios-headline {
    font-size: 17px;
    line-height: 22px;
    font-weight: 600;
    letter-spacing: -0.41px;
  }
  .text-ios-body {
    font-size: 17px;
    line-height: 22px;
    font-weight: 400;
    letter-spacing: -0.41px;
  }
  .text-ios-callout {
    font-size: 16px;
    line-height: 21px;
    font-weight: 400;
    letter-spacing: -0.32px;
  }
  .text-ios-subheadline {
    font-size: 15px;
    line-height: 20px;
    font-weight: 400;
    letter-spacing: -0.24px;
  }
  .text-ios-footnote {
    font-size: 13px;
    line-height: 18px;
    font-weight: 400;
    letter-spacing: -0.08px;
  }
  .text-ios-caption1 {
    font-size: 12px;
    line-height: 16px;
    font-weight: 400;
    letter-spacing: 0px;
  }
  .text-ios-caption2 {
    font-size: 11px;
    line-height: 13px;
    font-weight: 400;
    letter-spacing: 0.07px;
  }
}
```

**Step 2: Run tests**

Run: `pnpm test:run`
Expected: All pass.

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add iOS HIG typography utility classes"
```

---

## Phase 2: Restyle Existing UI Components

### Task 4: Restyle Button component

**Files:**

- Modify: `src/components/ui/button.tsx`

**Step 1: Update button variants and sizes**

Replace the `buttonVariants` CVA config with iOS HIG-aligned styles. Key changes:

- Default height h-9 → `h-[50px]` for primary, `h-[38px]` for secondary
- Radius: `rounded-xl` (12px) for filled, `rounded-full` for capsule
- New sizes: `primary` (50px), `secondary` (38px), `icon` (44×44px touch target)
- Disabled: `disabled:opacity-35` (Apple's 30-40%)

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-ios-body font-medium transition-all disabled:pointer-events-none disabled:opacity-35 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground rounded-xl active:bg-primary/80',
        destructive: 'bg-destructive text-white rounded-xl active:bg-destructive/80',
        'destructive-plain': 'text-destructive',
        secondary: 'bg-secondary text-primary rounded-xl active:bg-secondary/80',
        ghost: 'active:bg-accent/80',
        link: 'text-primary underline-offset-4 hover:underline',
        plain: 'text-primary',
      },
      size: {
        default: 'h-[50px] px-5 text-ios-body font-semibold',
        sm: 'h-[38px] px-4 text-ios-subheadline',
        xs: 'h-8 px-3 text-ios-footnote',
        lg: 'h-[50px] px-6 text-ios-body font-semibold w-full',
        icon: 'size-11',
        'icon-sm': 'size-9',
        'icon-xs': 'size-7',
        capsule: 'h-8 px-4 rounded-full text-ios-footnote',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
```

Note: the existing `outline` variant becomes `secondary`. `ghost` stays for icon-area invisible buttons. Add `plain` for Apple's text-only button style and `destructive-plain` for red text delete actions.

**Step 2: Run tests**

Run: `pnpm test:run`
Expected: All pass. Button is purely presentational — tests reference it by role, not class.

**Step 3: Verify visually**

Run: `pnpm dev`
Check the Dashboard "New Team" button and various buttons across pages.

**Step 4: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: restyle Button with iOS HIG sizes and variants"
```

---

### Task 5: Restyle Card, Input, Switch, Badge components

**Files:**

- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/switch.tsx`
- Modify: `src/components/ui/badge.tsx`

**Step 1: Update Card**

Change the Card base class to use iOS styling:

- `rounded-xl` → `rounded-[12px]`
- Shadow: `shadow-[0_1px_3px_rgba(0,0,0,0.08)]`
- Dark mode: no shadow via `dark:shadow-none`
- Keep the `gap-6 py-6` spacing

```
'bg-card text-card-foreground flex flex-col gap-6 rounded-[12px] border py-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none'
```

**Step 2: Update Input**

Key changes:

- Height: `h-9` → `h-11` (44px)
- Text: add `text-ios-body`
- Remove border by default, add `bg-secondary` fill
- Focus: `focus-visible:ring-primary/30 focus-visible:ring-2`

```
'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-11 w-full min-w-0 rounded-lg bg-secondary px-3 py-2 text-ios-body transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:opacity-35'
'focus-visible:ring-primary/30 focus-visible:ring-2'
```

**Step 3: Update Switch**

iOS switch is 51×31px with green on-state:

- Remove the `size` prop variants (keep just one iOS-standard size)
- Dimensions: `w-[51px] h-[31px]`
- Checked: `data-[state=checked]:bg-[#34C759]` (systemGreen)
- Unchecked: `data-[state=unchecked]:bg-[#E5E5EA]` (systemGray5 light) / `dark:data-[state=unchecked]:bg-[#39393D]`
- Thumb: 27px circle

```typescript
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-35',
        'data-[state=checked]:bg-[#34C759] data-[state=unchecked]:bg-[#E5E5EA] dark:data-[state=unchecked]:bg-[#39393D]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[27px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] ring-0 transition-transform data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]"
      />
    </SwitchPrimitive.Root>
  );
}
```

Note: Any component using `<Switch size="sm">` needs to be updated to remove the `size` prop. Search for Switch usages and update.

**Step 4: Update Badge**

Keep pill shape, update sizing to iOS caption1 spec:

```
'inline-flex items-center justify-center rounded-full border border-transparent px-2.5 py-0.5 text-ios-caption1 font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden'
```

Variants stay the same — the semantic color tokens already got updated in Task 2.

**Step 5: Run tests**

Run: `pnpm test:run`
Expected: All pass. If any tests reference `size="sm"` on Switch, update them.

**Step 6: Commit**

```bash
git add src/components/ui/card.tsx src/components/ui/input.tsx src/components/ui/switch.tsx src/components/ui/badge.tsx
git commit -m "feat: restyle Card, Input, Switch, Badge to iOS HIG specs"
```

---

## Phase 3: New Layout Components

### Task 6: Create TabBar component

**Files:**

- Create: `src/components/layout/TabBar.tsx`
- Test: `src/components/layout/TabBar.test.tsx`

**Step 1: Write TabBar test**

```typescript
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TabBar } from './TabBar.tsx';

function renderWithRouter(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TabBar />
    </MemoryRouter>,
  );
}

describe('TabBar', () => {
  it('renders all 5 tab items', () => {
    renderWithRouter();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('New Game')).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('marks the active tab based on current route', () => {
    renderWithRouter('/practice');
    const practiceLink = screen.getByText('Practice').closest('a');
    expect(practiceLink).toHaveAttribute('aria-current', 'page');
  });

  it('links to correct routes', () => {
    renderWithRouter();
    expect(screen.getByText('Teams').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('New Game').closest('a')).toHaveAttribute('href', '/games/new');
    expect(screen.getByText('Practice').closest('a')).toHaveAttribute('href', '/practice');
    expect(screen.getByText('History').closest('a')).toHaveAttribute('href', '/games');
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/layout/TabBar.test.tsx`
Expected: FAIL — module not found.

**Step 3: Implement TabBar**

```typescript
import { Link, useLocation } from 'react-router-dom';
import { Users, PlusCircle, ClipboardList, Clock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

const TAB_ITEMS = [
  { path: '/', label: 'Teams', icon: Users },
  { path: '/games/new', label: 'New Game', icon: PlusCircle },
  { path: '/practice', label: 'Practice', icon: ClipboardList },
  { path: '/games', label: 'History', icon: Clock },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

function isTabActive(pathname: string, tabPath: string): boolean {
  if (tabPath === '/') {
    return pathname === '/' || pathname.startsWith('/teams');
  }
  if (tabPath === '/games') {
    return pathname === '/games';
  }
  return pathname === tabPath || pathname.startsWith(tabPath + '/');
}

export function TabBar() {
  const location = useLocation();

  return (
    <nav
      className={cn(
        'fixed bottom-0 inset-x-0 z-50 lg:hidden',
        'border-t border-border/50',
        'bg-[rgba(249,249,249,0.72)] dark:bg-[rgba(29,29,31,0.72)]',
        'backdrop-blur-xl backdrop-saturate-[180%]',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="flex items-center justify-around h-[49px]">
        {TAB_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = isTabActive(location.pathname, path);
          return (
            <Link
              key={path}
              to={path}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full',
                'text-[10px] md:text-[13px]',
                active ? 'text-primary' : 'text-[#8E8E93]',
              )}
            >
              <Icon className="size-[22px] stroke-[1.5]" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/layout/TabBar.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/layout/TabBar.tsx src/components/layout/TabBar.test.tsx
git commit -m "feat: create TabBar component with iOS HIG styling"
```

---

### Task 7: Create NavBar component

**Files:**

- Create: `src/components/layout/NavBar.tsx`
- Test: `src/components/layout/NavBar.test.tsx`

**Step 1: Write NavBar test**

```typescript
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavBar } from './NavBar.tsx';

function renderWithRouter(ui: React.ReactElement, initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>,
  );
}

describe('NavBar', () => {
  it('renders the title', () => {
    renderWithRouter(<NavBar title="Teams" />);
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });

  it('renders a back button when backTo is provided', () => {
    renderWithRouter(<NavBar title="Roster" backTo="/" backLabel="Teams" />);
    const backLink = screen.getByLabelText('Back to Teams');
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('does not render back button when backTo is not provided', () => {
    renderWithRouter(<NavBar title="Teams" />);
    expect(screen.queryByLabelText(/back/i)).not.toBeInTheDocument();
  });

  it('renders trailing actions', () => {
    renderWithRouter(
      <NavBar title="Teams" trailing={<button>Add</button>} />,
    );
    expect(screen.getByText('Add')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/layout/NavBar.test.tsx`
Expected: FAIL.

**Step 3: Implement NavBar**

```typescript
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface NavBarProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  trailing?: ReactNode;
  largeTitle?: boolean;
  className?: string;
}

export function NavBar({
  title,
  backTo,
  backLabel,
  trailing,
  largeTitle = false,
  className,
}: NavBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40',
        'bg-[rgba(249,249,249,0.72)] dark:bg-[rgba(29,29,31,0.72)]',
        'backdrop-blur-xl backdrop-saturate-[180%]',
        'border-b border-border/50',
        'pt-[env(safe-area-inset-top)]',
        className,
      )}
    >
      {/* Standard bar: 44px */}
      <div className="flex items-center justify-between h-11 px-4">
        {/* Leading: back button or spacer */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {backTo ? (
            <Link
              to={backTo}
              aria-label={`Back to ${backLabel ?? 'previous page'}`}
              className="flex items-center gap-0.5 text-primary -ml-2 pr-2 py-2 shrink-0"
            >
              <ChevronLeft className="size-[22px] stroke-[2.5]" />
              {backLabel && (
                <span className="text-ios-body">{backLabel}</span>
              )}
            </Link>
          ) : null}
        </div>

        {/* Center title (standard mode only) */}
        {!largeTitle && (
          <h1 className="text-ios-headline text-center absolute left-1/2 -translate-x-1/2 truncate max-w-[60%]">
            {title}
          </h1>
        )}

        {/* Trailing actions */}
        <div className="flex items-center gap-2 shrink-0">
          {trailing}
        </div>
      </div>

      {/* Large title row */}
      {largeTitle && (
        <div className="px-4 pb-2">
          <h1 className="text-ios-large-title">{title}</h1>
        </div>
      )}
    </header>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/layout/NavBar.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/layout/NavBar.tsx src/components/layout/NavBar.test.tsx
git commit -m "feat: create NavBar component with iOS HIG styling"
```

---

### Task 8: Create Sidebar component

**Files:**

- Create: `src/components/layout/Sidebar.tsx`

**Step 1: Implement Sidebar**

The sidebar is the large-screen variant of the tab bar. Same items, vertical layout.

```typescript
import { Link, useLocation } from 'react-router-dom';
import { Users, PlusCircle, ClipboardList, Clock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

const SIDEBAR_ITEMS = [
  { path: '/', label: 'Teams', icon: Users },
  { path: '/games/new', label: 'New Game', icon: PlusCircle },
  { path: '/practice', label: 'Practice', icon: ClipboardList },
  { path: '/games', label: 'History', icon: Clock },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

function isActive(pathname: string, itemPath: string): boolean {
  if (itemPath === '/') {
    return pathname === '/' || pathname.startsWith('/teams');
  }
  if (itemPath === '/games') {
    return pathname === '/games';
  }
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
}

export function Sidebar() {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-[280px] shrink-0 h-screen sticky top-0',
        'bg-[rgba(249,249,249,0.72)] dark:bg-[rgba(29,29,31,0.72)]',
        'backdrop-blur-xl backdrop-saturate-[180%]',
        'border-r border-border/50',
        'pt-[env(safe-area-inset-top)]',
      )}
    >
      <div className="px-4 pt-4 pb-2">
        <span className="text-ios-headline">BenchAssist</span>
      </div>
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {SIDEBAR_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = isActive(location.pathname, path);
          return (
            <Link
              key={path}
              to={path}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 h-11 px-3 rounded-lg text-ios-body transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-accent',
              )}
            >
              <Icon className="size-[22px] stroke-[1.5]" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 text-ios-caption2 text-muted-foreground">
        build {__BUILD_HASH__}
      </div>
    </aside>
  );
}
```

**Step 2: Run existing tests**

Run: `pnpm test:run`
Expected: All pass — Sidebar is new, doesn't affect existing code.

**Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: create Sidebar component for iPad landscape layout"
```

---

### Task 9: Rewrite AppShell with TabBar + NavBar + Sidebar

**Files:**

- Modify: `src/components/layout/AppShell.tsx`

**Step 1: Rewrite AppShell**

Replace the current header-based layout with the new TabBar/Sidebar structure:

```typescript
import { Outlet } from 'react-router-dom';
import { TabBar } from '@/components/layout/TabBar.tsx';
import { Sidebar } from '@/components/layout/Sidebar.tsx';

export function AppShell() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar: visible on lg+ (≥1024px) */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 max-w-4xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Tab bar: visible below lg */}
      <TabBar />
    </div>
  );
}
```

Each page now provides its own `<NavBar>` at the top of its content (instead of AppShell providing a shared header). This matches the iOS pattern where each screen controls its own navigation bar.

**Important:** Pages need bottom padding to avoid content being hidden behind the tab bar. Add `pb-[calc(49px+env(safe-area-inset-bottom))] lg:pb-0` to the main container, or each page can handle it.

Update the `<main>` to:

```typescript
<main className="flex-1 max-w-4xl mx-auto w-full pb-[calc(49px+env(safe-area-inset-bottom))] lg:pb-0">
```

**Step 2: Run tests**

Run: `pnpm test:run`
Expected: Some page-level tests may fail if they depend on the old header structure (nav links). Fix as needed — the tests should render content correctly since `<Outlet>` still renders the same page components.

**Step 3: Visually verify**

Run: `pnpm dev`
Verify: Bottom tab bar visible on narrow viewport, sidebar visible on wide viewport (1024px+). Old header is gone. Pages render without their own NavBar yet — that's OK, they'll get NavBars in Phase 5.

**Step 4: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: rewrite AppShell with TabBar + Sidebar layout"
```

---

### Task 10: Add Settings route and Settings page

**Files:**

- Create: `src/pages/Settings.tsx`
- Modify: `src/App.tsx`

**Step 1: Create Settings page**

This consolidates theme toggle + export/import from Dashboard.

```typescript
import { useRef, useState } from 'react';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { useTheme, type ThemePreference } from '@/hooks/useTheme.ts';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import { readJSONFile } from '@/storage/exportImport.ts';
import { ExportDialog } from '@/components/ExportDialog.tsx';
import { ImportDialog } from '@/components/ImportDialog.tsx';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import type { StorageData } from '@/storage/localStorage.ts';

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function Settings() {
  const { preference, cycle } = useTheme();
  const { state, dispatch } = useAppContext();
  const dispatchWithUndo = useUndoToast();
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<StorageData | null>(null);

  // cycle() cycles through system→light→dark, but we want direct selection
  // useTheme doesn't expose setPreference directly — we'll need to add it or use cycle
  // For now, use cycle and note that a direct setter would be better

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const data = await readJSONFile(file);
      setImportData(data);
    } catch {
      // Import error handled by ImportDialog
    }
  }

  return (
    <div>
      <NavBar title="Settings" largeTitle />

      <div className="px-4 md:px-5 space-y-9">
        {/* Appearance Section */}
        <section>
          <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            Appearance
          </h2>
          <div className="bg-card rounded-[10px]">
            {APPEARANCE_OPTIONS.map((option, i) => (
              <button
                key={option.value}
                onClick={() => {
                  // Cycle until we reach the desired preference
                  // TODO: Expose setPreference from useTheme for direct selection
                  let current = preference;
                  while (current !== option.value) {
                    cycle();
                    const order: ThemePreference[] = ['system', 'light', 'dark'];
                    const idx = order.indexOf(current);
                    current = order[(idx + 1) % order.length];
                  }
                }}
                className={cn(
                  'flex items-center justify-between w-full h-11 px-4 text-ios-body',
                  i < APPEARANCE_OPTIONS.length - 1 && 'border-b border-border/50 ml-4',
                )}
              >
                <span>{option.label}</span>
                {preference === option.value && (
                  <Check className="size-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Data Section */}
        <section>
          <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            Data
          </h2>
          <div className="bg-card rounded-[10px]">
            <button
              onClick={() => setIsExporting(true)}
              className="flex items-center justify-between w-full h-11 px-4 text-ios-body border-b border-border/50 ml-4"
            >
              <span>Export Backup</span>
              <ChevronRight className="size-5 text-[#C7C7CC] dark:text-[#48484A]" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-between w-full h-11 px-4 text-ios-body"
            >
              <span>Import Backup</span>
              <ChevronRight className="size-5 text-[#C7C7CC] dark:text-[#48484A]" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </section>

        {/* About Section */}
        <section>
          <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            About
          </h2>
          <div className="bg-card rounded-[10px]">
            <div className="flex items-center justify-between h-11 px-4 text-ios-body border-b border-border/50 ml-4">
              <span>Version</span>
              <span className="text-muted-foreground">1.0</span>
            </div>
            <div className="flex items-center justify-between h-11 px-4 text-ios-body">
              <span>Build</span>
              <span className="text-muted-foreground">{__BUILD_HASH__}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Export/Import dialogs */}
      <ExportDialog
        open={isExporting}
        onOpenChange={setIsExporting}
        teams={state.teams}
        games={state.games}
      />

      {importData && (
        <ImportDialog
          open={importData !== null}
          onOpenChange={(open) => { if (!open) setImportData(null); }}
          importData={importData}
          onImportSelected={(filtered) => {
            dispatchWithUndo({
              type: 'MERGE_DATA',
              payload: {
                teams: filtered.teams,
                games: filtered.games,
                favoriteDrillIds: filtered.favoriteDrillIds ?? [],
              },
            });
            setImportData(null);
          }}
          onReplaceAll={(data) => {
            dispatchWithUndo({
              type: 'IMPORT_DATA',
              payload: {
                teams: data.teams,
                games: data.games,
                favoriteDrillIds: data.favoriteDrillIds ?? [],
              },
            });
            setImportData(null);
          }}
        />
      )}
    </div>
  );
}
```

**Note:** The `useTheme` hook currently only exposes `cycle()`, not a direct setter. Before implementing, add a `setPreference` to the hook:

In `src/hooks/useTheme.ts`, add to the return value:

```typescript
return { preference, resolved, cycle, setPreference };
```

Then the Settings page can use `setPreference(option.value)` directly instead of the cycle workaround.

**Step 2: Add route in App.tsx**

Add Settings import and route:

```typescript
import { Settings } from '@/pages/Settings.tsx';

// Inside Routes:
<Route path="settings" element={<Settings />} />
```

**Step 3: Run tests**

Run: `pnpm test:run`
Expected: All pass.

**Step 4: Commit**

```bash
git add src/pages/Settings.tsx src/App.tsx src/hooks/useTheme.ts
git commit -m "feat: add Settings page with appearance, data management, and about sections"
```

---

## Phase 4: New UI Primitives

### Task 11: Create BottomSheet component

**Files:**

- Create: `src/components/ui/bottom-sheet.tsx`
- Test: `src/components/ui/bottom-sheet.test.tsx`

**Step 1: Write BottomSheet test**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomSheet } from './bottom-sheet.tsx';

describe('BottomSheet', () => {
  it('renders children when open', () => {
    render(
      <BottomSheet open onOpenChange={() => {}}>
        <div>Sheet Content</div>
      </BottomSheet>,
    );
    expect(screen.getByText('Sheet Content')).toBeInTheDocument();
  });

  it('does not render children when closed', () => {
    render(
      <BottomSheet open={false} onOpenChange={() => {}}>
        <div>Sheet Content</div>
      </BottomSheet>,
    );
    expect(screen.queryByText('Sheet Content')).not.toBeInTheDocument();
  });

  it('renders a grab indicator', () => {
    render(
      <BottomSheet open onOpenChange={() => {}}>
        <div>Content</div>
      </BottomSheet>,
    );
    expect(screen.getByTestId('grab-indicator')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <BottomSheet open onOpenChange={() => {}} title="New Team">
        <div>Content</div>
      </BottomSheet>,
    );
    expect(screen.getByText('New Team')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/ui/bottom-sheet.test.tsx`
Expected: FAIL.

**Step 3: Implement BottomSheet**

Built on top of Radix Dialog (same primitive as the existing Sheet component), styled as an iOS bottom sheet:

```typescript
import type { ReactNode } from 'react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils.ts';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ open, onOpenChange, title, children, className }: BottomSheetProps) {
  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <SheetPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50',
            'bg-card rounded-t-[10px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'data-[state=open]:duration-350 data-[state=closed]:duration-250',
            'max-h-[85vh] flex flex-col',
            'pb-[env(safe-area-inset-bottom)]',
            className,
          )}
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Grab indicator */}
          <div className="flex justify-center pt-2 pb-1">
            <div
              data-testid="grab-indicator"
              className="w-9 h-[5px] rounded-full bg-[#C7C7CC] dark:bg-[#48484A]"
            />
          </div>

          {/* Title */}
          {title && (
            <SheetPrimitive.Title className="text-ios-headline text-center px-4 pb-3">
              {title}
            </SheetPrimitive.Title>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {children}
          </div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/ui/bottom-sheet.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/ui/bottom-sheet.tsx src/components/ui/bottom-sheet.test.tsx
git commit -m "feat: create BottomSheet component with iOS sheet styling"
```

---

### Task 12: Create IOSAlert component (restyle ConfirmDialog)

**Files:**

- Create: `src/components/ui/ios-alert.tsx`

**Step 1: Implement IOSAlert**

This replaces `ConfirmDialog` for destructive confirmations with iOS-style centered alert:

```typescript
import { Dialog as AlertPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils.ts';

interface IOSAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function IOSAlert({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: IOSAlertProps) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[270px] bg-card rounded-[14px] overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-[1.05] data-[state=closed]:zoom-out-95',
            'duration-200',
          )}
        >
          {/* Content */}
          <div className="px-4 pt-5 pb-4 text-center">
            <AlertPrimitive.Title className="text-ios-headline">
              {title}
            </AlertPrimitive.Title>
            {message && (
              <AlertPrimitive.Description className="text-ios-footnote text-muted-foreground mt-1">
                {message}
              </AlertPrimitive.Description>
            )}
          </div>

          {/* Buttons — stacked vertically with hairline separators */}
          <div className="border-t border-border/50">
            {/* Destructive / Confirm action */}
            <button
              onClick={onConfirm}
              className={cn(
                'w-full h-11 text-ios-body border-b border-border/50',
                destructive
                  ? 'text-destructive font-normal'
                  : 'text-primary font-normal',
              )}
            >
              {confirmLabel}
            </button>
            {/* Cancel — bold weight per iOS convention */}
            <button
              onClick={onCancel}
              className="w-full h-11 text-ios-body font-semibold text-primary"
            >
              {cancelLabel}
            </button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
```

**Step 2: Run tests**

Run: `pnpm test:run`
Expected: All pass — this is a new component.

**Step 3: Commit**

```bash
git add src/components/ui/ios-alert.tsx
git commit -m "feat: create IOSAlert component matching iOS alert style"
```

---

### Task 13: Create GroupedList components

**Files:**

- Create: `src/components/ui/grouped-list.tsx`

**Step 1: Implement GroupedList and GroupedListRow**

These are purely presentational — thin wrappers applying iOS inset grouped list styling:

```typescript
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface GroupedListProps {
  header?: string;
  footer?: string;
  children: ReactNode;
  className?: string;
}

export function GroupedList({ header, footer, children, className }: GroupedListProps) {
  return (
    <section className={cn('', className)}>
      {header && (
        <h3 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
          {header}
        </h3>
      )}
      <div className="bg-card rounded-[10px] overflow-hidden">
        {children}
      </div>
      {footer && (
        <p className="text-ios-footnote text-muted-foreground px-4 pt-1.5">
          {footer}
        </p>
      )}
    </section>
  );
}

interface GroupedListRowProps {
  children: ReactNode;
  /** Show disclosure chevron on right */
  chevron?: boolean;
  /** Right-side accessory content (overrides chevron) */
  trailing?: ReactNode;
  /** Click handler — makes row interactive */
  onClick?: () => void;
  /** Whether this is the last row (no bottom separator) */
  last?: boolean;
  className?: string;
}

export function GroupedListRow({
  children,
  chevron = false,
  trailing,
  onClick,
  last = false,
  className,
}: GroupedListRowProps) {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex items-center justify-between w-full min-h-11 px-4 text-ios-body text-left',
        onClick && 'active:bg-[#D1D1D6] dark:active:bg-[#3A3A3C] transition-colors',
        !last && 'border-b border-border/50',
        className,
      )}
    >
      <div className="flex-1 min-w-0 py-2.5">{children}</div>
      {trailing ?? (chevron && (
        <ChevronRight className="size-5 text-[#C7C7CC] dark:text-[#48484A] shrink-0 ml-2" />
      ))}
    </Comp>
  );
}
```

**Step 2: Run tests**

Run: `pnpm test:run`
Expected: All pass.

**Step 3: Commit**

```bash
git add src/components/ui/grouped-list.tsx
git commit -m "feat: create GroupedList and GroupedListRow iOS-style components"
```

---

## Phase 5: Update Pages

### Task 14: Update Dashboard page

**Files:**

- Modify: `src/pages/Dashboard.tsx`

**Step 1: Refactor Dashboard**

Key changes:

- Add `<NavBar title="Teams" largeTitle trailing={<Button>} />`
- Remove hero logo section (app is identified by the nav bar title now)
- Replace Card-based team list with `<GroupedList>` + `<GroupedListRow>` rows
- Remove Data section (moved to Settings)
- Replace "Create Team" Dialog with BottomSheet
- Keep active game banner as a card (it's a special visual element)

This is a significant rewrite of the page. The core logic (state, handlers) stays the same — only the JSX template changes. Refer to the design doc Section 3 for team row specs (58px height, name + subtitle, chevron).

Replace the `<Dialog>` for creating teams with `<BottomSheet>`:

```tsx
<BottomSheet open={isCreating} onOpenChange={setIsCreating} title="New Team">
  {/* Same form fields */}
</BottomSheet>
```

Remove the Data section and its imports (`ExportDialog`, `ImportDialog`, `readJSONFile`, `Separator`).

Remove the hero logo images.

**Step 2: Update related imports**

Remove Dialog imports, add NavBar, BottomSheet, GroupedList imports.

**Step 3: Run tests**

Run: `pnpm test:run`
Expected: Existing tests should still pass. If Dashboard had snapshot tests, update them.

**Step 4: Verify visually**

Run: `pnpm dev`
Check: Teams listed in iOS grouped style, NavBar with large title, bottom sheet for new team.

**Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: redesign Dashboard with iOS grouped list and NavBar"
```

---

### Task 15: Update TeamManagement page

**Files:**

- Modify: `src/pages/TeamManagement.tsx`

**Step 1: Refactor TeamManagement**

Key changes:

- Add `<NavBar title={team.name} backTo="/" backLabel="Teams" trailing={...} />`
- Replace the current breadcrumb + heading with NavBar
- Convert roster list to `<GroupedList>` rows with chevron
- Convert config list to `<GroupedList>` rows
- Replace Dialog-based forms with BottomSheet
- Replace ConfirmDialog with IOSAlert for delete confirmations
- Use inline editing patterns (name, gender, birth year) within grouped list sections

**Step 2: Run tests**

Run: `pnpm test:run`
Expected: Pass.

**Step 3: Commit**

```bash
git add src/pages/TeamManagement.tsx
git commit -m "feat: redesign TeamManagement with iOS grouped lists and BottomSheet"
```

---

### Task 16: Update RosterEditor page

**Files:**

- Modify: `src/pages/RosterEditor.tsx`

**Step 1: Refactor RosterEditor**

Key changes:

- Add `<NavBar title={roster.name} backTo={teamUrl} backLabel={team.name} trailing={...} />`
- Convert player list to GroupedList rows (name, skill, positions)
- Replace add/edit player Dialog with BottomSheet
- Replace ConfirmDialog with IOSAlert for delete player
- Import dialog → BottomSheet

**Step 2: Run tests**

Run: `pnpm vitest run src/pages/RosterEditor.test.tsx`
Expected: Pass (may need test updates if test queries depend on dialog structure).

**Step 3: Commit**

```bash
git add src/pages/RosterEditor.tsx
git commit -m "feat: redesign RosterEditor with iOS grouped list and BottomSheet"
```

---

### Task 17: Update GameSetup page

**Files:**

- Modify: `src/pages/GameSetup.tsx`

**Step 1: Refactor GameSetup**

Key changes:

- Add `<NavBar title="New Game" backTo="/" backLabel="Teams" />`
- Convert sequential form sections to grouped list style
- Team/Roster/Config selectors as grouped list rows
- Attendance list as grouped list with checkboxes
- Goalie assignment as grouped list rows
- Primary CTA button: full-width, 50px, iOS primary style

**Step 2: Run tests**

Run: `pnpm test:run`
Expected: Pass.

**Step 3: Commit**

```bash
git add src/pages/GameSetup.tsx
git commit -m "feat: redesign GameSetup with iOS grouped lists"
```

---

### Task 18: Update GameHistory page

**Files:**

- Modify: `src/pages/GameHistory.tsx`

**Step 1: Refactor GameHistory**

Key changes:

- Add `<NavBar title="History" largeTitle />`
- Convert game list to GroupedList rows (game name, team, date, status badge, chevron)
- Replace ConfirmDialog with IOSAlert for delete
- Group games by status or date

**Step 2: Run tests**

Run: `pnpm test:run`
Expected: Pass.

**Step 3: Commit**

```bash
git add src/pages/GameHistory.tsx
git commit -m "feat: redesign GameHistory with iOS grouped list"
```

---

### Task 19: Update RotationGrid page

**Files:**

- Modify: `src/pages/RotationGrid.tsx`

**Step 1: Refactor RotationGrid**

This is the most complex page. Key changes:

- Add `<NavBar>` with appropriate back button and actions
- Replace ConfirmDialog with IOSAlert for end game / remove player
- Update button styles to iOS hierarchy
- Keep rotation table and grid visualization as-is (data-dense, not a list)
- Update the live bottom bar to use material blur background
- Stats cards keep card styling but updated to iOS specs

Be careful with this page — it has significant interaction logic. Focus on JSX template changes, not behavior.

**Step 2: Run tests**

Run: `pnpm vitest run src/pages/RotationGrid.test.tsx`
Expected: Pass. This test file likely has the most assertions. Fix any that break due to structural changes.

**Step 3: Commit**

```bash
git add src/pages/RotationGrid.tsx
git commit -m "feat: redesign RotationGrid with iOS NavBar and updated styling"
```

---

### Task 20: Update Practice page

**Files:**

- Modify: `src/pages/Practice.tsx`

**Step 1: Refactor Practice page**

Key changes:

- Add `<NavBar title="Practice" largeTitle />`
- Convert filter chips to capsule-style buttons
- Input fields updated to iOS styling (already done via Input component)
- Drill cards keep card styling but updated spacing
- Quick-select U-age chips → capsule buttons

**Step 2: Run tests**

Run: `pnpm vitest run src/pages/Practice.test.tsx`
Expected: Pass.

**Step 3: Commit**

```bash
git add src/pages/Practice.tsx
git commit -m "feat: redesign Practice page with iOS NavBar and capsule filters"
```

---

## Phase 6: Polish & Cleanup

### Task 21: Update remaining dialog usages to BottomSheet/IOSAlert

**Files:**

- Modify: `src/components/ExportDialog.tsx`
- Modify: `src/components/ImportDialog.tsx`
- Modify: `src/components/game/PlayerImportDialog.tsx`
- Modify: `src/components/game/SwapScopeDialog.tsx`

**Step 1: Convert ExportDialog to BottomSheet**

Replace the Dialog wrapper with BottomSheet. Keep internal content/logic.

**Step 2: Convert ImportDialog to BottomSheet**

Same approach. The internal "Replace All" confirmation should use IOSAlert.

**Step 3: Convert PlayerImportDialog to BottomSheet**

Two-step wizard stays the same, just wrapped in BottomSheet instead of Dialog.

**Step 4: Convert SwapScopeDialog to IOSAlert**

This is a simple choice dialog — convert to IOSAlert or keep as a small BottomSheet with two choice rows.

**Step 5: Run tests**

Run: `pnpm test:run`
Expected: All pass.

**Step 6: Commit**

```bash
git add src/components/ExportDialog.tsx src/components/ImportDialog.tsx src/components/game/PlayerImportDialog.tsx src/components/game/SwapScopeDialog.tsx
git commit -m "feat: convert remaining dialogs to BottomSheet/IOSAlert"
```

---

### Task 22: Remove old Dashboard data section and clean up unused code

**Files:**

- Modify: `src/pages/Dashboard.tsx` (if not already cleaned in Task 14)
- Potentially remove or keep: `src/components/ui/dialog.tsx` (still needed for BottomSheet/IOSAlert via Radix)
- Potentially remove: `src/components/ui/confirm-dialog.tsx` (replaced by IOSAlert)

**Step 1: Remove ConfirmDialog component**

Search all files for `ConfirmDialog` imports. Replace all with `IOSAlert`. Then delete `src/components/ui/confirm-dialog.tsx`.

**Step 2: Clean up unused imports across all modified files**

Run: `pnpm lint`
Fix any unused import warnings.

**Step 3: Run tests**

Run: `pnpm test:run`
Expected: All pass.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove ConfirmDialog, clean up unused imports"
```

---

### Task 23: Add useTheme setPreference and update Settings

**Files:**

- Modify: `src/hooks/useTheme.ts`
- Modify: `src/pages/Settings.tsx`

**Step 1: Add setPreference to useTheme**

```typescript
// In useTheme.ts, add to the return:
return { preference, resolved, cycle, setPreference };
```

**Step 2: Update Settings page**

Replace the cycle workaround with direct `setPreference(option.value)`.

**Step 3: Run tests**

Run: `pnpm vitest run src/hooks/useTheme.test.ts`
Expected: Pass (may need a new test case for setPreference).

**Step 4: Commit**

```bash
git add src/hooks/useTheme.ts src/pages/Settings.tsx
git commit -m "feat: expose setPreference in useTheme for Settings page"
```

---

### Task 24: Update LiveBottomBar with material blur

**Files:**

- Modify: `src/components/game/LiveBottomBar.tsx`

**Step 1: Apply material blur styling**

Add the translucent material classes to the bottom bar:

```
bg-[rgba(249,249,249,0.72)] dark:bg-[rgba(29,29,31,0.72)]
backdrop-blur-xl backdrop-saturate-[180%]
```

Also ensure it respects `pb-[env(safe-area-inset-bottom)]`.

**Step 2: Run tests**

Run: `pnpm vitest run src/components/game/LiveBottomBar.test.tsx`
Expected: Pass.

**Step 3: Commit**

```bash
git add src/components/game/LiveBottomBar.tsx
git commit -m "feat: apply material blur to LiveBottomBar"
```

---

### Task 25: Final test run and type check

**Step 1: Full test suite**

Run: `pnpm test:run`
Expected: All 23+ test files pass.

**Step 2: Type check**

Run: `pnpm build`
Expected: `tsc -b` passes, Vite builds successfully.

**Step 3: Lint**

Run: `pnpm lint`
Expected: No errors.

**Step 4: Visual QA**

Run: `pnpm dev`
Walk through every page in both light and dark mode:

- Dashboard → Team list, active game banner, create team sheet
- Team Management → Roster list, config list, edit flows
- Roster Editor → Player list, add/edit player sheet
- Game Setup → Sequential form
- Rotation Grid → Setup mode, live mode
- Game History → Game list
- Practice → Filters, drills
- Settings → Appearance, data, about

Check at three viewport widths:

- 375px (iPhone)
- 768px (iPad portrait)
- 1024px+ (iPad landscape with sidebar)

**Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "fix: final visual QA fixes for HIG redesign"
```

---

## Summary

| Phase         | Tasks | Focus                                                                                   |
| ------------- | ----- | --------------------------------------------------------------------------------------- |
| 1: Foundation | 1–3   | CSS tokens, typography, PWA base                                                        |
| 2: Components | 4–5   | Restyle Button, Card, Input, Switch, Badge                                              |
| 3: Layout     | 6–10  | TabBar, NavBar, Sidebar, AppShell rewrite, Settings                                     |
| 4: Primitives | 11–13 | BottomSheet, IOSAlert, GroupedList                                                      |
| 5: Pages      | 14–20 | Dashboard, TeamManagement, RosterEditor, GameSetup, GameHistory, RotationGrid, Practice |
| 6: Polish     | 21–25 | Dialog conversions, cleanup, LiveBottomBar, final QA                                    |

Total: 25 tasks, ~23 commits.

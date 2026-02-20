# Welcome Screen & Data Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a first-launch welcome screen and Dashboard import link so new/returning users can easily restore their data.

**Architecture:** A conditional rendering gate (`AppGate`) in `App.tsx` checks for empty state + welcomed flag. If both are true, renders a full-screen `<Welcome>` page instead of the router. The Dashboard empty state gains a secondary import link. No new routes, no AppContext changes — just a localStorage boolean and two UI surfaces.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui components, react-i18next, Vitest + Testing Library.

**Design doc:** `docs/plans/2026-02-20-welcome-and-migration-design.md`

---

### Task 1: Add i18n keys for welcome screen and Dashboard import link

**Files:**

- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/es-MX/common.json`

**Step 1: Add English translations**

Add a `"welcome"` section to `src/i18n/locales/en/common.json` after the `"dashboard"` section:

```json
"welcome": {
  "title": "Welcome to BenchBoss",
  "subtitle": "Fair playing time, made simple.",
  "get_started": "Get Started",
  "restore_backup": "Restore from Backup"
},
```

Add to the `"dashboard"` section:

```json
"have_backup": "Have a backup?",
"import_data": "Import your data"
```

**Step 2: Add Spanish translations**

Add to `src/i18n/locales/es-MX/common.json` — same structure:

```json
"welcome": {
  "title": "Bienvenido a BenchBoss",
  "subtitle": "Tiempo de juego justo, simplificado.",
  "get_started": "Comenzar",
  "restore_backup": "Restaurar respaldo"
},
```

Dashboard additions:

```json
"have_backup": "¿Tienes un respaldo?",
"import_data": "Importar tus datos"
```

**Step 3: Commit**

```bash
git add src/i18n/locales/en/common.json src/i18n/locales/es-MX/common.json
git commit -m "feat: add i18n keys for welcome screen and import link"
```

---

### Task 2: Create the Welcome page component

**Files:**

- Create: `src/pages/Welcome.tsx`

**Step 1: Create the Welcome component**

Create `src/pages/Welcome.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import { Button } from '@/components/ui/button.tsx';
import { ImportMethodDialog } from '@/components/ImportMethodDialog.tsx';
import { ImportDialog } from '@/components/ImportDialog.tsx';
import type { StorageData } from '@/storage/localStorage.ts';

const WELCOMED_KEY = 'benchassist_welcomed';

export function markWelcomed(): void {
  localStorage.setItem(WELCOMED_KEY, 'true');
}

export function hasBeenWelcomed(): boolean {
  return localStorage.getItem(WELCOMED_KEY) === 'true';
}

interface WelcomeProps {
  onComplete: () => void;
}

export function Welcome({ onComplete }: WelcomeProps) {
  const { t } = useTranslation();
  const dispatchWithUndo = useUndoToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<StorageData | null>(null);

  function handleGetStarted() {
    markWelcomed();
    onComplete();
  }

  function handleImportComplete() {
    markWelcomed();
    onComplete();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <img src="/pwa-192x192.png" alt="" className="size-20 rounded-[18px] mb-4" />
        <h1 className="text-[28px] leading-[34px] tracking-[0.36px] font-semibold mb-2">
          {t('welcome.title')}
        </h1>
        <p className="text-[17px] leading-[22px] tracking-[-0.41px] text-muted-foreground mb-10">
          {t('welcome.subtitle')}
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <Button size="lg" onClick={handleGetStarted}>
          {t('welcome.get_started')}
        </Button>
        <Button variant="plain" size="lg" onClick={() => setIsImporting(true)}>
          {t('welcome.restore_backup')}
        </Button>
      </div>

      <ImportMethodDialog
        open={isImporting}
        onOpenChange={setIsImporting}
        onDataLoaded={(data) => {
          setImportData(data);
          setIsImporting(false);
        }}
      />

      {importData && (
        <ImportDialog
          open={importData !== null}
          onOpenChange={(open) => {
            if (!open) setImportData(null);
          }}
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
            handleImportComplete();
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
            handleImportComplete();
          }}
        />
      )}
    </div>
  );
}
```

**Key HIG details:**

- `min-h-dvh` for full viewport height (dynamic viewport for mobile)
- Typography matches iOS large title (28pt semibold) and body (17pt regular)
- `pwa-192x192.png` icon with `rounded-[18px]` for iOS app icon corner radius
- `size-20` (80px) for the icon
- `max-w-sm` constrains content width on larger screens
- Both buttons are `size="lg"` (50px height = 44pt+ touch target)
- Filled primary + plain secondary follows HIG button hierarchy

**Step 2: Commit**

```bash
git add src/pages/Welcome.tsx
git commit -m "feat: add Welcome page component"
```

---

### Task 3: Add AppGate to App.tsx

**Files:**

- Modify: `src/App.tsx`

**Step 1: Refactor App.tsx to use AppGate**

The `AppGate` component wraps the existing Routes and conditionally shows the Welcome screen. It needs to be inside both `AppProvider` (for state access) and `BrowserRouter` (so routes still work after welcome).

Replace the current `App` default export with:

```tsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext.tsx';
import { AppShell } from '@/components/layout/AppShell.tsx';
import { Dashboard } from '@/pages/Dashboard.tsx';
import { TeamManagement } from '@/pages/TeamManagement.tsx';
import { RosterEditor } from '@/pages/RosterEditor.tsx';
import { GameSetup } from '@/pages/GameSetup.tsx';
import { RotationGrid } from '@/pages/RotationGrid.tsx';
import { GameHistory } from '@/pages/GameHistory.tsx';
import { Practice } from '@/pages/Practice.tsx';
import { Settings } from '@/pages/Settings.tsx';
import { Welcome, hasBeenWelcomed, markWelcomed } from '@/pages/Welcome.tsx';
import { Toaster } from '@/components/ui/sonner.tsx';
import { useAppContext } from '@/hooks/useAppContext.ts';

function AppGate() {
  const { state } = useAppContext();
  const [welcomed, setWelcomed] = useState(hasBeenWelcomed);

  const hasData = Object.keys(state.teams).length > 0;

  if (!hasData && !welcomed) {
    return <Welcome onComplete={() => setWelcomed(true)} />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="teams/:teamId" element={<TeamManagement />} />
        <Route path="teams/:teamId/rosters/:rosterId" element={<RosterEditor />} />
        <Route path="practice" element={<Practice />} />
        <Route path="games/new" element={<GameSetup />} />
        <Route path="games/:gameId/rotations" element={<RotationGrid />} />
        <Route path="games/:gameId/live" element={<Navigate to="../rotations" replace />} />
        <Route path="games" element={<GameHistory />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppGate />
      </BrowserRouter>
      <Toaster />
    </AppProvider>
  );
}
```

**Key decisions:**

- `hasBeenWelcomed` is passed as initializer function to `useState` (no `()` — lazy init avoids re-reading localStorage)
- `markWelcomed()` is called inside `Welcome.tsx` (side effect), `setWelcomed(true)` triggers the re-render in `AppGate`
- If user imports data, `hasData` becomes true so even without the flag, the gate passes through

**Step 2: Verify typecheck and build**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add AppGate to conditionally show welcome screen"
```

---

### Task 4: Add import link to Dashboard empty state

**Files:**

- Modify: `src/pages/Dashboard.tsx`

**Step 1: Add import section to empty state**

In `Dashboard.tsx`, add import state and the grouped list row. The changes needed:

1. Add imports at top:

```tsx
import { Download } from 'lucide-react';
import { ImportMethodDialog } from '@/components/ImportMethodDialog.tsx';
import { ImportDialog } from '@/components/ImportDialog.tsx';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import type { StorageData } from '@/storage/localStorage.ts';
```

2. Inside the `Dashboard` component, add state:

```tsx
const dispatchWithUndo = useUndoToast();
const [isImporting, setIsImporting] = useState(false);
const [importData, setImportData] = useState<StorageData | null>(null);
```

3. In the empty state JSX (inside `teams.length === 0`), after the existing `<Button>`, add:

```tsx
<GroupedList>
  <GroupedListRow chevron last onClick={() => setIsImporting(true)}>
    <div className="flex items-center gap-3">
      <Download className="size-5 text-primary" />
      <div>
        <div className="text-ios-body">{t('dashboard.have_backup')}</div>
        <div className="text-ios-caption1 text-muted-foreground">{t('dashboard.import_data')}</div>
      </div>
    </div>
  </GroupedListRow>
</GroupedList>
```

4. After the closing `</div>` of the main content area, before the BottomSheet, add the import dialogs:

```tsx
<ImportMethodDialog
  open={isImporting}
  onOpenChange={setIsImporting}
  onDataLoaded={(data) => {
    setImportData(data);
    setIsImporting(false);
  }}
/>;

{
  importData && (
    <ImportDialog
      open={importData !== null}
      onOpenChange={(open) => {
        if (!open) setImportData(null);
      }}
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
  );
}
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add import data link to Dashboard empty state"
```

---

### Task 5: Write tests for Welcome and AppGate

**Files:**

- Create: `src/pages/Welcome.test.tsx`

**Step 1: Write the tests**

Create `src/pages/Welcome.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppContext, type AppContextValue } from '@/context/AppContext.tsx';
import { Welcome, hasBeenWelcomed, markWelcomed } from '@/pages/Welcome.tsx';

const WELCOMED_KEY = 'benchassist_welcomed';

function renderWelcome(onComplete = vi.fn()) {
  const mockContext: AppContextValue = {
    state: { teams: {}, games: {}, favoriteDrillIds: [] },
    dispatch: vi.fn(),
    undo: () => null,
    canUndo: false,
  };

  return {
    onComplete,
    ...render(
      <MemoryRouter>
        <AppContext.Provider value={mockContext}>
          <Welcome onComplete={onComplete} />
        </AppContext.Provider>
      </MemoryRouter>,
    ),
  };
}

describe('Welcome', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders welcome title and buttons', () => {
    renderWelcome();
    expect(screen.getByText('Welcome to BenchBoss')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Restore from Backup')).toBeInTheDocument();
  });

  it('sets welcomed flag and calls onComplete when Get Started is clicked', async () => {
    const { onComplete } = renderWelcome();
    await userEvent.click(screen.getByText('Get Started'));
    expect(localStorage.getItem(WELCOMED_KEY)).toBe('true');
    expect(onComplete).toHaveBeenCalled();
  });

  it('opens import dialog when Restore from Backup is clicked', async () => {
    renderWelcome();
    await userEvent.click(screen.getByText('Restore from Backup'));
    expect(screen.getByText('Import')).toBeInTheDocument();
  });
});

describe('hasBeenWelcomed', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when no flag is set', () => {
    expect(hasBeenWelcomed()).toBe(false);
  });

  it('returns true after markWelcomed', () => {
    markWelcomed();
    expect(hasBeenWelcomed()).toBe(true);
  });
});
```

**Step 2: Run tests**

Run: `pnpm vitest run src/pages/Welcome.test.tsx`
Expected: All tests pass. If the import dialog test needs adjustment (the import dialog title may differ), check the i18n key `settings:data.import_title` for the exact text and adjust accordingly.

**Step 3: Commit**

```bash
git add src/pages/Welcome.test.tsx
git commit -m "test: add Welcome component and welcomed flag tests"
```

---

### Task 6: Manual QA and visual polish

**No code files — manual testing checklist.**

**Step 1: Test Welcome screen**

1. Clear localStorage: open DevTools → Application → Local Storage → clear `benchassist_data` and `benchassist_welcomed`
2. Reload the app
3. Verify: Welcome screen appears full-screen, centered, with icon + title + subtitle + 2 buttons
4. Verify: dark mode toggle (Settings → Appearance) is reflected in the welcome screen colors
5. Click "Get Started" → verify Dashboard appears with empty state
6. Reload → verify Welcome does NOT appear again

**Step 2: Test Restore from Backup**

1. Clear localStorage again
2. Reload → Welcome screen
3. Click "Restore from Backup"
4. Verify: Import method dialog opens (file or paste)
5. Import a valid backup file
6. Verify: data appears, Dashboard shows teams
7. Reload → verify Welcome does NOT appear

**Step 3: Test Dashboard import link**

1. Set `benchassist_welcomed` to `"true"` in localStorage, clear `benchassist_data`
2. Reload → Dashboard empty state should show
3. Verify: "Have a backup? Import your data" row appears below "Create First Team" button
4. Click it → verify Import dialog opens
5. Import data → verify Dashboard shows teams

**Step 4: Commit any fixes**

If any visual tweaks are needed, fix and commit.

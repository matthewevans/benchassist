import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext.tsx';
import { AppShell } from '@/components/layout/AppShell.tsx';
import { Welcome } from '@/pages/Welcome.tsx';
import { hasBeenWelcomed } from '@/storage/welcomed.ts';
import { Toaster } from '@/components/ui/sonner.tsx';
import { useAppContext } from '@/hooks/useAppContext.ts';

const Dashboard = lazy(() =>
  import('@/pages/Dashboard.tsx').then((module) => ({ default: module.Dashboard })),
);
const TeamManagement = lazy(() =>
  import('@/pages/TeamManagement.tsx').then((module) => ({ default: module.TeamManagement })),
);
const RosterEditor = lazy(() =>
  import('@/pages/RosterEditor.tsx').then((module) => ({ default: module.RosterEditor })),
);
const Practice = lazy(() =>
  import('@/pages/Practice.tsx').then((module) => ({ default: module.Practice })),
);
const GameSetup = lazy(() =>
  import('@/pages/GameSetup.tsx').then((module) => ({ default: module.GameSetup })),
);
const DirectEntry = lazy(() =>
  import('@/pages/DirectEntry.tsx').then((module) => ({ default: module.DirectEntry })),
);
const RotationGrid = lazy(() =>
  import('@/pages/RotationGrid.tsx').then((module) => ({ default: module.RotationGrid })),
);
const GameHistory = lazy(() =>
  import('@/pages/GameHistory.tsx').then((module) => ({ default: module.GameHistory })),
);
const Settings = lazy(() =>
  import('@/pages/Settings.tsx').then((module) => ({ default: module.Settings })),
);
const FAQ = lazy(() => import('@/pages/FAQ.tsx').then((module) => ({ default: module.FAQ })));

function AppGate() {
  const { state } = useAppContext();
  const [welcomed, setWelcomed] = useState(hasBeenWelcomed);

  const hasData = Object.keys(state.teams).length > 0;

  if (!hasData && !welcomed) {
    return <Welcome onComplete={() => setWelcomed(true)} />;
  }

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="teams/:teamId" element={<TeamManagement />} />
          <Route path="teams/:teamId/rosters/:rosterId" element={<RosterEditor />} />
          <Route path="practice" element={<Practice />} />
          <Route path="games/new" element={<GameSetup />} />
          <Route path="games/:gameId/direct-entry" element={<DirectEntry />} />
          <Route path="games/:gameId/rotations" element={<RotationGrid />} />
          <Route path="games/:gameId/live" element={<Navigate to="../rotations" replace />} />
          <Route path="games" element={<GameHistory />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<FAQ />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
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

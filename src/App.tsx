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
import { Toaster } from '@/components/ui/sonner.tsx';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename="/benchassist/">
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AppProvider>
  );
}

import { Outlet, useLocation } from 'react-router-dom';
import { TabBar } from '@/components/layout/TabBar.tsx';
import { Sidebar } from '@/components/layout/Sidebar.tsx';
import { LiveGameBar } from '@/components/layout/LiveGameBar.tsx';
import { useTheme } from '@/hooks/useTheme.ts';
import { useAppContext } from '@/hooks/useAppContext.ts';

export function AppShell() {
  // Initialize theme from localStorage on app load
  useTheme();

  const { state } = useAppContext();
  const location = useLocation();

  const hasLiveGame = Object.values(state.games).some((g) => g.status === 'in-progress');
  const isOnRotationPage = /\/games\/[^/]+\/rotations/.test(location.pathname);
  const showGameBar = hasLiveGame && !isOnRotationPage;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar: visible on lg+ (≥1024px) */}
      <Sidebar />

      {/* Main content area */}
      <main
        className={
          showGameBar
            ? 'flex-1 w-full pb-[calc(49px+56px+env(safe-area-inset-bottom))] lg:pb-12'
            : 'flex-1 w-full pb-[calc(49px+env(safe-area-inset-bottom))] lg:pb-0'
        }
      >
        <Outlet />
      </main>

      {/* Live game bar: above tab bar when a game is in progress */}
      <LiveGameBar />

      {/* Tab bar: visible below lg */}
      <TabBar />
    </div>
  );
}

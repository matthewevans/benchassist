import { Outlet, useLocation } from 'react-router-dom';
import { ArrowDown, Loader2 } from 'lucide-react';
import { TabBar } from '@/components/layout/TabBar.tsx';
import { Sidebar } from '@/components/layout/Sidebar.tsx';
import { LiveGameBar } from '@/components/layout/LiveGameBar.tsx';
import { useTheme } from '@/hooks/useTheme.ts';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { usePwaUpdate } from '@/hooks/usePwaUpdate.ts';
import { usePullToCheckUpdate } from '@/hooks/usePullToCheckUpdate.ts';
import { cn } from '@/lib/utils.ts';

export function AppShell() {
  // Initialize theme from localStorage on app load
  useTheme();

  const { state } = useAppContext();
  const { checkForUpdate, isUpdateAvailable } = usePwaUpdate();
  const location = useLocation();
  const { pullDistance, pullState } = usePullToCheckUpdate({
    onCheckForUpdate: checkForUpdate,
  });

  const hasLiveGame = Object.values(state.games).some((g) => g.status === 'in-progress');
  const isOnRotationPage = /\/games\/[^/]+\/rotations/.test(location.pathname);
  const showGameBar = hasLiveGame && !isOnRotationPage;
  const showPullIndicator = pullDistance > 0 || pullState === 'checking';

  const pullLabel =
    pullState === 'checking'
      ? 'Checking for updates...'
      : pullState === 'release'
        ? 'Release to check for updates'
        : 'Pull to check for updates';

  return (
    <div className="min-h-screen bg-background flex">
      <div
        aria-hidden
        className={cn(
          'fixed left-1/2 top-[calc(env(safe-area-inset-top)+6px)] z-50',
          'transition-all duration-200 pointer-events-none',
          showPullIndicator ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transform: `translate(-50%, ${Math.max(0, pullDistance - 44)}px)` }}
      >
        <div className="relative min-h-11 min-w-[230px] px-3 rounded-full bg-card/95 border border-border/50 backdrop-blur-xl backdrop-saturate-[180%] shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none flex items-center justify-center">
          <span className="absolute left-3 top-1/2 -translate-y-1/2">
            {pullState === 'checking' ? (
              <Loader2 className="size-4 text-primary animate-spin" />
            ) : (
              <ArrowDown className="size-4 text-muted-foreground" />
            )}
          </span>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0">
            {pullState === 'checking' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowDown className="size-4" />
            )}
          </span>
          <div className="absolute inset-0 flex items-center justify-center px-10">
            <span className="text-ios-footnote text-muted-foreground whitespace-nowrap text-center">
              {isUpdateAvailable && pullState === 'checking' ? 'Update found' : pullLabel}
            </span>
          </div>
        </div>
      </div>

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

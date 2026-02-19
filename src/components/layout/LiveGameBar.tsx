import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { useAppContext } from '@/hooks/useAppContext.ts';

const SESSION_KEY = 'livegamebar_minimized';

function getInitialMinimized(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function LiveGameBar() {
  const { state } = useAppContext();
  const location = useLocation();
  const [minimized, setMinimized] = useState(getInitialMinimized);

  const activeGame = Object.values(state.games).find((g) => g.status === 'in-progress');
  const activeTeam = activeGame ? state.teams[activeGame.teamId] : undefined;

  // Hide on the rotation page (has its own LiveBottomBar)
  const isOnRotationPage = /\/games\/[^/]+\/rotations/.test(location.pathname);

  if (!activeGame || isOnRotationPage) return null;

  function toggleMinimized() {
    setMinimized((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(SESSION_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }

  const gameUrl = `/games/${activeGame.id}/rotations`;

  if (minimized) {
    return (
      <div
        className={cn(
          'fixed left-0 right-0 z-40 lg:left-[280px]',
          'bottom-[calc(49px+env(safe-area-inset-bottom))] lg:bottom-0',
          'bg-[rgba(249,249,249,0.72)] dark:bg-[rgba(29,29,31,0.72)]',
          'backdrop-blur-xl backdrop-saturate-[180%]',
          'border-t border-border/50',
        )}
      >
        <div className="flex items-center h-6 px-3 max-w-5xl mx-auto">
          <Link to={gameUrl} className="flex items-center gap-2 flex-1 min-w-0">
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {activeGame.name}
              {activeTeam && <> &middot; {activeTeam.name}</>} &middot; R
              {activeGame.currentRotationIndex + 1}
            </span>
          </Link>
          <button
            onClick={toggleMinimized}
            className="p-1 -mr-1 text-muted-foreground"
            aria-label="Expand live game bar"
          >
            <ChevronUp className="size-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-40 lg:left-[280px]',
        'bottom-[calc(49px+env(safe-area-inset-bottom))] lg:bottom-0',
        'bg-[rgba(249,249,249,0.72)] dark:bg-[rgba(29,29,31,0.72)]',
        'backdrop-blur-xl backdrop-saturate-[180%]',
        'border-t border-border/50',
        'lg:pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="flex items-center h-11 px-3 sm:px-4 max-w-5xl mx-auto">
        <Link to={gameUrl} className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="size-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-medium truncate block">{activeGame.name}</span>
            <span className="text-xs text-muted-foreground">
              {activeTeam?.name} &middot; R{activeGame.currentRotationIndex + 1}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <Link to={gameUrl} className="text-xs font-semibold text-primary">
            Resume
          </Link>
          <button
            onClick={toggleMinimized}
            className="p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Minimize live game bar"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Height in pixels of the LiveGameBar in its expanded and minimized states. */
export const LIVE_GAME_BAR_HEIGHT_EXPANDED = 44;
export const LIVE_GAME_BAR_HEIGHT_MINIMIZED = 24;

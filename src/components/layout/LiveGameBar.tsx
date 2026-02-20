import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { useAppContext } from '@/hooks/useAppContext.ts';

export function LiveGameBar() {
  const { state } = useAppContext();
  const { t } = useTranslation('game');
  const location = useLocation();

  const activeGame = Object.values(state.games).find((g) => g.status === 'in-progress');
  const activeTeam = activeGame ? state.teams[activeGame.teamId] : undefined;

  // Hide on the rotation page (has its own LiveBottomBar)
  const isOnRotationPage = /\/games\/[^/]+\/rotations/.test(location.pathname);

  if (!activeGame || isOnRotationPage) return null;

  const gameUrl = `/games/${activeGame.id}/rotations`;

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
      <div className="flex items-center py-2.5 px-3 sm:px-4 max-w-5xl mx-auto gap-2">
        <Link
          to={gameUrl}
          className={cn(
            'flex items-center gap-2.5 flex-1 min-w-0 h-full',
            'rounded-lg -ml-1 pl-1',
            'active:bg-[#D1D1D6] dark:active:bg-[#3A3A3C]',
            'transition-colors',
          )}
        >
          <span className="size-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <span className="text-ios-subheadline font-semibold truncate block leading-tight">
              {activeGame.name}
            </span>
            <span className="text-ios-caption1 text-muted-foreground leading-tight">
              {activeTeam?.name} &middot; R{activeGame.currentRotationIndex + 1}
            </span>
          </div>
        </Link>
        <Button asChild variant="secondary" size="capsule" className="shrink-0 font-semibold">
          <Link to={gameUrl}>{t('live.resume')}</Link>
        </Button>
      </div>
    </div>
  );
}

/** Approximate height in pixels of the LiveGameBar (py-2.5 + two lines of text). */
export const LIVE_GAME_BAR_HEIGHT = 56;

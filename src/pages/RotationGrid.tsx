import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { EllipsisIcon } from 'lucide-react';
import { useRotationGame } from '@/hooks/useRotationGame.ts';
import { usePeriodTimer } from '@/hooks/usePeriodTimer.ts';
import { usePeriodCollapse } from '@/hooks/usePeriodCollapse.ts';
import { LiveBottomBar } from '@/components/game/LiveBottomBar.tsx';
import { LiveFocusView } from '@/components/game/LiveFocusView.tsx';
import { SolverStatusCard } from '@/components/game/SolverStatusCard.tsx';
import { GameSettingsSheet } from '@/components/game/GameSettingsSheet.tsx';
import { OverallStatsCards } from '@/components/game/OverallStatsCards.tsx';
import { RotationTable } from '@/components/game/RotationTable.tsx';
import { PeriodDivisionSheet } from '@/components/game/PeriodDivisionSheet.tsx';
import { IOSAlert } from '@/components/ui/ios-alert.tsx';
import { SwapScopeDialog } from '@/components/game/SwapScopeDialog.tsx';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { redivideSchedulePeriod } from '@/utils/rotationDivision.ts';
import { getPeriodRange } from '@/utils/rotationLayout.ts';

function RotationPips({
  periodGroups,
  currentRotationIndex,
}: {
  periodGroups: { periodIndex: number; rotations: { index: number }[] }[];
  currentRotationIndex: number;
}) {
  const { t } = useTranslation('game');
  const totalRotations = periodGroups.reduce((sum, g) => sum + g.rotations.length, 0);
  const currentPeriodIndex =
    periodGroups.find((g) => g.rotations.some((r) => r.index === currentRotationIndex))
      ?.periodIndex ?? 0;

  return (
    <div
      className="flex items-center gap-1.5"
      role="status"
      aria-label={t('live.rotation_progress', {
        current: currentRotationIndex + 1,
        total: totalRotations,
        period: currentPeriodIndex + 1,
      })}
      title={t('live.rotation_progress_title', {
        current: currentRotationIndex + 1,
        total: totalRotations,
        period: currentPeriodIndex + 1,
      })}
    >
      {periodGroups.map((group) => (
        <div key={group.periodIndex} className="flex items-center gap-0.5">
          {group.rotations.map((r) => {
            const isPast = r.index < currentRotationIndex;
            const isCurrent = r.index === currentRotationIndex;
            return (
              <div
                key={r.index}
                className={cn(
                  'h-2 w-3 rounded-sm transition-colors',
                  isCurrent && 'bg-primary',
                  isPast && 'bg-primary/40',
                  !isPast && !isCurrent && 'bg-muted-foreground/25',
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function RotationGrid() {
  const { gameId } = useParams<{ gameId: string }>();
  const { t } = useTranslation('game');
  const { t: tCommon } = useTranslation('common');
  const g = useRotationGame(gameId);
  const [periodActionPeriodIndex, setPeriodActionPeriodIndex] = useState<number | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const timer = usePeriodTimer(
    g.isLive ? g.game : undefined,
    g.config,
    g.currentRotation,
    g.dispatch,
  );

  const { collapsedPeriods, togglePeriod } = usePeriodCollapse({
    currentPeriodIndex: g.currentPeriodIndex,
    isLive: g.isLive,
    totalPeriods: g.config?.periods ?? 2,
  });

  // Auto-scroll to current rotation column in live mode
  useEffect(() => {
    if (!g.isLive || !gridRef.current) return;
    const table = gridRef.current;
    const currentCol = table.querySelector('[data-current-rotation]');
    if (currentCol) {
      const tableRect = table.getBoundingClientRect();
      const colRect = currentCol.getBoundingClientRect();
      const targetScroll = colRect.left - tableRect.left + table.scrollLeft - tableRect.width / 3;
      table.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [g.isLive, g.currentRotationIndex]);

  if (!g.game || !g.roster || !g.config) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">{t('error.not_found')}</p>
        <Link to="/" className="text-primary underline mt-2 inline-block">
          {t('error.back_to_teams')}
        </Link>
      </div>
    );
  }

  function canEditPeriodDivision(periodIndex: number): boolean {
    if (g.isCompleted || !g.schedule) return false;
    if (!g.isLive) return true;
    const range = getPeriodRange(g.periodDivisions, periodIndex);
    if (!range) return false;
    return range.start >= g.currentRotationIndex;
  }

  function isDivisionEnabled(division: number): boolean {
    if (periodActionPeriodIndex == null || !g.schedule) return false;
    const currentDivision = g.periodDivisions[periodActionPeriodIndex];
    if (currentDivision === division) return true;
    if (!canEditPeriodDivision(periodActionPeriodIndex)) return false;

    return redivideSchedulePeriod({
      schedule: g.schedule,
      players: g.activePlayers,
      periodDivisions: g.periodDivisions,
      periodIndex: periodActionPeriodIndex,
      nextDivision: division,
    }).ok;
  }

  return (
    <div>
      {/* NavBar — adapts to game state */}
      {g.isCompleted ? (
        <NavBar title={g.game.name} backTo="/games" backLabel={tCommon('nav.games')} />
      ) : g.isLive ? (
        <NavBar
          compact
          backTo="/games"
          trailing={
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="plain" size="icon-sm" aria-label={t('live.game_actions_aria')}>
                  <EllipsisIcon className="size-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-1.5">
                <button
                  className="flex items-center w-full h-11 px-3 text-ios-body rounded-lg active:bg-accent/80 transition-colors"
                  onClick={g.handleRegenerate}
                  disabled={g.solver.isRunning}
                >
                  {g.solver.isRunning
                    ? t('live.solving')
                    : g.schedule
                      ? t('live.regenerate')
                      : t('setup.generate_rotations')}
                </button>
                <button
                  className="flex items-center w-full h-11 px-3 text-ios-body text-destructive rounded-lg active:bg-accent/80 transition-colors"
                  onClick={() => g.setConfirmEndGame(true)}
                >
                  {t('live.end_game')}
                </button>
              </PopoverContent>
            </Popover>
          }
        />
      ) : (
        <NavBar
          title={g.game.name}
          backTo="/games"
          backLabel={tCommon('nav.games')}
          trailing={
            <div className="flex items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="plain" size="icon-sm" aria-label={t('live.game_actions_aria')}>
                    <EllipsisIcon className="size-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-52 p-1.5">
                  <button
                    className="flex items-center w-full h-11 px-3 text-ios-body rounded-lg active:bg-accent/80 transition-colors"
                    onClick={() => {
                      g.setSettingsOpen(true);
                    }}
                  >
                    {t('live.settings')}
                  </button>
                  <button
                    className="flex items-center w-full h-11 px-3 text-ios-body rounded-lg active:bg-accent/80 transition-colors"
                    onClick={g.handleRegenerate}
                    disabled={g.solver.isRunning}
                  >
                    {g.solver.isRunning
                      ? t('live.solving')
                      : g.schedule
                        ? t('live.regenerate')
                        : t('setup.generate_rotations')}
                  </button>
                </PopoverContent>
              </Popover>
              <Button size="sm" className="h-10" onClick={g.handleStartGame}>
                {t('live.start_game')}
              </Button>
            </div>
          }
        />
      )}

      <div className="space-y-6 pt-4">
        {/* Completed indicator */}
        {g.isCompleted && (
          <p className="max-w-4xl mx-auto text-ios-footnote text-muted-foreground px-4">
            {t('live.completed')}
          </p>
        )}

        {/* Solver progress/error — visible in all modes */}
        <div className="max-w-4xl mx-auto px-4">
          <SolverStatusCard
            isRunning={g.solver.isRunning}
            progress={g.solver.progress}
            message={g.solver.message}
            error={g.solver.error}
          />
        </div>

        {/* Overall stats — setup mode only */}
        {!g.isLive && !g.isCompleted && g.schedule && (
          <div className="max-w-4xl mx-auto px-4">
            <OverallStatsCards stats={g.schedule.overallStats} />
          </div>
        )}

        {/* Swap hint/instruction — stable slot in setup mode to avoid layout shift */}
        {!g.isLive && !g.isCompleted && g.schedule && (
          <div className="max-w-4xl mx-auto px-4">
            <p className="min-h-[56px] flex items-center text-ios-footnote text-muted-foreground bg-card rounded-[10px] py-3 px-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
              {g.swapSource
                ? t('live.swap_hint_selected', {
                    name: g.playerMap.get(g.swapSource.playerId)?.name,
                    rotation: g.swapSource.rotationIndex + 1,
                  })
                : t('live.swap_hint_default')}
            </p>
          </div>
        )}

        {/* Draft game with no schedule yet */}
        {!g.schedule && (
          <div className="max-w-4xl mx-auto px-4">
            <div className="space-y-3 rounded-[10px] bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
              <p className="text-ios-footnote text-muted-foreground">{t('error.no_schedule')}</p>
              <Button size="sm" onClick={g.handleRegenerate} disabled={g.solver.isRunning}>
                {g.solver.isRunning ? t('setup.generating') : t('setup.generate_rotations')}
              </Button>
            </div>
          </div>
        )}

        {/* Live toolbar: pips + view toggle — inline in content area */}
        {g.isLive && g.schedule && (
          <div className="flex items-center justify-between px-4 max-w-4xl mx-auto">
            <RotationPips
              periodGroups={g.periodGroups}
              currentRotationIndex={g.currentRotationIndex}
            />
            <div
              className="inline-flex rounded-lg bg-secondary/80 p-0.5"
              role="tablist"
              aria-label={t('live.view_mode_aria')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={g.viewMode === 'focus'}
                className={cn(
                  'min-h-8 min-w-8 px-2.5 text-ios-caption1 font-medium rounded-md transition-colors',
                  g.viewMode === 'focus'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground',
                )}
                onClick={() => g.setViewMode('focus')}
              >
                {t('live.focus_view')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={g.viewMode === 'grid'}
                className={cn(
                  'min-h-8 min-w-8 px-2.5 text-ios-caption1 font-medium rounded-md transition-colors',
                  g.viewMode === 'grid'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground',
                )}
                onClick={() => g.setViewMode('grid')}
              >
                {t('live.grid_view')}
              </button>
            </div>
          </div>
        )}

        {/* Live focus view — default in live mode */}
        {g.isLive && g.schedule && g.viewMode === 'focus' && g.currentRotation && (
          <div className="max-w-4xl mx-auto">
            <LiveFocusView
              currentRotation={g.currentRotation}
              nextRotation={g.nextRotation}
              playerMap={g.playerMap}
              changingPlayerIds={g.changingPlayerIds}
              usePositions={g.config?.usePositions ?? false}
            />
          </div>
        )}

        {/* Rotation grid table — full width for horizontal scrolling */}
        {g.schedule && (!g.isLive || g.viewMode === 'grid') && g.config && (
          <RotationTable
            ref={gridRef}
            periodGroups={g.periodGroups}
            allDisplayPlayers={g.allDisplayPlayers}
            playerStats={g.schedule.playerStats}
            config={g.config}
            gameRemovedPlayerIds={g.game.removedPlayerIds}
            isLive={g.isLive}
            isCompleted={g.isCompleted}
            currentRotationIndex={g.currentRotationIndex}
            changingPlayerIds={g.changingPlayerIds}
            subTooltipMap={g.subTooltipMap}
            collapsedPeriods={collapsedPeriods}
            togglePeriod={togglePeriod}
            canEditPeriodDivision={canEditPeriodDivision}
            onPeriodActionsClick={(periodIndex) => setPeriodActionPeriodIndex(periodIndex)}
            swapSource={g.swapSource}
            onCellClick={g.handleCellClick}
            onRemovePlayer={(pid) => g.setRemovingPlayerId(pid)}
            onAddPlayerBack={g.handleAddPlayerBack}
          />
        )}

        {/* Live bottom bar */}
        {g.isLive && g.schedule && <div className="h-20" />}
        {g.isLive && g.schedule && (
          <LiveBottomBar
            timer={timer}
            onAdvance={g.handleAdvance}
            onRetreat={g.handleRetreat}
            isFirstRotation={g.currentRotationIndex === 0}
            isLastRotation={g.isLastRotation}
            isCrossingPeriod={g.isCrossingPeriod}
            swapPlayerName={
              g.swapSource ? (g.playerMap.get(g.swapSource.playerId)?.name ?? null) : null
            }
            onCancelSwap={() => g.setSwapSource(null)}
          />
        )}

        {/* Swap scope dialog */}
        <SwapScopeDialog
          open={g.pendingSwap !== null}
          playerA={
            g.pendingSwap ? (g.playerMap.get(g.pendingSwap.playerAId)?.name ?? 'Player') : ''
          }
          playerB={
            g.pendingSwap ? (g.playerMap.get(g.pendingSwap.playerBId)?.name ?? 'Player') : ''
          }
          onThisRotation={g.handleSwapThisRotation}
          onAllRemaining={g.handleSwapAllRemaining}
          onCancel={() => g.setPendingSwap(null)}
        />

        <PeriodDivisionSheet
          open={periodActionPeriodIndex != null}
          periodIndex={periodActionPeriodIndex}
          currentDivision={
            periodActionPeriodIndex != null
              ? (g.periodDivisions[periodActionPeriodIndex] ?? null)
              : null
          }
          isDivisionEnabled={isDivisionEnabled}
          onOpenChange={(open) => {
            if (!open) setPeriodActionPeriodIndex(null);
          }}
          onSelectDivision={(division) => {
            if (periodActionPeriodIndex == null) return;
            g.handleSetPeriodDivision(periodActionPeriodIndex, division);
            setPeriodActionPeriodIndex(null);
          }}
        />

        {/* End game confirmation */}
        <IOSAlert
          open={g.confirmEndGame}
          onOpenChange={(open) => {
            if (!open) g.setConfirmEndGame(false);
          }}
          title={t('live.end_game_confirm_title')}
          message={t('live.end_game_confirm_message')}
          confirmLabel={t('live.end_game_confirm')}
          cancelLabel={tCommon('actions.cancel')}
          onConfirm={() => {
            g.setConfirmEndGame(false);
            g.handleEndGame();
          }}
          onCancel={() => g.setConfirmEndGame(false)}
          destructive
        />

        {/* Player removal confirmation */}
        <IOSAlert
          open={g.removingPlayerId !== null}
          onOpenChange={(open) => {
            if (!open) g.setRemovingPlayerId(null);
          }}
          title={t('player.remove_confirm_title', { name: g.removingPlayer?.name ?? '' })}
          message={t('player.remove_confirm_message')}
          confirmLabel={t('player.remove_confirm')}
          cancelLabel={tCommon('actions.cancel')}
          onConfirm={g.handleConfirmRemovePlayer}
          onCancel={() => g.setRemovingPlayerId(null)}
          destructive
        />

        {/* Settings Sheet — only in setup mode */}
        <GameSettingsSheet
          open={g.settingsOpen}
          onOpenChange={g.setSettingsOpen}
          players={g.roster.players}
          initialAbsentIds={g.game.absentPlayerIds}
          initialGoalieAssignments={g.game.goalieAssignments}
          periods={g.config?.periods ?? 2}
          useGoalie={g.config?.useGoalie ?? false}
          onRegenerate={g.handleRegenerateWithSettings}
        />
      </div>
    </div>
  );
}

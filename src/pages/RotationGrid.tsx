import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { Settings2, RotateCcwIcon } from 'lucide-react';
import { useRotationGame } from '@/hooks/useRotationGame.ts';
import { usePeriodTimer } from '@/hooks/usePeriodTimer.ts';
import { usePeriodCollapse } from '@/hooks/usePeriodCollapse.ts';
import { LiveBottomBar } from '@/components/game/LiveBottomBar.tsx';
import { LiveFocusView } from '@/components/game/LiveFocusView.tsx';
import { SolverStatusCard } from '@/components/game/SolverStatusCard.tsx';
import { GameSettingsSheet } from '@/components/game/GameSettingsSheet.tsx';
import { OverallStatsCards } from '@/components/game/OverallStatsCards.tsx';
import { PlayerStatsCard } from '@/components/game/PlayerStatsCard.tsx';
import { RotationTable } from '@/components/game/RotationTable.tsx';
import { IOSAlert } from '@/components/ui/ios-alert.tsx';
import { SwapScopeDialog } from '@/components/game/SwapScopeDialog.tsx';
import { NavBar } from '@/components/layout/NavBar.tsx';

function RotationPips({
  periodGroups,
  currentRotationIndex,
}: {
  periodGroups: { periodIndex: number; rotations: { index: number }[] }[];
  currentRotationIndex: number;
}) {
  const totalRotations = periodGroups.reduce((sum, g) => sum + g.rotations.length, 0);
  const currentPeriodIndex =
    periodGroups.find((g) => g.rotations.some((r) => r.index === currentRotationIndex))
      ?.periodIndex ?? 0;

  return (
    <div
      className="flex items-center gap-1.5"
      role="status"
      aria-label={`Rotation ${currentRotationIndex + 1} of ${totalRotations}, Period ${currentPeriodIndex + 1}`}
      title={`Rotation ${currentRotationIndex + 1} of ${totalRotations} — Period ${currentPeriodIndex + 1}`}
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
                  !isPast && !isCurrent && 'bg-muted',
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
  const g = useRotationGame(gameId);

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

  if (!g.game || !g.schedule || !g.roster) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Game or schedule not found</p>
        <Link to="/" className="text-primary underline mt-2 inline-block">
          Back to teams
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* NavBar — adapts to game state */}
      {g.isCompleted ? (
        <NavBar title={g.game.name} backTo="/" backLabel="Teams" />
      ) : g.isLive ? (
        <NavBar
          title=""
          trailing={
            <div className="flex items-center gap-2">
              <RotationPips
                periodGroups={g.periodGroups}
                currentRotationIndex={g.currentRotationIndex}
              />
              <Button
                variant="plain"
                size="sm"
                onClick={() => g.setViewMode((v) => (v === 'focus' ? 'grid' : 'focus'))}
              >
                {g.viewMode === 'focus' ? 'Grid' : 'Focus'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={g.handleRegenerate}
                disabled={g.solver.isRunning}
              >
                {g.solver.isRunning ? 'Solving...' : 'Regenerate'}
              </Button>
              <Button
                variant="destructive-plain"
                size="sm"
                onClick={() => g.setConfirmEndGame(true)}
              >
                End Game
              </Button>
            </div>
          }
        />
      ) : (
        <NavBar
          title={g.game.name}
          backTo={`/teams/${g.game.teamId}`}
          backLabel={g.team?.name ?? 'Team'}
          trailing={
            <div className="flex items-center gap-2">
              <Button
                variant="plain"
                size="icon"
                onClick={() => g.setSettingsOpen(true)}
                title="Edit game settings"
              >
                <Settings2 className="size-5" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={g.handleRegenerate}
                disabled={g.solver.isRunning}
              >
                {g.solver.isRunning ? 'Solving...' : 'Regenerate'}
              </Button>
              <Button size="sm" onClick={g.handleStartGame}>
                Start Game
              </Button>
            </div>
          }
        />
      )}

      <div className="space-y-6 pt-4">
        {/* Completed indicator */}
        {g.isCompleted && (
          <p className="max-w-4xl mx-auto text-sm text-muted-foreground px-4">Completed</p>
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
        {!g.isLive && !g.isCompleted && (
          <div className="max-w-4xl mx-auto px-4">
            <OverallStatsCards stats={g.schedule.overallStats} />
          </div>
        )}

        {/* Swap hint — setup mode only, hidden once a swap starts */}
        {!g.isLive && !g.isCompleted && !g.swapSource && (
          <p className="max-w-4xl mx-auto px-4 text-sm text-muted-foreground bg-muted/50 rounded-md py-2">
            Tap any player cell to swap their position with another player in the same rotation.
          </p>
        )}

        {/* Landscape hint — portrait only, many rotations */}
        {g.manyRotations && !g.isCompleted && (
          <p className="hidden portrait:flex text-xs text-muted-foreground text-center items-center justify-center gap-1.5 px-4">
            <RotateCcwIcon className="size-3" />
            Rotate your phone for a wider view
          </p>
        )}

        {/* Live focus view — default in live mode */}
        {g.isLive && g.viewMode === 'focus' && g.currentRotation && (
          <div className="max-w-4xl mx-auto px-4">
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
        {(!g.isLive || g.viewMode === 'grid') && g.config && (
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
            swapSource={g.swapSource}
            onCellClick={g.handleCellClick}
            onRemovePlayer={(pid) => g.setRemovingPlayerId(pid)}
            onAddPlayerBack={g.handleAddPlayerBack}
          />
        )}

        {/* Swap instruction — only in non-live mode */}
        {!g.isLive && !g.isCompleted && g.swapSource && (
          <p className="max-w-4xl mx-auto px-4 text-sm text-muted-foreground mt-2">
            Selected {g.playerMap.get(g.swapSource.playerId)?.name} in R
            {g.swapSource.rotationIndex + 1}. Click another player in the same rotation to swap, or
            click again to deselect.
          </p>
        )}

        {/* Player statistics — setup mode only */}
        {!g.isLive && !g.isCompleted && (
          <div className="max-w-4xl mx-auto px-4">
            <PlayerStatsCard
              players={g.sortedPlayers}
              playerStats={g.schedule.playerStats}
              minPlayPercentage={g.config?.minPlayPercentage ?? 50}
            />
          </div>
        )}

        {/* Live bottom bar */}
        {g.isLive && <div className="h-20" />}
        {g.isLive && (
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

        {/* End game confirmation */}
        <IOSAlert
          open={g.confirmEndGame}
          onOpenChange={(open) => {
            if (!open) g.setConfirmEndGame(false);
          }}
          title="End this game?"
          message="The game will be marked as completed. You won't be able to resume live tracking."
          confirmLabel="End Game"
          cancelLabel="Cancel"
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
          title={`Remove ${g.removingPlayer?.name ?? 'player'}?`}
          message="They will be removed from remaining rotations. The schedule will be recalculated."
          confirmLabel="Remove"
          cancelLabel="Cancel"
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { cn } from '@/lib/utils.ts';
import { CircleHelpIcon, EllipsisIcon, LayoutGridIcon, PenLineIcon } from 'lucide-react';
import { cloneGame } from '@/utils/gameClone.ts';
import { useRotationGame } from '@/hooks/useRotationGame.ts';
import { useFieldDrawing } from '@/hooks/useFieldDrawing.ts';
import { usePeriodTimer } from '@/hooks/usePeriodTimer.ts';
import { usePeriodCollapse } from '@/hooks/usePeriodCollapse.ts';
import { DrawingToolbar } from '@/components/game/DrawingToolbar.tsx';
import { FieldView } from '@/components/game/FieldView.tsx';
import { LiveBottomBar } from '@/components/game/LiveBottomBar.tsx';
import { LiveFocusView } from '@/components/game/LiveFocusView.tsx';
import { PeriodRotationIndicator } from '@/components/game/PeriodRotationIndicator.tsx';
import { SolverStatusCard } from '@/components/game/SolverStatusCard.tsx';
import { GameSettingsSheet } from '@/components/game/GameSettingsSheet.tsx';
import { LiveRegenerateLockPolicySheet } from '@/components/game/LiveRegenerateLockPolicySheet.tsx';
import { RotationTable } from '@/components/game/RotationTable.tsx';
import { PeriodDivisionSheet } from '@/components/game/PeriodDivisionSheet.tsx';
import { RegeneratePreviewSheet } from '@/components/game/RegeneratePreviewSheet.tsx';
import { PlaytimeOptimizeBanner } from '@/components/game/PlaytimeOptimizeBanner.tsx';
import { OptimizeDivisionsSheet } from '@/components/game/OptimizeDivisionsSheet.tsx';
import { IOSAlert } from '@/components/ui/ios-alert.tsx';
import { SwapScopeDialog } from '@/components/game/SwapScopeDialog.tsx';
import { NavBar } from '@/components/layout/NavBar.tsx';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover.tsx';
import type { PlayerId } from '@/types/domain.ts';
import { redivideSchedulePeriod } from '@/utils/rotationDivision.ts';
import { getPeriodRange } from '@/utils/rotationLayout.ts';
import { getHighPlayPercentageOutlierIds } from '@/utils/playPercentageOutliers.ts';
import { formatStrengthValue, getBalanceTier } from '@/utils/stats.ts';

export function RotationGrid() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('game');
  const { t: tCommon } = useTranslation('common');
  const g = useRotationGame(gameId);
  const [drawMode, setDrawMode] = useState(false);
  const drawing = useFieldDrawing();
  const [drawToolForRender, setDrawToolForRender] = useState<'pen' | 'arrow'>('pen');
  const [periodActionPeriodIndex, setPeriodActionPeriodIndex] = useState<number | null>(null);
  const [renamingOpen, setRenamingOpen] = useState(false);
  const [editName, setEditName] = useState('');

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

  const highPlayOutlierIds = useMemo(
    () =>
      g.schedule
        ? getHighPlayPercentageOutlierIds(
            g.allDisplayPlayers
              .filter(
                (player) =>
                  !g.game!.removedPlayerIds.includes(player.id) &&
                  !g.game!.absentPlayerIds.includes(player.id),
              )
              .map((player) => ({
                playerId: player.id,
                playPercentage: g.schedule!.playerStats[player.id]?.playPercentage ?? 0,
              })),
          )
        : new Set<PlayerId>(),
    [g.allDisplayPlayers, g.game, g.schedule],
  );

  const previewHighPlayOutlierIds = useMemo(
    () =>
      g.regeneratePreview
        ? getHighPlayPercentageOutlierIds(
            g.sortedPlayers.map((player) => ({
              playerId: player.id,
              playPercentage: g.regeneratePreview!.playerStats[player.id]?.playPercentage ?? 0,
            })),
          )
        : new Set<PlayerId>(),
    [g.regeneratePreview, g.sortedPlayers],
  );

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

  const isGridActive = g.viewMode === 'grid' || (!g.isLive && g.viewMode === 'focus');
  const hasSolverStatus = g.solver.isRunning || Boolean(g.solver.error);
  const isSetupMode = !g.isLive && !g.isCompleted;
  const showSetupOverview = Boolean(g.schedule && isSetupMode);
  const isSetupFieldView = isSetupMode && g.viewMode === 'field';
  const showRailPeriodIndicator = !isSetupMode;
  const hasRailSummary = showSetupOverview && g.schedule;
  const railHasDualContent = showRailPeriodIndicator && hasRailSummary;
  const setupSpread = g.schedule
    ? Math.max(0, g.schedule.overallStats.maxStrength - g.schedule.overallStats.minStrength)
    : 0;
  const setupBalance = getBalanceTier(setupSpread);

  function canEditPeriodDivision(periodIndex: number): boolean {
    if (g.isCompleted || !g.schedule) return false;
    if (!g.isLive) return true;
    const range = getPeriodRange(g.periodDivisions, periodIndex);
    if (!range) return false;
    return range.start > g.currentRotationIndex;
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

  function handleOpenDirectEntry() {
    if (!g.game) return;
    navigate(`/games/${g.game.id}/direct-entry`);
  }

  function handleDuplicate() {
    if (!g.game) return;
    const name = `${g.game.name} ${t('history.duplicate_suffix')}`;
    const newGame = cloneGame(g.game, name);
    g.dispatch({ type: 'CREATE_GAME', payload: newGame });
    navigate(`/games/${newGame.id}/rotations`);
  }

  function handleStartRename() {
    if (!g.game) return;
    setEditName(g.game.name);
    setRenamingOpen(true);
  }

  function handleRenameGame() {
    if (!g.game || !editName.trim()) return;
    g.dispatch({ type: 'UPDATE_GAME', payload: { ...g.game, name: editName.trim() } });
    setRenamingOpen(false);
  }

  function handleEnterDrawMode() {
    if (g.viewMode !== 'field') g.setViewMode('field');
    setDrawMode(true);
  }

  function handleExitDrawMode() {
    setDrawMode(false);
    drawing.clear();
  }

  function handleStylusDetected() {
    if (!drawMode) handleEnterDrawMode();
  }

  const setupMenuItemClass =
    'flex items-center w-full min-h-11 px-3 text-left text-ios-body active:bg-accent/80 transition-colors disabled:opacity-50';

  return (
    <div>
      {/* NavBar — adapts to game state */}
      {g.isCompleted ? (
        <NavBar
          title={g.game.name}
          backTo="/games"
          backLabel={tCommon('nav.games')}
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
                  onClick={handleStartRename}
                >
                  {t('history.rename')}
                </button>
                <button
                  className="flex items-center w-full h-11 px-3 text-ios-body rounded-lg active:bg-accent/80 transition-colors"
                  onClick={handleDuplicate}
                >
                  {t('history.duplicate')}
                </button>
              </PopoverContent>
            </Popover>
          }
        />
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
                  onClick={handleStartRename}
                >
                  {t('history.rename')}
                </button>
                <button
                  className="flex items-center w-full h-11 px-3 text-ios-body rounded-lg active:bg-accent/80 transition-colors"
                  onClick={g.handleOpenRegenerate}
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
          title={tCommon('nav.game')}
          backTo="/games"
          backLabel={tCommon('nav.games')}
          trailing={
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="plain" size="icon-sm" aria-label={t('live.game_actions_aria')}>
                    <EllipsisIcon className="size-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-1">
                  <div className="overflow-hidden rounded-[10px]">
                    <button
                      className={cn(setupMenuItemClass, 'border-b border-border/50')}
                      onClick={() => {
                        g.setSettingsOpen(true);
                      }}
                    >
                      {t('live.settings')}
                    </button>
                    <button
                      className={cn(setupMenuItemClass, 'border-b border-border/50')}
                      onClick={handleOpenDirectEntry}
                    >
                      {t('setup.enter_coach_plan')}
                    </button>
                    <button
                      className={cn(
                        setupMenuItemClass,
                        g.divisionsModified && 'border-b border-border/50',
                      )}
                      onClick={g.handleOpenRegenerate}
                      disabled={g.solver.isRunning}
                    >
                      {g.solver.isRunning
                        ? t('live.solving')
                        : g.schedule
                          ? t('live.regenerate')
                          : t('setup.generate_rotations')}
                    </button>
                    {g.divisionsModified && (
                      <button className={setupMenuItemClass} onClick={g.handleResetDivisions}>
                        {t('live.reset_rotations')}
                      </button>
                    )}
                  </div>
                  <div className="my-1 h-px bg-border/50" />
                  <div className="overflow-hidden rounded-[10px]">
                    <button
                      className={cn(setupMenuItemClass, 'border-b border-border/50')}
                      onClick={handleStartRename}
                    >
                      {t('history.rename')}
                    </button>
                    <button className={setupMenuItemClass} onClick={handleDuplicate}>
                      {t('history.duplicate')}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
              {g.schedule && (
                <Button
                  size="sm"
                  className="min-w-[110px] font-semibold"
                  onClick={g.handleStartGame}
                >
                  {t('live.start_game')}
                </Button>
              )}
            </div>
          }
        />
      )}

      <div className="space-y-5 pt-3">
        {/* Completed indicator */}
        {g.isCompleted && (
          <p className="max-w-4xl mx-auto text-ios-footnote text-muted-foreground px-4">
            {t('live.completed')}
          </p>
        )}

        {/* Context rail */}
        {g.schedule && (
          <div className="max-w-4xl mx-auto px-4">
            <div className="rounded-[12px] border border-border/40 bg-card px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none space-y-2.5">
              <div
                className={cn(
                  'flex flex-wrap items-center gap-3',
                  railHasDualContent ? 'justify-between' : 'justify-center',
                )}
              >
                {showRailPeriodIndicator && (
                  <PeriodRotationIndicator
                    periodGroups={g.periodGroups}
                    currentRotationIndex={g.currentRotationIndex}
                  />
                )}
                {hasRailSummary && (
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        setupBalance.className,
                        'bg-secondary/70',
                      )}
                    >
                      {t(`schedule.${setupBalance.key}`)} · {formatStrengthValue(setupSpread)} (
                      {t('schedule.min_max_inline', {
                        min: formatStrengthValue(g.schedule.overallStats.minStrength),
                        max: formatStrengthValue(g.schedule.overallStats.maxStrength),
                      })}
                      )
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:bg-accent/60"
                          aria-label={t('schedule.strength_range_help_button')}
                        >
                          <CircleHelpIcon className="size-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-64 p-3">
                        <PopoverHeader>
                          <PopoverTitle className="text-ios-subheadline">
                            {t('schedule.strength_range')}
                          </PopoverTitle>
                          <PopoverDescription className="text-ios-caption1">
                            {t('schedule.strength_range_help')}
                          </PopoverDescription>
                        </PopoverHeader>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              <Tabs
                value={g.isLive ? g.viewMode : g.viewMode === 'field' ? 'field' : 'grid'}
                onValueChange={(value) => {
                  if (drawMode) return;
                  if (
                    (value === 'focus' || value === 'grid' || value === 'field') &&
                    value !== g.viewMode
                  ) {
                    g.setViewMode(value);
                  }
                }}
                className="w-full"
              >
                <TabsList
                  aria-label={t('live.view_mode_aria')}
                  className={cn(
                    'rounded-lg bg-secondary/80 p-0.5 h-auto w-full grid',
                    g.isLive ? 'grid-cols-3' : 'grid-cols-2',
                  )}
                >
                  {g.isLive && (
                    <TabsTrigger
                      value="focus"
                      className="min-h-8 px-2.5 py-1 text-ios-caption1 font-medium"
                    >
                      {t('live.focus_view')}
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="grid"
                    className="min-h-8 px-2.5 py-1 text-ios-caption1 font-medium"
                  >
                    {t('live.grid_view')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="field"
                    className="min-h-8 px-2.5 py-1 text-ios-caption1 font-medium"
                  >
                    {t('live.field_view')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        )}

        {/* Solver progress/error — only when active */}
        {hasSolverStatus && (
          <div className="max-w-4xl mx-auto px-4">
            <SolverStatusCard
              isRunning={g.solver.isRunning}
              progress={g.solver.progress}
              message={g.solver.message}
              error={g.solver.error}
              onCancel={g.solver.cancel}
            />
          </div>
        )}

        {/* Playtime optimization banner */}
        {g.schedule && !g.isCompleted && g.optimizationSuggestion && !g.optimizeBannerDismissed && (
          <div className="max-w-4xl mx-auto px-4">
            <PlaytimeOptimizeBanner
              suggestion={g.optimizationSuggestion}
              onOptimize={g.handleOptimizeDivisions}
              onDismiss={() => g.setOptimizeBannerDismissed(true)}
              isRunning={g.solver.isRunning}
            />
          </div>
        )}

        {/* Draft game with no schedule yet — centered empty state */}
        {!g.schedule && (
          <div className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-12 max-w-sm mx-auto">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-muted/50 mb-4">
              <LayoutGridIcon className="size-7 text-muted-foreground" />
            </div>
            <h2 className="text-ios-title3 font-semibold mb-1.5">{t('empty.title')}</h2>
            <p className="text-ios-callout text-muted-foreground mb-8">{t('empty.description')}</p>
            <Button
              className="w-full h-[50px] rounded-xl text-ios-body font-semibold"
              onClick={g.handleOpenRegenerate}
              disabled={g.solver.isRunning}
            >
              {g.solver.isRunning ? t('setup.generating') : t('setup.generate_rotations')}
            </Button>
            <button
              type="button"
              className="mt-3 min-h-11 text-ios-callout text-primary active:opacity-70 transition-opacity"
              onClick={handleOpenDirectEntry}
            >
              {t('empty.or_enter_plan')}
            </button>
          </div>
        )}

        {/* Live focus view — only in live mode with focus tab */}
        {g.isLive && g.schedule && g.viewMode === 'focus' && g.currentRotation && (
          <div className="max-w-4xl mx-auto">
            <LiveFocusView
              currentRotation={g.currentRotation}
              nextRotation={g.nextRotation}
              playerMap={g.playerMap}
              usePositions={g.config?.usePositions ?? false}
            />
          </div>
        )}

        {/* Field view — all modes */}
        {g.schedule && g.viewMode === 'field' && g.config && (
          <div className="max-w-4xl mx-auto px-4">
            <FieldView
              rotations={g.schedule.rotations}
              initialRotationIndex={g.currentRotationIndex}
              playerMap={g.playerMap}
              usePositions={g.config.usePositions}
              useGoalie={g.config.useGoalie}
              isLive={g.isLive}
              periodGroups={g.periodGroups}
              showPeriodStatusIndicator={isSetupFieldView}
              drawMode={drawMode}
              drawing={drawing}
              onStylusDetected={handleStylusDetected}
              onSwapPlayers={!g.isCompleted && !drawMode ? g.handleSwapAtRotation : undefined}
            />
          </div>
        )}

        {/* Rotation grid table — full width for horizontal scrolling */}
        {g.schedule && isGridActive && g.config && (
          <RotationTable
            ref={gridRef}
            periodGroups={g.periodGroups}
            allDisplayPlayers={g.allDisplayPlayers}
            playerStats={g.schedule.playerStats}
            config={g.config}
            gameRemovedPlayerIds={g.game.removedPlayerIds}
            gameAbsentPlayerIds={g.game.absentPlayerIds}
            isLive={g.isLive}
            isCompleted={g.isCompleted}
            currentRotationIndex={g.currentRotationIndex}
            changingPlayerIds={g.changingPlayerIds}
            subTooltipMap={g.subTooltipMap}
            collapsedPeriods={collapsedPeriods}
            togglePeriod={togglePeriod}
            highPlayOutlierIds={highPlayOutlierIds}
            canEditPeriodDivision={canEditPeriodDivision}
            onPeriodActionsClick={(periodIndex) => setPeriodActionPeriodIndex(periodIndex)}
            swapSource={g.swapSource}
            onCellClick={g.handleCellClick}
            onRemovePlayer={(pid) => g.setRemovingPlayerId(pid)}
            onAddPlayerBack={g.handleAddPlayerBack}
          />
        )}

        {/* Draw mode FAB — field view only, above bottom bar */}
        {g.schedule && g.viewMode === 'field' && !drawMode && (
          <button
            type="button"
            className={cn(
              'fixed right-4 z-50 flex items-center justify-center size-11 rounded-full',
              'bg-secondary text-foreground shadow-md',
              'active:bg-secondary/80 transition-colors cursor-pointer',
              g.isLive
                ? 'bottom-[calc(49px+env(safe-area-inset-bottom)+68px)] lg:bottom-[68px]'
                : 'bottom-[calc(49px+env(safe-area-inset-bottom)+16px)] lg:bottom-4',
            )}
            onClick={handleEnterDrawMode}
            aria-label={t('field.draw')}
          >
            <PenLineIcon className="size-[18px]" />
          </button>
        )}

        {/* Bottom bar spacer + bar */}
        {((g.isLive && g.schedule) || (drawMode && g.viewMode === 'field')) && (
          <div className="h-20" />
        )}
        {drawMode && g.viewMode === 'field' ? (
          <DrawingToolbar
            activeTool={drawToolForRender}
            canUndo={drawing.canUndo}
            onToolChange={(tool) => {
              drawing.setActiveTool(tool);
              setDrawToolForRender(tool);
            }}
            onUndo={drawing.undo}
            onClear={drawing.clear}
            onDone={handleExitDrawMode}
          />
        ) : (
          g.isLive &&
          g.schedule && (
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
          )
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

        <LiveRegenerateLockPolicySheet
          open={g.liveRegeneratePolicySheetOpen}
          onOpenChange={g.setLiveRegeneratePolicySheetOpen}
          policy={g.liveRegeneratePolicySelection}
          onPolicyChange={g.setLiveRegeneratePolicySelection}
          onConfirm={g.handleConfirmLiveRegenerate}
        />

        <RegeneratePreviewSheet
          open={g.regeneratePreview != null}
          previewSchedule={g.regeneratePreview}
          currentSchedule={g.regeneratePreviewBase ?? g.schedule ?? null}
          players={g.sortedPlayers}
          config={g.config}
          gameRemovedPlayerIds={g.game.removedPlayerIds}
          currentRotationIndex={g.currentRotationIndex}
          highPlayOutlierIds={previewHighPlayOutlierIds}
          onApply={g.handleApplyRegeneratePreview}
          onCancel={g.handleDismissRegeneratePreview}
        />

        <BottomSheet
          open={renamingOpen}
          onOpenChange={setRenamingOpen}
          title={t('history.rename_title')}
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="game-name">{t('history.game_name_label')}</Label>
              <Input
                id="game-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameGame();
                  if (e.key === 'Escape') setRenamingOpen(false);
                }}
                aria-label={t('history.game_name_label')}
                autoFocus
              />
            </div>
            <Button onClick={handleRenameGame} size="lg" disabled={!editName.trim()}>
              {tCommon('actions.save')}
            </Button>
          </div>
        </BottomSheet>

        <OptimizeDivisionsSheet
          open={g.optimizeSheetOpen}
          suggestion={g.optimizationSuggestion}
          currentDivisions={g.periodDivisions}
          selectedOptionKey={g.selectedOptimizeOptionKey}
          failedOptionKeys={g.failedOptimizeOptionKeys}
          optimizeError={g.optimizeAttemptError}
          isRunning={g.solver.isRunning}
          onOpenChange={g.setOptimizeSheetOpen}
          onSelectOption={g.handleSelectOptimizeOption}
          onConfirm={g.handleRunOptimizePreview}
        />
      </div>
    </div>
  );
}

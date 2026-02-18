import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { Settings2, RotateCcwIcon } from 'lucide-react';
import { RotationAssignment } from '@/types/domain.ts';
import type { PlayerId, Game, GoalieAssignment } from '@/types/domain.ts';
import { previewSwap, previewSwapRange } from '@/utils/stats.ts';
import { useSolver } from '@/hooks/useSolver.ts';
import { usePeriodTimer } from '@/hooks/usePeriodTimer.ts';
import { usePeriodCollapse } from '@/hooks/usePeriodCollapse.ts';
import { LiveBottomBar } from '@/components/game/LiveBottomBar.tsx';
import { LiveFocusView } from '@/components/game/LiveFocusView.tsx';
import { RotationTable } from '@/components/game/RotationTable.tsx';
import { SolverStatusCard } from '@/components/game/SolverStatusCard.tsx';
import { GameSettingsSheet } from '@/components/game/GameSettingsSheet.tsx';
import { OverallStatsCards } from '@/components/game/OverallStatsCards.tsx';
import { PlayerStatsCard } from '@/components/game/PlayerStatsCard.tsx';
import { ConfirmDialog } from '@/components/ui/confirm-dialog.tsx';
import { SwapScopeDialog } from '@/components/game/SwapScopeDialog.tsx';

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
  const { state, dispatch } = useAppContext();
  const [swapSource, setSwapSource] = useState<{
    rotationIndex: number;
    playerId: PlayerId;
  } | null>(null);
  const [pendingSwap, setPendingSwap] = useState<{
    rotationIndex: number;
    playerAId: PlayerId;
    playerBId: PlayerId;
  } | null>(null);
  const solver = useSolver();
  const solverResult = solver.result;
  const solverReset = solver.reset;
  const [settingsOpen, setSettingsOpen] = useState(false);

  const game = gameId ? state.games[gameId] : undefined;
  const team = game ? state.teams[game.teamId] : undefined;
  const roster = team?.rosters.find((r) => r.id === game?.rosterId);
  const config = team?.gameConfigs.find((c) => c.id === game?.gameConfigId);
  const schedule = game?.schedule;

  const isLive = game?.status === 'in-progress';
  const isCompleted = game?.status === 'completed';
  const currentRotationIndex = game?.currentRotationIndex ?? 0;
  const currentRotation = schedule?.rotations[currentRotationIndex];
  const nextRotation = schedule?.rotations[currentRotationIndex + 1];
  const currentPeriodIndex = currentRotation?.periodIndex ?? 0;

  // Hooks must be called before any early returns
  const timer = usePeriodTimer(isLive ? game : undefined, config, currentRotation, dispatch);

  const { collapsedPeriods, togglePeriod } = usePeriodCollapse({
    currentPeriodIndex,
    isLive,
  });

  const [confirmEndGame, setConfirmEndGame] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<PlayerId | null>(null);
  const [viewMode, setViewMode] = useState<'focus' | 'grid'>('focus');

  const gridRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current rotation column in live mode
  useEffect(() => {
    if (!isLive || !gridRef.current) return;
    const table = gridRef.current;
    const currentCol = table.querySelector('[data-current-rotation]');
    if (currentCol) {
      const tableRect = table.getBoundingClientRect();
      const colRect = currentCol.getBoundingClientRect();
      const targetScroll = colRect.left - tableRect.left + table.scrollLeft - tableRect.width / 3;
      table.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [isLive, currentRotationIndex]);

  // Solver result effect — use gameId (string) instead of game (object) to avoid
  // re-triggering when the game reference changes after dispatch
  useEffect(() => {
    if (solverResult && gameId) {
      dispatch({
        type: 'SET_GAME_SCHEDULE',
        payload: { gameId, schedule: solverResult },
      });
      solverReset();
    }
  }, [solverResult, gameId, dispatch, solverReset]);

  // Group rotations by period for collapse rendering
  const periodGroups = useMemo(() => {
    if (!schedule) return [];
    const groups: { periodIndex: number; rotations: typeof schedule.rotations }[] = [];
    for (const rotation of schedule.rotations) {
      const existing = groups.find((g) => g.periodIndex === rotation.periodIndex);
      if (existing) {
        existing.rotations.push(rotation);
      } else {
        groups.push({ periodIndex: rotation.periodIndex, rotations: [rotation] });
      }
    }
    return groups;
  }, [schedule]);

  // Players whose assignment changes in the next rotation (for sub highlighting)
  const changingPlayerIds = useMemo(() => {
    if (!isLive || !currentRotation || !nextRotation) return new Set<PlayerId>();
    const changing = new Set<PlayerId>();
    for (const [playerId, nextAssignment] of Object.entries(nextRotation.assignments)) {
      const currentAssignment = currentRotation.assignments[playerId];
      if (currentAssignment !== nextAssignment) {
        changing.add(playerId as PlayerId);
      }
    }
    return changing;
  }, [isLive, currentRotation, nextRotation]);

  // All hooks must be above early returns (Rules of Hooks)
  const activePlayers = useMemo(() => {
    if (!game || !roster) return [];
    return roster.players.filter(
      (p) => !game.absentPlayerIds.includes(p.id) && !game.removedPlayerIds.includes(p.id),
    );
  }, [game, roster]);

  const playerMap = useMemo(() => new Map(activePlayers.map((p) => [p.id, p])), [activePlayers]);

  // Tooltip map: for changing cells in next rotation, show who they're replacing
  const subTooltipMap = useMemo(() => {
    if (!isLive || !currentRotation || !nextRotation) return new Map<PlayerId, string>();
    const tips = new Map<PlayerId, string>();

    // Categorise changing players into bench→field and field→bench
    const comingIn: PlayerId[] = [];
    const goingOut: PlayerId[] = [];
    for (const pid of changingPlayerIds) {
      const cur = currentRotation.assignments[pid];
      const nxt = nextRotation.assignments[pid];
      if (cur === RotationAssignment.Bench && nxt !== RotationAssignment.Bench) comingIn.push(pid);
      if (cur !== RotationAssignment.Bench && nxt === RotationAssignment.Bench) goingOut.push(pid);
    }

    // Match by sub-position: who currently holds the slot the incoming player will take?
    const matched = new Set<PlayerId>();
    if (currentRotation.fieldPositions && nextRotation.fieldPositions) {
      const curSubPosToPlayer = new Map<string, PlayerId>();
      for (const [pid, subPos] of Object.entries(currentRotation.fieldPositions)) {
        curSubPosToPlayer.set(subPos, pid as PlayerId);
      }
      for (const pid of comingIn) {
        const nextSubPos = nextRotation.fieldPositions![pid];
        if (!nextSubPos) continue;
        const replaced = curSubPosToPlayer.get(nextSubPos);
        if (replaced && replaced !== pid && goingOut.includes(replaced)) {
          const inName = playerMap.get(pid)?.name;
          const outName = playerMap.get(replaced)?.name;
          if (inName && outName) {
            tips.set(pid, `Replacing ${outName}`);
            tips.set(replaced, `Replaced by ${inName}`);
            matched.add(pid);
            matched.add(replaced);
          }
        }
      }
    }

    // Fallback: if exactly one unmatched in each direction, pair them
    const unmatchedIn = comingIn.filter((p) => !matched.has(p));
    const unmatchedOut = goingOut.filter((p) => !matched.has(p));
    if (unmatchedIn.length === 1 && unmatchedOut.length === 1) {
      const inName = playerMap.get(unmatchedIn[0])?.name;
      const outName = playerMap.get(unmatchedOut[0])?.name;
      if (inName && outName) {
        tips.set(unmatchedIn[0], `Replacing ${outName}`);
        tips.set(unmatchedOut[0], `Replaced by ${inName}`);
      }
    }

    return tips;
  }, [isLive, currentRotation, nextRotation, changingPlayerIds, playerMap]);

  if (!game || !schedule || !roster || !config) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Game or schedule not found</p>
        <Link to="/" className="text-primary underline mt-2 inline-block">
          Back to teams
        </Link>
      </div>
    );
  }

  const removedPlayers = roster.players.filter((p) => game.removedPlayerIds.includes(p.id));
  const isLastRotation = currentRotationIndex >= schedule.rotations.length - 1;
  const manyRotations = schedule.rotations.length > 4;
  const isCrossingPeriod = nextRotation ? nextRotation.periodIndex !== currentPeriodIndex : false;
  const removingPlayer = removingPlayerId
    ? (playerMap.get(removingPlayerId) ?? roster.players.find((p) => p.id === removingPlayerId))
    : undefined;

  function handleCellClick(rotationIndex: number, playerId: PlayerId) {
    // Block interaction in completed mode
    if (isCompleted) return;
    // Block interaction on past rotations in live mode
    if (isLive && rotationIndex < currentRotationIndex) return;

    if (!swapSource) {
      setSwapSource({ rotationIndex, playerId });
      return;
    }

    if (swapSource.rotationIndex === rotationIndex && swapSource.playerId === playerId) {
      setSwapSource(null);
      return;
    }

    if (swapSource.rotationIndex === rotationIndex && schedule) {
      setPendingSwap({
        rotationIndex,
        playerAId: swapSource.playerId,
        playerBId: playerId,
      });
      setSwapSource(null);
    } else {
      setSwapSource({ rotationIndex, playerId });
    }
  }

  function handleSwapThisRotation() {
    if (!pendingSwap || !schedule) return;
    const newSchedule = previewSwap(
      schedule,
      pendingSwap.rotationIndex,
      pendingSwap.playerAId,
      pendingSwap.playerBId,
      activePlayers,
    );
    dispatch({
      type: 'SET_GAME_SCHEDULE',
      payload: { gameId: game.id, schedule: newSchedule },
    });
    setPendingSwap(null);
  }

  function handleSwapAllRemaining() {
    if (!pendingSwap || !schedule) return;
    const newSchedule = previewSwapRange(
      schedule,
      pendingSwap.rotationIndex,
      pendingSwap.playerAId,
      pendingSwap.playerBId,
      activePlayers,
    );
    dispatch({
      type: 'SET_GAME_SCHEDULE',
      payload: { gameId: game.id, schedule: newSchedule },
    });
    setPendingSwap(null);
  }

  function handleStartGame() {
    if (!game) return;
    const updatedGame: Game = {
      ...game,
      status: 'in-progress',
      startedAt: Date.now(),
    };
    dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
    // No navigate — stay on same page
  }

  function handleAdvance() {
    if (!gameId) return;
    if (isLastRotation) {
      setConfirmEndGame(true);
      return;
    }
    dispatch({ type: 'ADVANCE_ROTATION', payload: gameId });
  }

  function handleRetreat() {
    if (!gameId || currentRotationIndex <= 0) return;
    dispatch({ type: 'RETREAT_ROTATION', payload: gameId });
  }

  function handleEndGame() {
    if (!gameId || !game) return;
    const updatedGame: Game = {
      ...game,
      status: 'completed',
      completedAt: Date.now(),
    };
    dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
  }

  function handleConfirmRemovePlayer() {
    if (!gameId || !game || !config || !schedule || !removingPlayerId) return;

    const remainingPlayers = activePlayers.filter((p) => p.id !== removingPlayerId);
    if (remainingPlayers.length < config.fieldSize) {
      solver.setError(
        `Cannot remove player: only ${remainingPlayers.length} would remain, but ${config.fieldSize} are needed on field`,
      );
      setRemovingPlayerId(null);
      return;
    }

    dispatch({ type: 'REMOVE_PLAYER_FROM_GAME', payload: { gameId, playerId: removingPlayerId } });
    solver.solve({
      players: remainingPlayers,
      config,
      absentPlayerIds: [...game.absentPlayerIds, removingPlayerId, ...game.removedPlayerIds],
      goalieAssignments: game.goalieAssignments,
      manualOverrides: [],
      startFromRotation: game.currentRotationIndex,
      existingRotations: schedule.rotations,
    });
    setRemovingPlayerId(null);
  }

  function handleAddPlayerBack(playerId: PlayerId) {
    if (!gameId || !game || !roster || !config || !schedule) return;

    dispatch({ type: 'ADD_PLAYER_TO_GAME', payload: { gameId, playerId } });

    const returningPlayer = roster.players.find((p) => p.id === playerId);
    if (!returningPlayer) return;

    const updatedPlayers = [...activePlayers, returningPlayer];
    const updatedRemoved = game.removedPlayerIds.filter((id) => id !== playerId);
    solver.solve({
      players: updatedPlayers,
      config,
      absentPlayerIds: [...game.absentPlayerIds, ...updatedRemoved],
      goalieAssignments: game.goalieAssignments,
      manualOverrides: [],
      startFromRotation: game.currentRotationIndex,
      existingRotations: schedule.rotations,
    });
  }

  function handleRegenerate() {
    if (!roster || !config || !game) return;
    if (isLive && schedule) {
      solver.solve({
        players: activePlayers,
        config,
        absentPlayerIds: [...game.absentPlayerIds, ...game.removedPlayerIds],
        goalieAssignments: game.goalieAssignments,
        manualOverrides: [],
        startFromRotation: game.currentRotationIndex,
        existingRotations: schedule.rotations,
      });
    } else {
      solver.solve({
        players: roster.players,
        config,
        absentPlayerIds: game.absentPlayerIds,
        goalieAssignments: game.goalieAssignments,
        manualOverrides: game.manualOverrides,
      });
    }
  }

  function handleRegenerateWithSettings(
    absentIds: PlayerId[],
    goalieAssignments: GoalieAssignment[],
  ) {
    if (!roster || !config || !game) return;
    const updatedGame: Game = {
      ...game,
      absentPlayerIds: absentIds,
      goalieAssignments,
    };
    dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
    solver.solve({
      players: roster.players,
      config,
      absentPlayerIds: absentIds,
      goalieAssignments,
      manualOverrides: game.manualOverrides,
    });
  }

  const sortedPlayers = [...activePlayers].sort((a, b) => b.skillRanking - a.skillRanking);
  // Include removed players in display (shown with strikethrough)
  const allDisplayPlayers = [
    ...sortedPlayers,
    ...removedPlayers.sort((a, b) => b.skillRanking - a.skillRanking),
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          Teams
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link to={`/teams/${game.teamId}`} className="text-muted-foreground hover:text-foreground">
          {team?.name}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span>{game.name}</span>
      </div>

      {/* Header — adapts to game state */}
      {isCompleted ? (
        <div>
          <h1 className="text-2xl font-bold">{game.name}</h1>
          <p className="text-sm text-muted-foreground">Completed</p>
        </div>
      ) : isLive ? (
        <div className="flex items-center justify-between">
          <RotationPips periodGroups={periodGroups} currentRotationIndex={currentRotationIndex} />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode((v) => (v === 'focus' ? 'grid' : 'focus'))}
            >
              {viewMode === 'focus' ? 'Grid' : 'Focus'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={solver.isRunning}
            >
              {solver.isRunning ? 'Solving...' : 'Regenerate'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmEndGame(true)}>
              End Game
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{game.name}</h1>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              title="Edit game settings"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={solver.isRunning}
            >
              {solver.isRunning ? 'Solving...' : 'Regenerate'}
            </Button>
            <Button size="sm" onClick={handleStartGame}>
              Start Game
            </Button>
          </div>
        </div>
      )}

      {/* Solver progress/error — visible in all modes */}
      <SolverStatusCard
        isRunning={solver.isRunning}
        progress={solver.progress}
        message={solver.message}
        error={solver.error}
      />

      {/* Overall stats — setup mode only */}
      {!isLive && !isCompleted && <OverallStatsCards stats={schedule.overallStats} />}

      {/* Swap hint — setup mode only, hidden once a swap starts */}
      {!isLive && !isCompleted && !swapSource && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          Tap any player cell to swap their position with another player in the same rotation.
        </p>
      )}

      {/* Landscape hint — portrait only, many rotations */}
      {manyRotations && !isCompleted && (
        <p className="hidden portrait:flex text-xs text-muted-foreground text-center items-center justify-center gap-1.5">
          <RotateCcwIcon className="size-3" />
          Rotate your phone for a wider view
        </p>
      )}

      {/* Live focus view — default in live mode */}
      {isLive && viewMode === 'focus' && currentRotation && (
        <LiveFocusView
          currentRotation={currentRotation}
          nextRotation={nextRotation}
          playerMap={playerMap}
          changingPlayerIds={changingPlayerIds}
          usePositions={config?.usePositions ?? false}
        />
      )}

      {/* Rotation grid — always shown in setup/completed, toggled in live */}
      {(!isLive || viewMode === 'grid') && (
        <RotationTable
          ref={gridRef}
          periodGroups={periodGroups}
          allDisplayPlayers={allDisplayPlayers}
          playerStats={schedule.playerStats}
          config={config}
          gameRemovedPlayerIds={game.removedPlayerIds}
          isLive={isLive}
          isCompleted={isCompleted}
          currentRotationIndex={currentRotationIndex}
          changingPlayerIds={changingPlayerIds}
          subTooltipMap={subTooltipMap}
          collapsedPeriods={collapsedPeriods}
          togglePeriod={togglePeriod}
          swapSource={swapSource}
          onCellClick={handleCellClick}
          onRemovePlayer={(pid) => setRemovingPlayerId(pid)}
          onAddPlayerBack={handleAddPlayerBack}
        />
      )}

      {/* Swap instruction — only in non-live mode */}
      {!isLive && !isCompleted && swapSource && (
        <p className="text-sm text-muted-foreground mt-2">
          Selected {playerMap.get(swapSource.playerId)?.name} in R{swapSource.rotationIndex + 1}.
          Click another player in the same rotation to swap, or click again to deselect.
        </p>
      )}

      {/* Player statistics — setup mode only */}
      {!isLive && !isCompleted && (
        <PlayerStatsCard
          players={sortedPlayers}
          playerStats={schedule.playerStats}
          minPlayPercentage={config?.minPlayPercentage ?? 50}
        />
      )}

      {/* Live bottom bar */}
      {isLive && <div className="h-20" />}
      {isLive && (
        <LiveBottomBar
          timer={timer}
          onAdvance={handleAdvance}
          onRetreat={handleRetreat}
          isFirstRotation={currentRotationIndex === 0}
          isLastRotation={isLastRotation}
          isCrossingPeriod={isCrossingPeriod}
          swapPlayerName={swapSource ? (playerMap.get(swapSource.playerId)?.name ?? null) : null}
          onCancelSwap={() => setSwapSource(null)}
        />
      )}

      {/* Swap scope dialog */}
      <SwapScopeDialog
        open={pendingSwap !== null}
        playerA={pendingSwap ? (playerMap.get(pendingSwap.playerAId)?.name ?? 'Player') : ''}
        playerB={pendingSwap ? (playerMap.get(pendingSwap.playerBId)?.name ?? 'Player') : ''}
        onThisRotation={handleSwapThisRotation}
        onAllRemaining={handleSwapAllRemaining}
        onCancel={() => setPendingSwap(null)}
      />

      {/* End game confirmation */}
      <ConfirmDialog
        open={confirmEndGame}
        onConfirm={() => {
          setConfirmEndGame(false);
          handleEndGame();
        }}
        onCancel={() => setConfirmEndGame(false)}
        title="End this game?"
        description="The game will be marked as completed. You won't be able to resume live tracking."
        confirmLabel="End Game"
        variant="destructive"
      />

      {/* Player removal confirmation */}
      <ConfirmDialog
        open={removingPlayerId !== null}
        onConfirm={handleConfirmRemovePlayer}
        onCancel={() => setRemovingPlayerId(null)}
        title={`Remove ${removingPlayer?.name ?? 'player'}?`}
        description="They will be removed from remaining rotations. The schedule will be recalculated."
        confirmLabel="Remove"
        variant="destructive"
      />

      {/* Settings Sheet — only in setup mode */}
      <GameSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        players={roster.players}
        initialAbsentIds={game.absentPlayerIds}
        initialGoalieAssignments={game.goalieAssignments}
        periods={config?.periods ?? 2}
        useGoalie={config?.useGoalie ?? false}
        onRegenerate={handleRegenerateWithSettings}
      />
    </div>
  );
}

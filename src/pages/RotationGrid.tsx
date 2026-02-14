import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { Label } from '@/components/ui/label.tsx';
import { cn } from '@/lib/utils.ts';
import { Settings2, ChevronRightIcon } from 'lucide-react';
import { SUB_POSITION_LABELS, RotationAssignment } from '@/types/domain.ts';
import type { PlayerId, Game, GoalieAssignment } from '@/types/domain.ts';
import { previewSwap } from '@/utils/stats.ts';
import { getAssignmentDisplay } from '@/utils/positions.ts';
import { useSolver } from '@/hooks/useSolver.ts';
import { usePeriodTimer } from '@/hooks/usePeriodTimer.ts';
import { usePeriodCollapse } from '@/hooks/usePeriodCollapse.ts';
import { LiveBottomBar } from '@/components/game/LiveBottomBar.tsx';
import { PlayerPopover } from '@/components/game/PlayerPopover.tsx';
import { ConfirmDialog } from '@/components/ui/confirm-dialog.tsx';

export function RotationGrid() {
  const { gameId } = useParams<{ gameId: string }>();
  const { state, dispatch } = useAppContext();
  const [swapSource, setSwapSource] = useState<{ rotationIndex: number; playerId: PlayerId } | null>(null);
  const solver = useSolver();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editAbsent, setEditAbsent] = useState<Set<PlayerId>>(new Set());
  const [editGoalies, setEditGoalies] = useState<GoalieAssignment[]>([]);

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
  const timer = usePeriodTimer(
    isLive ? game : undefined,
    config,
    currentRotation,
    dispatch,
  );

  const { collapsedPeriods, togglePeriod } = usePeriodCollapse({
    totalPeriods: config?.periods ?? 1,
    currentPeriodIndex,
    isLive,
  });

  const [removingPlayerId, setRemovingPlayerId] = useState<PlayerId | null>(null);

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

  // Solver result effect
  useEffect(() => {
    if (solver.result && game) {
      dispatch({
        type: 'SET_GAME_SCHEDULE',
        payload: { gameId: game.id, schedule: solver.result },
      });
      solver.reset();
    }
  }, [solver.result, game, dispatch, solver]);

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

  if (!game || !schedule || !roster) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Game or schedule not found</p>
        <Link to="/" className="text-primary underline mt-2 inline-block">Back to teams</Link>
      </div>
    );
  }

  const activePlayers = roster.players.filter(
    (p) => !game.absentPlayerIds.includes(p.id) && !game.removedPlayerIds.includes(p.id),
  );
  const playerMap = new Map(activePlayers.map((p) => [p.id, p]));
  const removedPlayers = roster.players.filter((p) => game.removedPlayerIds.includes(p.id));
  const isLastRotation = currentRotationIndex >= schedule.rotations.length - 1;
  const isCrossingPeriod = nextRotation ? nextRotation.periodIndex !== currentPeriodIndex : false;
  const removingPlayer = removingPlayerId ? (playerMap.get(removingPlayerId) ?? roster.players.find((p) => p.id === removingPlayerId)) : undefined;

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
      // In live mode on current rotation, only allow swaps involving a bench player
      if (isLive && rotationIndex === currentRotationIndex) {
        const sourceAssignment = schedule.rotations[rotationIndex].assignments[swapSource.playerId];
        const targetAssignment = schedule.rotations[rotationIndex].assignments[playerId];
        if (sourceAssignment !== RotationAssignment.Bench && targetAssignment !== RotationAssignment.Bench) {
          setSwapSource({ rotationIndex, playerId });
          return;
        }
      }
      const newSchedule = previewSwap(
        schedule,
        rotationIndex,
        swapSource.playerId,
        playerId,
        activePlayers,
      );
      dispatch({
        type: 'SET_GAME_SCHEDULE',
        payload: { gameId: game.id, schedule: newSchedule },
      });
      setSwapSource(null);
    } else {
      setSwapSource({ rotationIndex, playerId });
    }
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
      handleEndGame();
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

    dispatch({ type: 'REMOVE_PLAYER_FROM_GAME', payload: { gameId, playerId: removingPlayerId } });

    const remainingPlayers = activePlayers.filter((p) => p.id !== removingPlayerId);
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

  function handleOpenSettings() {
    if (!game) return;
    setEditAbsent(new Set(game.absentPlayerIds));
    setEditGoalies([...game.goalieAssignments]);
    setSettingsOpen(true);
  }

  function handleToggleAbsent(playerId: PlayerId) {
    setEditAbsent((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function handleGoalieChange(periodIndex: number, playerId: string) {
    setEditGoalies((prev) => {
      const filtered = prev.filter((a) => a.periodIndex !== periodIndex);
      return [...filtered, { periodIndex, playerId: playerId as PlayerId | 'auto' }];
    });
  }

  function handleRegenerateWithSettings() {
    if (!roster || !config || !game) return;
    const updatedGame: Game = {
      ...game,
      absentPlayerIds: [...editAbsent],
      goalieAssignments: config.useGoalie ? editGoalies : [],
    };
    dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
    solver.solve({
      players: roster.players,
      config,
      absentPlayerIds: [...editAbsent],
      goalieAssignments: config.useGoalie ? editGoalies : [],
      manualOverrides: game.manualOverrides,
    });
    setSettingsOpen(false);
  }

  const sortedPlayers = [...activePlayers].sort((a, b) => b.skillRanking - a.skillRanking);
  // Include removed players in display (shown with strikethrough)
  const allDisplayPlayers = [
    ...sortedPlayers,
    ...removedPlayers.sort((a, b) => b.skillRanking - a.skillRanking),
  ];

  return (
    <div className="space-y-4">
      {/* Header — adapts to game state */}
      {isCompleted ? (
        <div>
          <h1 className="text-xl font-bold">{game.name}</h1>
          <p className="text-sm text-muted-foreground">{team?.name} &middot; Completed</p>
        </div>
      ) : isLive ? (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              Rotation {currentRotationIndex + 1} of {schedule.rotations.length}
              <span className="text-muted-foreground font-normal text-base ml-2">
                &middot; Period {currentPeriodIndex + 1}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">{game.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={solver.isRunning}>
              {solver.isRunning ? 'Solving...' : 'Regenerate'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleEndGame}>
              End Game
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{game.name}</h1>
            <p className="text-sm text-muted-foreground">{team?.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleOpenSettings} title="Edit game settings">
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={solver.isRunning}>
              {solver.isRunning ? 'Solving...' : 'Regenerate'}
            </Button>
            <Button size="sm" onClick={handleStartGame}>
              Start Game
            </Button>
          </div>
        </div>
      )}

      {/* Solver progress/error — visible in all modes */}
      {solver.isRunning && (
        <Card>
          <CardContent className="py-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{solver.message}</span>
              <span>{solver.progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${solver.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {solver.error && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{solver.error}</p>
          </CardContent>
        </Card>
      )}

      {/* Overall stats — setup mode only */}
      {!isLive && !isCompleted && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{schedule.overallStats.avgStrength}</p>
              <p className="text-xs text-muted-foreground">Avg Strength</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">
                {schedule.overallStats.minStrength}-{schedule.overallStats.maxStrength}
              </p>
              <p className="text-xs text-muted-foreground">Strength Range</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{schedule.overallStats.strengthVariance.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Variance</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rotation grid */}
      <div className="overflow-x-auto" ref={gridRef}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-3 sticky left-0 bg-background font-medium z-10">Player</th>
              {periodGroups.map((group) => {
                if (collapsedPeriods.has(group.periodIndex)) {
                  return (
                    <th
                      key={`collapsed-${group.periodIndex}`}
                      className="text-center py-2 px-1 font-medium min-w-[36px] cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => togglePeriod(group.periodIndex)}
                    >
                      <div className="flex items-center justify-center gap-0.5 text-muted-foreground">
                        <span className="text-xs">P{group.periodIndex + 1}</span>
                        <ChevronRightIcon className="size-3" />
                      </div>
                    </th>
                  );
                }
                return group.rotations.map((r, i) => {
                  const isCurrent = isLive && r.index === currentRotationIndex;
                  const isPast = isLive && r.index < currentRotationIndex;
                  const isNext = isLive && r.index === currentRotationIndex + 1;
                  return (
                    <th
                      key={r.index}
                      className={cn(
                        'text-center py-2 font-medium',
                        isLive ? 'px-2 min-w-[76px]' : 'px-1 min-w-[60px]',
                        isCurrent && 'bg-primary/10 border-l-2 border-r-2 border-primary/30',
                        isNext && 'bg-accent/30',
                        isPast && 'opacity-40',
                      )}
                      {...(isCurrent ? { 'data-current-rotation': '' } : {})}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>R{r.index + 1}</span>
                      </div>
                      {(isCurrent || isNext) && (
                        <span className={cn(
                          'text-[10px] font-semibold uppercase tracking-wide',
                          isCurrent && 'text-primary',
                          isNext && 'text-muted-foreground',
                        )}>
                          {isCurrent ? 'Now' : 'Next'}
                        </span>
                      )}
                      <div className="text-xs text-muted-foreground font-normal">
                        {i === 0 && isLive ? (
                          <button
                            className="hover:text-foreground transition-colors"
                            onClick={() => togglePeriod(group.periodIndex)}
                          >
                            P{r.periodIndex + 1}
                          </button>
                        ) : (
                          <>P{r.periodIndex + 1}</>
                        )}
                      </div>
                    </th>
                  );
                });
              })}
              <th className="text-center py-2 px-2 font-medium">Play%</th>
            </tr>
          </thead>
          <tbody>
            {allDisplayPlayers.map((player) => {
              const stats = schedule.playerStats[player.id];
              const isRemoved = game.removedPlayerIds.includes(player.id);
              const playerNameEl = (
                <span className={cn('whitespace-nowrap', isRemoved && 'line-through opacity-50')}>
                  {player.name}
                </span>
              );
              return (
                <tr key={player.id} className={cn('border-b', isRemoved && 'opacity-60')}>
                  <td className={cn('pr-3 sticky left-0 bg-background z-10', isLive ? 'py-2.5' : 'py-1.5')}>
                    {isLive ? (
                      <PlayerPopover
                        playerName={player.name}
                        stats={stats}
                        isRemoved={isRemoved}
                        onRemove={() => setRemovingPlayerId(player.id)}
                        onAddBack={() => handleAddPlayerBack(player.id)}
                      >
                        <button className="text-left">{playerNameEl}</button>
                      </PlayerPopover>
                    ) : (
                      playerNameEl
                    )}
                  </td>
                  {periodGroups.map((group) => {
                    if (collapsedPeriods.has(group.periodIndex)) {
                      return (
                        <td
                          key={`collapsed-${group.periodIndex}`}
                          className="text-center py-1.5 px-1 cursor-pointer hover:bg-accent/50"
                          onClick={() => togglePeriod(group.periodIndex)}
                        />
                      );
                    }
                    return group.rotations.map((rotation) => {
                      const assignment = rotation.assignments[player.id];
                      if (!assignment) return <td key={rotation.index} />;
                      const usePositions = config?.usePositions ?? false;
                      const fieldPosition = rotation.fieldPositions?.[player.id];
                      const display = getAssignmentDisplay(assignment, fieldPosition, usePositions);
                      const isCurrent = isLive && rotation.index === currentRotationIndex;
                      const isPast = isLive && rotation.index < currentRotationIndex;
                      const isNext = isLive && rotation.index === currentRotationIndex + 1;
                      const isChanging = isNext && changingPlayerIds.has(player.id);
                      const isSelected =
                        swapSource?.rotationIndex === rotation.index &&
                        swapSource?.playerId === player.id;
                      const isValidTarget =
                        swapSource &&
                        !isSelected &&
                        swapSource.rotationIndex === rotation.index &&
                        !isPast &&
                        !isCompleted;
                      const subTip = isChanging ? subTooltipMap.get(player.id) : undefined;
                      const cellTitle = subTip ?? (fieldPosition ? SUB_POSITION_LABELS[fieldPosition] : undefined);
                      return (
                        <td
                          key={rotation.index}
                          className={cn(
                            'text-center',
                            isLive ? 'py-2.5 px-2' : 'py-1.5 px-1',
                            isCurrent && 'bg-primary/10 border-l-2 border-r-2 border-primary/30',
                            isNext && 'bg-accent/30',
                            isPast && 'opacity-40',
                          )}
                          {...(isCurrent ? { 'data-current-rotation': '' } : {})}
                          onClick={() => !isPast && !isCompleted && handleCellClick(rotation.index, player.id)}
                        >
                          <span
                            className={cn(
                              'inline-block rounded font-medium transition-all',
                              isLive ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs',
                              display.className,
                              isSelected && 'ring-2 ring-primary ring-offset-1 animate-pulse',
                              isValidTarget && 'ring-1 ring-primary/50 hover:ring-2 hover:ring-primary',
                              isChanging && 'ring-2 ring-dashed ring-accent-foreground/40',
                              !isPast && !isCompleted && 'cursor-pointer',
                              swapSource && !isSelected && !isValidTarget && 'opacity-70 hover:opacity-100',
                            )}
                            title={cellTitle}
                          >
                            {display.label}
                          </span>
                        </td>
                      );
                    });
                  })}
                  <td className="text-center py-1.5 px-2">
                    <span
                      className={`text-xs font-medium ${
                        stats && stats.playPercentage < (config?.minPlayPercentage ?? 50)
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {stats?.playPercentage ?? 0}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="py-2 pr-3 sticky left-0 bg-background text-sm z-10">Team Strength</td>
              {periodGroups.map((group) => {
                if (collapsedPeriods.has(group.periodIndex)) {
                  return <td key={`collapsed-${group.periodIndex}`} />;
                }
                return group.rotations.map((rotation) => {
                  const isCurrent = isLive && rotation.index === currentRotationIndex;
                  const isPast = isLive && rotation.index < currentRotationIndex;
                  return (
                    <td
                      key={rotation.index}
                      className={cn(
                        'text-center py-2 px-1 text-sm',
                        isCurrent && 'bg-primary/10 border-l-2 border-r-2 border-primary/30',
                        isPast && 'opacity-40',
                      )}
                    >
                      {rotation.teamStrength}
                    </td>
                  );
                });
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Swap instruction — only in non-live mode */}
      {!isLive && !isCompleted && swapSource && (
        <p className="text-sm text-muted-foreground mt-2">
          Selected {playerMap.get(swapSource.playerId)?.name} in R{swapSource.rotationIndex + 1}.
          Click another player in the same rotation to swap, or click again to deselect.
        </p>
      )}

      {/* Player statistics — setup mode only */}
      {!isLive && !isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Player Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedPlayers.map((player) => {
                const stats = schedule.playerStats[player.id];
                if (!stats) return null;
                return (
                  <div key={player.id} className="flex items-center justify-between text-sm">
                    <span>{player.name}</span>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{stats.rotationsPlayed} played</span>
                      <span>{stats.rotationsBenched} bench</span>
                      {stats.rotationsGoalie > 0 && <span>{stats.rotationsGoalie} GK</span>}
                      <span
                        className={`font-medium ${
                          stats.playPercentage < (config?.minPlayPercentage ?? 50)
                            ? 'text-destructive'
                            : 'text-foreground'
                        }`}
                      >
                        {stats.playPercentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
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
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Game Settings</SheetTitle>
            <SheetDescription>
              Edit attendance and goalie assignments, then regenerate.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4">
            {/* Absent players */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Attendance ({roster.players.filter((p) => !editAbsent.has(p.id)).length} / {roster.players.length})
              </Label>
              <div className="grid gap-1.5">
                {roster.players.map((player) => {
                  const isAbsent = editAbsent.has(player.id);
                  return (
                    <div
                      key={player.id}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
                        isAbsent ? 'bg-destructive/10 opacity-60' : 'hover:bg-accent',
                      )}
                      onClick={() => handleToggleAbsent(player.id)}
                    >
                      <Checkbox checked={!isAbsent} onCheckedChange={() => handleToggleAbsent(player.id)} />
                      <span className={cn('text-sm flex-1', isAbsent && 'line-through')}>{player.name}</span>
                      <Badge variant="secondary" className="text-xs">{player.skillRanking}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Goalie assignments */}
            {config?.useGoalie && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Goalie Assignment</Label>
                <div className="space-y-2">
                  {Array.from({ length: config.periods }, (_, i) => {
                    const availableGoalies = roster.players.filter(
                      (p) => p.canPlayGoalie && !editAbsent.has(p.id),
                    );
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <Label className="w-20 text-sm">Period {i + 1}</Label>
                        <Select
                          value={editGoalies.find((a) => a.periodIndex === i)?.playerId ?? 'auto'}
                          onValueChange={(v) => handleGoalieChange(i, v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-assign</SelectItem>
                            {availableGoalies.map((player) => (
                              <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <SheetFooter>
            <Button className="w-full" onClick={handleRegenerateWithSettings}>
              Regenerate with Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

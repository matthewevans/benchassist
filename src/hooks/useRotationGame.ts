import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useSolver, type SolverInput } from '@/hooks/useSolver.ts';
import { previewSwap, previewSwapRange } from '@/utils/stats.ts';
import { redivideSchedulePeriod } from '@/utils/rotationDivision.ts';
import { normalizePeriodDivisions, getPeriodRange } from '@/utils/rotationLayout.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type { PlayerId, Game, GoalieAssignment, RotationSchedule } from '@/types/domain.ts';

export type LiveRegenerateLockPolicy = 'off' | 'hard-only' | 'hard+soft';

export function useRotationGame(gameId: string | undefined) {
  const { state, dispatch } = useAppContext();
  const solver = useSolver();

  // --- Core data ---
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
  const periodDivisions = useMemo(
    () =>
      normalizePeriodDivisions(
        game?.periodDivisions,
        config?.periods ?? 0,
        config?.rotationsPerPeriod ?? 1,
      ),
    [game?.periodDivisions, config?.periods, config?.rotationsPerPeriod],
  );

  // --- Swap state ---
  const [swapSource, setSwapSource] = useState<{
    rotationIndex: number;
    playerId: PlayerId;
  } | null>(null);
  const [pendingSwap, setPendingSwap] = useState<{
    rotationIndex: number;
    playerAId: PlayerId;
    playerBId: PlayerId;
  } | null>(null);

  // --- UI state ---
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmEndGame, setConfirmEndGame] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<PlayerId | null>(null);
  const [viewMode, setViewMode] = useState<'focus' | 'grid'>('focus');
  const [regeneratePreviewBase, setRegeneratePreviewBase] = useState<RotationSchedule | null>(null);
  const [solverResultBehavior, setSolverResultBehavior] = useState<'apply' | 'preview-regenerate'>(
    'apply',
  );
  const [liveRegeneratePolicy, setLiveRegeneratePolicy] = useState<LiveRegenerateLockPolicy>('off');
  const [liveRegeneratePolicySelection, setLiveRegeneratePolicySelection] =
    useState<LiveRegenerateLockPolicy>('off');
  const [liveRegeneratePolicySheetOpen, setLiveRegeneratePolicySheetOpen] = useState(false);

  // --- Derived data ---
  const periodGroups = useMemo(() => {
    if (!schedule) return [];
    const groups: { periodIndex: number; rotations: typeof schedule.rotations }[] = [];
    for (const rotation of schedule.rotations) {
      const existing = groups.find((g) => g.periodIndex === rotation.periodIndex);
      if (existing) existing.rotations.push(rotation);
      else groups.push({ periodIndex: rotation.periodIndex, rotations: [rotation] });
    }
    return groups;
  }, [schedule]);

  const changingPlayerIds = useMemo(() => {
    if (!isLive || !currentRotation || !nextRotation) return new Set<PlayerId>();
    const changing = new Set<PlayerId>();
    for (const [playerId, nextAssignment] of Object.entries(nextRotation.assignments)) {
      if (currentRotation.assignments[playerId] !== nextAssignment) {
        changing.add(playerId as PlayerId);
      }
    }
    return changing;
  }, [isLive, currentRotation, nextRotation]);

  const activePlayers = useMemo(() => {
    if (!game || !roster) return [];
    return roster.players.filter(
      (p) => !game.absentPlayerIds.includes(p.id) && !game.removedPlayerIds.includes(p.id),
    );
  }, [game, roster]);

  const playerMap = useMemo(() => new Map(activePlayers.map((p) => [p.id, p])), [activePlayers]);

  const subTooltipMap = useMemo(() => {
    if (!isLive || !currentRotation || !nextRotation) return new Map<PlayerId, string>();
    const tips = new Map<PlayerId, string>();
    const comingIn: PlayerId[] = [];
    const goingOut: PlayerId[] = [];
    for (const pid of changingPlayerIds) {
      const cur = currentRotation.assignments[pid];
      const nxt = nextRotation.assignments[pid];
      if (cur === RotationAssignment.Bench && nxt !== RotationAssignment.Bench) comingIn.push(pid);
      if (cur !== RotationAssignment.Bench && nxt === RotationAssignment.Bench) goingOut.push(pid);
    }
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

  // --- Solver result effect ---
  const solverResult = solver.result;
  const solverReset = solver.reset;
  useEffect(() => {
    if (solverResult && gameId) {
      if (solverResultBehavior === 'apply') {
        dispatch({ type: 'SET_GAME_SCHEDULE', payload: { gameId, schedule: solverResult } });
        solverReset();
      }
    }
  }, [solverResult, gameId, dispatch, solverReset, solverResultBehavior]);

  function runSolve(input: SolverInput, behavior: 'apply' | 'preview-regenerate' = 'apply') {
    setSolverResultBehavior(behavior);
    solver.solve(input);
  }

  const regeneratePreview = solverResultBehavior === 'preview-regenerate' ? solver.result : null;

  function getManualOverridesForPolicy(policy: LiveRegenerateLockPolicy) {
    if (!game) return [];
    if (policy === 'off') return [];
    if (policy === 'hard-only') {
      return game.manualOverrides.filter((override) => override.lockMode !== 'soft');
    }
    return game.manualOverrides;
  }

  // --- Handlers ---
  function handleCellClick(rotationIndex: number, playerId: PlayerId) {
    if (isCompleted) return;
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
      setPendingSwap({ rotationIndex, playerAId: swapSource.playerId, playerBId: playerId });
      setSwapSource(null);
    } else {
      setSwapSource({ rotationIndex, playerId });
    }
  }

  function handleSwapThisRotation() {
    if (!pendingSwap || !schedule || !gameId) return;
    const newSchedule = previewSwap(
      schedule,
      pendingSwap.rotationIndex,
      pendingSwap.playerAId,
      pendingSwap.playerBId,
      activePlayers,
    );
    dispatch({ type: 'SET_GAME_SCHEDULE', payload: { gameId, schedule: newSchedule } });
    setPendingSwap(null);
  }

  function handleSwapAllRemaining() {
    if (!pendingSwap || !schedule || !gameId) return;
    const newSchedule = previewSwapRange(
      schedule,
      pendingSwap.rotationIndex,
      pendingSwap.playerAId,
      pendingSwap.playerBId,
      activePlayers,
    );
    dispatch({ type: 'SET_GAME_SCHEDULE', payload: { gameId, schedule: newSchedule } });
    setPendingSwap(null);
  }

  function handleStartGame() {
    if (!game) return;
    const updatedGame: Game = { ...game, status: 'in-progress', startedAt: Date.now() };
    dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
  }

  function handleSetPeriodDivision(periodIndex: number, nextDivision: number) {
    if (!gameId || !game || !config || !schedule) return;
    if (periodIndex < 0 || periodIndex >= periodDivisions.length) return;

    const safeDivision = Math.max(1, Math.min(6, Math.floor(nextDivision) || 1));
    if (safeDivision === periodDivisions[periodIndex]) return;

    if (isLive) {
      const range = getPeriodRange(periodDivisions, periodIndex);
      if (range?.start != null && range.start <= currentRotationIndex) {
        solver.setError(`Cannot change period ${periodIndex + 1}: it has already started.`);
        return;
      }
    }

    const result = redivideSchedulePeriod({
      schedule,
      players: activePlayers,
      periodDivisions,
      periodIndex,
      nextDivision: safeDivision,
    });

    if (!result.ok) {
      solver.setError(result.error);
      return;
    }

    dispatch({
      type: 'UPDATE_GAME',
      payload: {
        ...game,
        periodDivisions: result.periodDivisions,
      },
    });
    dispatch({ type: 'SET_GAME_SCHEDULE', payload: { gameId, schedule: result.schedule } });
    setSwapSource(null);
    setPendingSwap(null);
  }

  function handleAdvance() {
    if (!gameId) return;
    if (currentRotationIndex >= (schedule?.rotations.length ?? 0) - 1) {
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
    const updatedGame: Game = { ...game, status: 'completed', completedAt: Date.now() };
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
    runSolve({
      players: remainingPlayers,
      config,
      absentPlayerIds: [...game.absentPlayerIds, removingPlayerId, ...game.removedPlayerIds],
      goalieAssignments: game.goalieAssignments,
      manualOverrides: [],
      periodDivisions,
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
    runSolve({
      players: updatedPlayers,
      config,
      absentPlayerIds: [...game.absentPlayerIds, ...updatedRemoved],
      goalieAssignments: game.goalieAssignments,
      manualOverrides: [],
      periodDivisions,
      startFromRotation: game.currentRotationIndex,
      existingRotations: schedule.rotations,
    });
  }

  function handleRegenerate(policy: LiveRegenerateLockPolicy = liveRegeneratePolicy) {
    if (!roster || !config || !game) return;
    if (isLive && schedule) {
      setRegeneratePreviewBase(schedule);
      const manualOverrides = getManualOverridesForPolicy(policy);
      runSolve(
        {
          players: activePlayers,
          config,
          absentPlayerIds: [...game.absentPlayerIds, ...game.removedPlayerIds],
          goalieAssignments: game.goalieAssignments,
          manualOverrides,
          periodDivisions,
          startFromRotation: game.currentRotationIndex,
          existingRotations: schedule.rotations,
          allowConstraintRelaxation: true,
        },
        'preview-regenerate',
      );
    } else {
      setRegeneratePreviewBase(null);
      runSolve({
        players: roster.players,
        config,
        absentPlayerIds: game.absentPlayerIds,
        goalieAssignments: game.goalieAssignments,
        manualOverrides: game.manualOverrides,
        periodDivisions,
      });
    }
  }

  function handleOpenRegenerate() {
    if (isLive) {
      setLiveRegeneratePolicySelection(liveRegeneratePolicy);
      setLiveRegeneratePolicySheetOpen(true);
      return;
    }
    handleRegenerate();
  }

  function handleConfirmLiveRegenerate(policy: LiveRegenerateLockPolicy) {
    setLiveRegeneratePolicy(policy);
    setLiveRegeneratePolicySheetOpen(false);
    handleRegenerate(policy);
  }

  function handleApplyRegeneratePreview() {
    if (!gameId || !regeneratePreview) return;
    dispatch({ type: 'SET_GAME_SCHEDULE', payload: { gameId, schedule: regeneratePreview } });
    setSolverResultBehavior('apply');
    solverReset();
    setRegeneratePreviewBase(null);
  }

  function handleDismissRegeneratePreview() {
    setSolverResultBehavior('apply');
    solverReset();
    setRegeneratePreviewBase(null);
  }

  function handleRegenerateWithSettings(
    absentIds: PlayerId[],
    goalieAssignments: GoalieAssignment[],
  ) {
    if (!roster || !config || !game) return;
    const updatedGame: Game = { ...game, absentPlayerIds: absentIds, goalieAssignments };
    dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
    setRegeneratePreviewBase(null);
    if (isLive && schedule) {
      runSolve({
        players: roster.players,
        config,
        absentPlayerIds: [...absentIds, ...game.removedPlayerIds],
        goalieAssignments,
        manualOverrides: [],
        periodDivisions,
        startFromRotation: game.currentRotationIndex,
        existingRotations: schedule.rotations,
      });
      return;
    }
    runSolve({
      players: roster.players,
      config,
      absentPlayerIds: absentIds,
      goalieAssignments,
      manualOverrides: game.manualOverrides,
      periodDivisions,
    });
  }

  // --- Computed display values ---
  const removedPlayers = useMemo(
    () => roster?.players.filter((p) => game?.removedPlayerIds.includes(p.id)) ?? [],
    [roster, game?.removedPlayerIds],
  );
  const isLastRotation = currentRotationIndex >= (schedule?.rotations.length ?? 0) - 1;
  const manyRotations = (schedule?.rotations.length ?? 0) > 4;
  const isCrossingPeriod = nextRotation ? nextRotation.periodIndex !== currentPeriodIndex : false;
  const removingPlayer = removingPlayerId
    ? (playerMap.get(removingPlayerId) ?? roster?.players.find((p) => p.id === removingPlayerId))
    : undefined;

  const sortedPlayers = useMemo(
    () => [...activePlayers].sort((a, b) => b.skillRanking - a.skillRanking),
    [activePlayers],
  );
  const allDisplayPlayers = useMemo(
    () => [
      ...sortedPlayers,
      ...[...removedPlayers].sort((a, b) => b.skillRanking - a.skillRanking),
    ],
    [sortedPlayers, removedPlayers],
  );

  return {
    // Core data
    game,
    team,
    roster,
    config,
    schedule,
    isLive,
    isCompleted,
    currentRotationIndex,
    currentRotation,
    nextRotation,
    currentPeriodIndex,
    periodDivisions,
    // Derived
    periodGroups,
    changingPlayerIds,
    activePlayers,
    playerMap,
    subTooltipMap,
    sortedPlayers,
    allDisplayPlayers,
    removedPlayers,
    isLastRotation,
    manyRotations,
    isCrossingPeriod,
    removingPlayer,
    // Solver
    solver,
    regeneratePreview,
    regeneratePreviewBase,
    // Swap state
    swapSource,
    pendingSwap,
    setSwapSource,
    setPendingSwap,
    // UI state
    settingsOpen,
    setSettingsOpen,
    confirmEndGame,
    setConfirmEndGame,
    removingPlayerId,
    setRemovingPlayerId,
    viewMode,
    setViewMode,
    liveRegeneratePolicy,
    setLiveRegeneratePolicy,
    liveRegeneratePolicySelection,
    setLiveRegeneratePolicySelection,
    liveRegeneratePolicySheetOpen,
    setLiveRegeneratePolicySheetOpen,
    // Context
    dispatch,
    // Handlers
    handleCellClick,
    handleSwapThisRotation,
    handleSwapAllRemaining,
    handleStartGame,
    handleAdvance,
    handleRetreat,
    handleEndGame,
    handleSetPeriodDivision,
    handleConfirmRemovePlayer,
    handleAddPlayerBack,
    handleOpenRegenerate,
    handleConfirmLiveRegenerate,
    handleRegenerate,
    handleRegenerateWithSettings,
    handleApplyRegeneratePreview,
    handleDismissRegeneratePreview,
  };
}

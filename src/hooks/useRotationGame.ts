import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useSolver, type SolverInput } from '@/hooks/useSolver.ts';
import { previewSwap, previewSwapRange } from '@/utils/stats.ts';
import { redivideSchedulePeriod } from '@/utils/rotationDivision.ts';
import {
  normalizePeriodDivisions,
  getPeriodOffsets,
  getPeriodRange,
} from '@/utils/rotationLayout.ts';
import {
  getOptimizationOptionKey,
  normalizeOptimizationSuggestion,
  type OptimizationOption,
} from '@/utils/divisionOptimizer.ts';
import type { PositionContinuityPreference } from '@/types/solver.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type {
  PlayerId,
  Game,
  GoalieAssignment,
  RotationSchedule,
  ManualOverride,
} from '@/types/domain.ts';

export type LiveRegenerateLockPolicy = 'off' | 'hard-only' | 'hard+soft';

function buildRotationSlotMaps(rotations: RotationSchedule['rotations']) {
  const slotByIndex = new Map<number, string>();
  const rotationBySlot = new Map<string, (typeof rotations)[number]>();
  const rotationsByPeriod = new Map<number, (typeof rotations)[number][]>();
  const periodOrdinals = new Map<number, number>();

  for (const rotation of rotations) {
    const ordinal = periodOrdinals.get(rotation.periodIndex) ?? 0;
    const slotKey = `${rotation.periodIndex}:${ordinal}`;
    periodOrdinals.set(rotation.periodIndex, ordinal + 1);
    slotByIndex.set(rotation.index, slotKey);
    rotationBySlot.set(slotKey, rotation);
    const periodRotations = rotationsByPeriod.get(rotation.periodIndex) ?? [];
    periodRotations.push(rotation);
    rotationsByPeriod.set(rotation.periodIndex, periodRotations);
  }

  return { slotByIndex, rotationBySlot, rotationsByPeriod };
}

function parseSlotKey(slotKey: string): { periodIndex: number; ordinal: number } | null {
  const [periodText, ordinalText] = slotKey.split(':');
  const periodIndex = Number(periodText);
  const ordinal = Number(ordinalText);
  if (!Number.isInteger(periodIndex) || !Number.isInteger(ordinal) || ordinal < 0) return null;
  return { periodIndex, ordinal };
}

function mapOrdinal(previewOrdinal: number, previewCount: number, currentCount: number): number {
  if (currentCount <= 1 || previewCount <= 1) return 0;
  const ratio = (previewOrdinal * (currentCount - 1)) / (previewCount - 1);
  const mapped = Math.round(ratio);
  return Math.max(0, Math.min(currentCount - 1, mapped));
}

function resolveComparableCurrentRotation(
  slotKey: string,
  current: {
    rotationBySlot: Map<string, RotationSchedule['rotations'][number]>;
    rotationsByPeriod: Map<number, RotationSchedule['rotations'][number][]>;
  },
  preview: { rotationsByPeriod: Map<number, RotationSchedule['rotations'][number][]> },
): { rotation: RotationSchedule['rotations'][number]; ordinal: number } | null {
  const direct = current.rotationBySlot.get(slotKey);
  if (direct) {
    const parsed = parseSlotKey(slotKey);
    return parsed
      ? { rotation: direct, ordinal: parsed.ordinal }
      : { rotation: direct, ordinal: 0 };
  }

  const parsed = parseSlotKey(slotKey);
  if (!parsed) return null;
  const currentPeriodRotations = current.rotationsByPeriod.get(parsed.periodIndex);
  const previewPeriodRotations = preview.rotationsByPeriod.get(parsed.periodIndex);
  if (!currentPeriodRotations || currentPeriodRotations.length === 0) return null;
  if (!previewPeriodRotations || previewPeriodRotations.length === 0) return null;

  const mappedOrdinal = mapOrdinal(
    parsed.ordinal,
    previewPeriodRotations.length,
    currentPeriodRotations.length,
  );
  const mappedRotation = currentPeriodRotations[mappedOrdinal];
  if (!mappedRotation) return null;
  return { rotation: mappedRotation, ordinal: mappedOrdinal };
}

function hasPreviewCellChanges(
  currentSchedule: RotationSchedule,
  previewSchedule: RotationSchedule,
  startRotationIndex: number,
  usePositions: boolean,
): boolean {
  const currentMaps = buildRotationSlotMaps(currentSchedule.rotations);
  const previewMaps = buildRotationSlotMaps(previewSchedule.rotations);
  const coveredCurrentOrdinalsByPeriod = new Map<number, Set<number>>();

  for (const previewRotation of previewSchedule.rotations) {
    if (previewRotation.index < startRotationIndex) continue;
    const slotKey = previewMaps.slotByIndex.get(previewRotation.index);
    if (!slotKey) return true;
    const comparable = resolveComparableCurrentRotation(slotKey, currentMaps, previewMaps);
    if (!comparable) return true;
    const currentRotation = comparable.rotation;
    const parsedSlot = parseSlotKey(slotKey);
    if (parsedSlot) {
      const coveredOrdinals =
        coveredCurrentOrdinalsByPeriod.get(parsedSlot.periodIndex) ?? new Set();
      coveredOrdinals.add(comparable.ordinal);
      coveredCurrentOrdinalsByPeriod.set(parsedSlot.periodIndex, coveredOrdinals);
    }

    const playerIds = new Set([
      ...Object.keys(previewRotation.assignments),
      ...Object.keys(currentRotation.assignments),
    ]);

    for (const playerId of playerIds) {
      const previewAssignment = previewRotation.assignments[playerId] ?? RotationAssignment.Bench;
      const currentAssignment = currentRotation.assignments[playerId] ?? RotationAssignment.Bench;
      if (previewAssignment !== currentAssignment) return true;
      if (!usePositions) continue;
      if (
        previewAssignment !== RotationAssignment.Field ||
        currentAssignment !== RotationAssignment.Field
      ) {
        continue;
      }
      const previewFieldPos = previewRotation.fieldPositions?.[playerId];
      const currentFieldPos = currentRotation.fieldPositions?.[playerId];
      if (previewFieldPos !== currentFieldPos) return true;
    }
  }

  for (const [periodIndex, currentPeriodRotations] of currentMaps.rotationsByPeriod.entries()) {
    const coveredOrdinals = coveredCurrentOrdinalsByPeriod.get(periodIndex) ?? new Set<number>();
    for (let ordinal = 0; ordinal < currentPeriodRotations.length; ordinal++) {
      const currentRotation = currentPeriodRotations[ordinal];
      if (currentRotation.index < startRotationIndex) continue;
      if (!coveredOrdinals.has(ordinal)) return true;
    }
  }

  return false;
}

function remapOverridesForPeriodDivisions(
  overrides: ManualOverride[],
  currentSchedule: RotationSchedule,
  targetPeriodDivisions: number[],
): ManualOverride[] {
  if (overrides.length === 0) return overrides;
  const currentMaps = buildRotationSlotMaps(currentSchedule.rotations);
  const targetOffsets = getPeriodOffsets(targetPeriodDivisions);

  return overrides.map((override) => {
    const slotKey = currentMaps.slotByIndex.get(override.rotationIndex);
    if (!slotKey) return override;

    const parsedSlot = parseSlotKey(slotKey);
    if (!parsedSlot) return override;

    const currentPeriodRotations = currentMaps.rotationsByPeriod.get(parsedSlot.periodIndex);
    const currentCount = currentPeriodRotations?.length ?? 1;
    const targetCount = Math.max(1, Math.floor(targetPeriodDivisions[parsedSlot.periodIndex] ?? 1));
    const targetStart = targetOffsets[parsedSlot.periodIndex];
    if (targetStart == null) return override;

    return {
      ...override,
      rotationIndex: targetStart + mapOrdinal(parsedSlot.ordinal, currentCount, targetCount),
    };
  });
}

function buildPositionContinuityPreferencesForPeriodDivisions(
  currentSchedule: RotationSchedule,
  targetPeriodDivisions: number[],
  startRotationIndex: number,
): PositionContinuityPreference[] {
  const currentMaps = buildRotationSlotMaps(currentSchedule.rotations);
  const targetOffsets = getPeriodOffsets(targetPeriodDivisions);
  const preferences = new Map<string, PositionContinuityPreference>();

  for (let periodIndex = 0; periodIndex < targetPeriodDivisions.length; periodIndex++) {
    const currentPeriodRotations = currentMaps.rotationsByPeriod.get(periodIndex);
    if (!currentPeriodRotations || currentPeriodRotations.length === 0) continue;
    const targetCount = Math.max(1, Math.floor(targetPeriodDivisions[periodIndex] ?? 1));
    const targetStart = targetOffsets[periodIndex];
    if (targetStart == null) continue;

    for (let targetOrdinal = 0; targetOrdinal < targetCount; targetOrdinal++) {
      const targetRotationIndex = targetStart + targetOrdinal;
      if (targetRotationIndex < startRotationIndex) continue;
      const sourceOrdinal = mapOrdinal(targetOrdinal, targetCount, currentPeriodRotations.length);
      const sourceRotation = currentPeriodRotations[sourceOrdinal];
      if (!sourceRotation) continue;

      for (const [playerId, assignment] of Object.entries(sourceRotation.assignments)) {
        if (assignment !== RotationAssignment.Field) continue;
        const fieldPosition = sourceRotation.fieldPositions?.[playerId];
        if (!fieldPosition) continue;
        const key = `${playerId}:${targetRotationIndex}`;
        if (preferences.has(key)) continue;
        preferences.set(key, {
          playerId,
          rotationIndex: targetRotationIndex,
          fieldPosition,
        });
      }
    }
  }

  return [...preferences.values()];
}

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

  const divisionsModified = useMemo(() => {
    if (!config) return false;
    return periodDivisions.some((d) => d !== config.rotationsPerPeriod);
  }, [periodDivisions, config]);

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

  // --- Optimization state ---
  const [pendingOptimizeOption, setPendingOptimizeOption] = useState<OptimizationOption | null>(
    null,
  );
  const [optimizeSheetOpen, setOptimizeSheetOpen] = useState(false);
  const [selectedOptimizeOptionKey, setSelectedOptimizeOptionKey] = useState<string | null>(null);
  const [optimizeAttemptError, setOptimizeAttemptError] = useState<string | null>(null);
  const [failedOptimizeOptionKeys, setFailedOptimizeOptionKeys] = useState<string[]>([]);
  // Track which generatedAt the banner was dismissed for — auto-resets on new schedule
  const [dismissedForGeneratedAt, setDismissedForGeneratedAt] = useState<number | null>(null);
  const optimizeBannerDismissed = dismissedForGeneratedAt === schedule?.generatedAt;
  const setOptimizeBannerDismissed = (dismissed: boolean) => {
    setDismissedForGeneratedAt(dismissed ? (schedule?.generatedAt ?? null) : null);
  };

  // Read from persisted game state (survives navigation), with solver as live override.
  const optimizationSuggestion = useMemo(
    () =>
      normalizeOptimizationSuggestion(
        solver.suggestion ?? game?.optimizationSuggestion ?? null,
        periodDivisions,
      ),
    [solver.suggestion, game?.optimizationSuggestion, periodDivisions],
  );

  const resolvedSelectedOptimizeOptionKey = useMemo(() => {
    if (!optimizationSuggestion || optimizationSuggestion.options.length === 0) return null;

    if (
      selectedOptimizeOptionKey &&
      !failedOptimizeOptionKeys.includes(selectedOptimizeOptionKey) &&
      optimizationSuggestion.options.some(
        (option) => getOptimizationOptionKey(option.periodDivisions) === selectedOptimizeOptionKey,
      )
    ) {
      return selectedOptimizeOptionKey;
    }

    const firstOption =
      optimizationSuggestion.options.find(
        (option) =>
          !failedOptimizeOptionKeys.includes(getOptimizationOptionKey(option.periodDivisions)),
      ) ?? optimizationSuggestion.options[0];

    return firstOption ? getOptimizationOptionKey(firstOption.periodDivisions) : null;
  }, [optimizationSuggestion, selectedOptimizeOptionKey, failedOptimizeOptionKeys]);

  const selectedOptimizationOption = useMemo(() => {
    if (!optimizationSuggestion || !resolvedSelectedOptimizeOptionKey) return null;
    return (
      optimizationSuggestion.options.find(
        (option) =>
          getOptimizationOptionKey(option.periodDivisions) === resolvedSelectedOptimizeOptionKey,
      ) ?? null
    );
  }, [optimizationSuggestion, resolvedSelectedOptimizeOptionKey]);

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
  const solverSuggestion = solver.suggestion;
  const solverReset = solver.reset;
  useEffect(() => {
    if (solverResult && gameId) {
      if (solverResultBehavior === 'apply') {
        dispatch({
          type: 'SET_GAME_SCHEDULE',
          payload: { gameId, schedule: solverResult, optimizationSuggestion: solverSuggestion },
        });
        solverReset();
      }
    }
  }, [solverResult, solverSuggestion, gameId, dispatch, solverReset, solverResultBehavior]);

  useEffect(() => {
    if (!solverResult || !gameId) return;
    if (solverResultBehavior !== 'preview-regenerate') return;
    if (!regeneratePreviewBase) return;
    if (
      hasPreviewCellChanges(
        regeneratePreviewBase,
        solverResult,
        currentRotationIndex,
        config?.usePositions ?? false,
      )
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (pendingOptimizeOption) {
        dispatch({
          type: 'APPLY_OPTIMIZED_SCHEDULE',
          payload: {
            gameId,
            schedule: solverResult,
            periodDivisions: pendingOptimizeOption.periodDivisions,
            clearFutureOverridesFrom: isLive ? currentRotationIndex : 0,
          },
        });
        setPendingOptimizeOption(null);
        setFailedOptimizeOptionKeys([]);
        setOptimizeAttemptError(null);
      }

      setSolverResultBehavior('apply');
      solverReset();
      setRegeneratePreviewBase(null);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [
    solverResult,
    gameId,
    solverResultBehavior,
    regeneratePreviewBase,
    currentRotationIndex,
    config?.usePositions,
    pendingOptimizeOption,
    dispatch,
    isLive,
    solverReset,
  ]);

  useEffect(() => {
    if (!solver.error) return;
    if (solverResultBehavior !== 'preview-regenerate') return;
    if (!pendingOptimizeOption) return;

    const optionKey = getOptimizationOptionKey(pendingOptimizeOption.periodDivisions);
    const timeoutId = setTimeout(() => {
      setFailedOptimizeOptionKeys((prev) =>
        prev.includes(optionKey) ? prev : [...prev, optionKey],
      );
      setOptimizeAttemptError(solver.error);
      setPendingOptimizeOption(null);
      setRegeneratePreviewBase(null);
      setSolverResultBehavior('apply');
      setOptimizeSheetOpen(true);
      solverReset();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [solver.error, solverResultBehavior, pendingOptimizeOption, solverReset]);

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

  function getHardManualOverrides() {
    if (!game) return [];
    return game.manualOverrides.filter((override) => override.lockMode === 'hard');
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

  function handleOptimizeDivisions() {
    if (!optimizationSuggestion || optimizationSuggestion.options.length === 0) return;
    setFailedOptimizeOptionKeys([]);
    setSelectedOptimizeOptionKey(null);
    setPendingOptimizeOption(null);
    setOptimizeAttemptError(null);
    setOptimizeSheetOpen(true);
  }

  function handleSelectOptimizeOption(optionKey: string) {
    setSelectedOptimizeOptionKey(optionKey);
    setOptimizeAttemptError(null);
  }

  function handleRunOptimizePreview() {
    if (!roster || !config || !game || !schedule || !selectedOptimizationOption) return;

    const selectedDivisions = selectedOptimizationOption.periodDivisions;
    const hardManualOverrides = getHardManualOverrides();
    const positionContinuityPreferences = config.usePositions
      ? buildPositionContinuityPreferencesForPeriodDivisions(
          schedule,
          selectedDivisions,
          isLive ? currentRotationIndex : 0,
        )
      : [];
    const remappedHardManualOverrides = remapOverridesForPeriodDivisions(
      hardManualOverrides,
      schedule,
      selectedDivisions,
    );
    setPendingOptimizeOption(selectedOptimizationOption);
    setRegeneratePreviewBase(schedule);
    setOptimizeSheetOpen(false);
    setOptimizeAttemptError(null);

    if (isLive) {
      runSolve(
        {
          players: activePlayers,
          config,
          absentPlayerIds: [...game.absentPlayerIds, ...game.removedPlayerIds],
          goalieAssignments: game.goalieAssignments,
          manualOverrides: remappedHardManualOverrides,
          positionContinuityPreferences,
          periodDivisions: selectedDivisions,
          startFromRotation: game.currentRotationIndex,
          existingRotations: schedule.rotations,
          skipOptimizationCheck: true,
          allowConstraintRelaxation: true,
        },
        'preview-regenerate',
      );
    } else {
      runSolve(
        {
          players: activePlayers,
          config,
          absentPlayerIds: game.absentPlayerIds,
          goalieAssignments: game.goalieAssignments,
          manualOverrides: remappedHardManualOverrides,
          positionContinuityPreferences,
          periodDivisions: selectedDivisions,
          skipOptimizationCheck: true,
          allowConstraintRelaxation: true,
        },
        'preview-regenerate',
      );
    }
  }

  function handleApplyRegeneratePreview() {
    if (!gameId || !regeneratePreview) return;

    if (pendingOptimizeOption) {
      // Atomic apply: schedule + periodDivisions + clear future overrides
      dispatch({
        type: 'APPLY_OPTIMIZED_SCHEDULE',
        payload: {
          gameId,
          schedule: regeneratePreview,
          periodDivisions: pendingOptimizeOption.periodDivisions,
          clearFutureOverridesFrom: isLive ? currentRotationIndex : 0,
        },
      });
      setPendingOptimizeOption(null);
      setFailedOptimizeOptionKeys([]);
      setOptimizeAttemptError(null);
    } else {
      dispatch({ type: 'SET_GAME_SCHEDULE', payload: { gameId, schedule: regeneratePreview } });
    }

    setSolverResultBehavior('apply');
    solverReset();
    setRegeneratePreviewBase(null);
  }

  function handleDismissRegeneratePreview() {
    setSolverResultBehavior('apply');
    solverReset();
    setRegeneratePreviewBase(null);
    setPendingOptimizeOption(null);
    setOptimizeAttemptError(null);
  }

  function handleResetDivisions() {
    if (!gameId || !game || !config || !roster) return;
    const defaultDivisions = Array(config.periods).fill(config.rotationsPerPeriod) as number[];
    dispatch({
      type: 'UPDATE_GAME',
      payload: {
        ...game,
        periodDivisions: defaultDivisions,
        manualOverrides: [],
        optimizationSuggestion: undefined,
      },
    });
    // Inline the solve with defaultDivisions — can't rely on handleRegenerate()
    // because the periodDivisions memo still holds the old value in this render.
    setRegeneratePreviewBase(null);
    runSolve({
      players: roster.players,
      config,
      absentPlayerIds: game.absentPlayerIds,
      goalieAssignments: game.goalieAssignments,
      manualOverrides: [],
      periodDivisions: defaultDivisions,
    });
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
    divisionsModified,
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
    // Optimization
    optimizationSuggestion,
    optimizeBannerDismissed,
    setOptimizeBannerDismissed,
    optimizeSheetOpen,
    setOptimizeSheetOpen,
    selectedOptimizeOptionKey: resolvedSelectedOptimizeOptionKey,
    failedOptimizeOptionKeys,
    optimizeAttemptError,
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
    handleResetDivisions,
    handleRegenerateWithSettings,
    handleApplyRegeneratePreview,
    handleDismissRegeneratePreview,
    handleOptimizeDivisions,
    handleSelectOptimizeOption,
    handleRunOptimizePreview,
  };
}

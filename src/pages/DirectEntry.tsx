import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.tsx';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { SolverStatusCard } from '@/components/game/SolverStatusCard.tsx';
import { DirectEntryMatrix } from '@/components/game/DirectEntryMatrix.tsx';
import { DirectEntryCellPickerSheet } from '@/components/game/DirectEntryCellPickerSheet.tsx';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useSolver } from '@/hooks/useSolver.ts';
import {
  normalizePeriodDivisions,
  getTotalRotationsFromDivisions,
} from '@/utils/rotationLayout.ts';
import {
  buildDirectEntrySlots,
  compileDirectEntryOverrides,
  makeDirectEntryCellKey,
  type DirectEntryDraft,
  type DirectEntrySlot,
} from '@/utils/directEntry.ts';
import type { ManualOverride, PlayerId } from '@/types/domain.ts';

interface PickerTarget {
  rotationIndex: number;
  slot: DirectEntrySlot;
}

export function DirectEntry() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const solver = useSolver();
  const { t } = useTranslation('game');
  const { t: tCommon } = useTranslation('common');

  const [draft, setDraft] = useState<DirectEntryDraft>({});
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [currentRotationIndex, setCurrentRotationIndex] = useState(0);
  const [entryErrors, setEntryErrors] = useState<string[]>([]);
  const pendingOverridesRef = useRef<ManualOverride[] | null>(null);
  const processedSolverResultRef = useRef<unknown>(null);

  const game = gameId ? state.games[gameId] : undefined;
  const team = game ? state.teams[game.teamId] : undefined;
  const roster = team?.rosters.find((r) => r.id === game?.rosterId);
  const config = team?.gameConfigs.find((c) => c.id === game?.gameConfigId);

  const activePlayers = useMemo(() => {
    if (!game || !roster) return [];
    return roster.players.filter(
      (player) =>
        !game.absentPlayerIds.includes(player.id) && !game.removedPlayerIds.includes(player.id),
    );
  }, [game, roster]);

  const playerNameById = useMemo(
    () => new Map(activePlayers.map((player) => [player.id, player.name])),
    [activePlayers],
  );

  const sortedPlayers = useMemo(
    () => [...activePlayers].sort((a, b) => b.skillRanking - a.skillRanking),
    [activePlayers],
  );

  const periodDivisions = useMemo(() => {
    if (!config) return [];
    return normalizePeriodDivisions(
      game?.periodDivisions,
      config.periods,
      config.rotationsPerPeriod,
    );
  }, [config, game?.periodDivisions]);

  const totalRotations = useMemo(
    () => getTotalRotationsFromDivisions(periodDivisions),
    [periodDivisions],
  );

  const slots = useMemo(() => {
    if (!config) return [];
    return buildDirectEntrySlots(config);
  }, [config]);

  useEffect(() => {
    if (!solver.result || !gameId) return;
    if (processedSolverResultRef.current === solver.result) return;
    processedSolverResultRef.current = solver.result;

    const currentGame = state.games[gameId];
    if (!currentGame) return;
    const pendingOverrides = pendingOverridesRef.current ?? currentGame.manualOverrides;

    dispatch({
      type: 'UPDATE_GAME',
      payload: {
        ...currentGame,
        manualOverrides: pendingOverrides,
      },
    });
    dispatch({
      type: 'SET_GAME_SCHEDULE',
      payload: { gameId, schedule: solver.result, optimizationSuggestion: solver.suggestion },
    });
    pendingOverridesRef.current = null;
    solver.reset();
    navigate(`/games/${gameId}/rotations`, { replace: true });
  }, [solver, solver.result, gameId, state.games, dispatch, navigate]);

  const upsertCell = useCallback(
    (rotationIndex: number, slotId: string, playerId: PlayerId | null) => {
      const key = makeDirectEntryCellKey(rotationIndex, slotId);
      setDraft((prev) => {
        const next = { ...prev };
        if (!playerId) {
          delete next[key];
          return next;
        }
        next[key] = {
          playerId,
          lockMode: prev[key]?.lockMode ?? 'hard',
        };
        return next;
      });
    },
    [],
  );

  const handleToggleCellLock = useCallback((rotationIndex: number, slotId: string) => {
    const key = makeDirectEntryCellKey(rotationIndex, slotId);
    setDraft((prev) => {
      const existing = prev[key];
      if (!existing?.playerId) return prev;
      return {
        ...prev,
        [key]: {
          ...existing,
          lockMode: existing.lockMode === 'hard' ? 'soft' : 'hard',
        },
      };
    });
  }, []);

  const handleSelectCell = useCallback((rotationIndex: number, slot: DirectEntrySlot) => {
    setPickerTarget({ rotationIndex, slot });
  }, []);

  function handleLockAll(mode: 'hard' | 'soft') {
    setDraft((prev) => {
      const next: DirectEntryDraft = {};
      for (const [key, cell] of Object.entries(prev)) {
        next[key] = cell.playerId ? { ...cell, lockMode: mode } : cell;
      }
      return next;
    });
  }

  function handleClearRotation(rotationIndex: number) {
    setDraft((prev) => {
      const next: DirectEntryDraft = {};
      for (const [key, cell] of Object.entries(prev)) {
        if (!key.startsWith(`${rotationIndex}:`)) {
          next[key] = cell;
        }
      }
      return next;
    });
  }

  function handleCopyPreviousRotation(rotationIndex: number) {
    if (rotationIndex <= 0) return;
    setDraft((prev) => {
      const next = { ...prev };
      for (const slot of slots) {
        const prevKey = makeDirectEntryCellKey(rotationIndex - 1, slot.id);
        const targetKey = makeDirectEntryCellKey(rotationIndex, slot.id);
        const prevCell = prev[prevKey];
        if (prevCell?.playerId) {
          next[targetKey] = { ...prevCell };
        } else {
          delete next[targetKey];
        }
      }
      return next;
    });
  }

  function handleAutofill() {
    const compiled = compileDirectEntryOverrides({
      slots,
      totalRotations,
      draft,
      players: activePlayers,
    });

    if (compiled.errors.length > 0) {
      setEntryErrors(compiled.errors);
      return;
    }

    setEntryErrors([]);
    pendingOverridesRef.current = compiled.overrides;

    solver.solve({
      players: roster!.players,
      config: config!,
      absentPlayerIds: game!.absentPlayerIds,
      goalieAssignments: game!.goalieAssignments,
      manualOverrides: compiled.overrides,
      periodDivisions,
    });
  }

  if (!game || !team || !roster || !config) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">{t('error.not_found')}</p>
        <Link to="/games" className="text-primary underline mt-2 inline-block">
          {t('error.back_to_games')}
        </Link>
      </div>
    );
  }

  if (game.status !== 'setup') {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">{t('direct_entry.setup_only')}</p>
        <Link
          to={`/games/${game.id}/rotations`}
          className="text-primary underline mt-2 inline-block"
        >
          {t('live.grid_view')}
        </Link>
      </div>
    );
  }

  const selectedCell = pickerTarget
    ? draft[makeDirectEntryCellKey(pickerTarget.rotationIndex, pickerTarget.slot.id)]
    : undefined;

  return (
    <div>
      <NavBar
        title={t('direct_entry.title')}
        backTo={`/games/${game.id}/rotations`}
        backLabel={tCommon('nav.game')}
      />

      <div className="max-w-5xl mx-auto px-4 pt-4 space-y-6">
        <GroupedList header={t('direct_entry.summary')}>
          <GroupedListRow>
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span className="text-ios-body">{t('setup.team')}</span>
              <span className="text-ios-subheadline text-muted-foreground">{team.name}</span>
            </div>
          </GroupedListRow>
          <GroupedListRow>
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span className="text-ios-body">{t('setup.roster')}</span>
              <span className="text-ios-subheadline text-muted-foreground">{roster.name}</span>
            </div>
          </GroupedListRow>
          <GroupedListRow>
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span className="text-ios-body">{t('setup.game_config')}</span>
              <span className="text-ios-subheadline text-muted-foreground">{config.name}</span>
            </div>
          </GroupedListRow>
          <GroupedListRow last>
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span className="text-ios-body">{t('direct_entry.entered_locks')}</span>
              <span className="text-ios-subheadline text-muted-foreground">
                {
                  Object.values(draft).filter((cell) => cell.playerId && cell.lockMode === 'hard')
                    .length
                }{' '}
                / {Object.values(draft).filter((cell) => cell.playerId).length}
              </span>
            </div>
          </GroupedListRow>
        </GroupedList>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleLockAll('hard')}>
            {t('direct_entry.lock_all')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleLockAll('soft')}>
            {t('direct_entry.soften_all')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => handleClearRotation(currentRotationIndex)}
          >
            {t('direct_entry.clear_rotation')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            disabled={currentRotationIndex === 0}
            onClick={() => handleCopyPreviousRotation(currentRotationIndex)}
          >
            {t('direct_entry.copy_previous_rotation')}
          </Button>
        </div>

        <p className="text-ios-footnote text-muted-foreground">{t('direct_entry.lock_help')}</p>

        <DirectEntryMatrix
          slots={slots}
          totalRotations={totalRotations}
          draft={draft}
          playerNameById={playerNameById}
          currentRotationIndex={currentRotationIndex}
          onChangeRotation={setCurrentRotationIndex}
          onSelectCell={handleSelectCell}
          onToggleCellLock={handleToggleCellLock}
        />

        {entryErrors.length > 0 && (
          <div className="bg-destructive/10 rounded-[10px] px-4 py-3">
            {entryErrors.map((error, idx) => (
              <p key={`${error}-${idx}`} className="text-ios-footnote text-destructive">
                {error}
              </p>
            ))}
          </div>
        )}

        <SolverStatusCard
          isRunning={solver.isRunning}
          progress={solver.progress}
          message={solver.message}
          error={solver.error}
          onCancel={solver.cancel}
        />

        <Button
          size="lg"
          disabled={solver.isRunning || pickerTarget != null}
          onClick={handleAutofill}
        >
          {solver.isRunning ? t('live.solving') : t('direct_entry.autofill_blanks')}
        </Button>
      </div>

      {pickerTarget && (
        <DirectEntryCellPickerSheet
          open
          title={t('direct_entry.pick_player_for_slot', {
            slot: pickerTarget.slot.label,
            rotation: pickerTarget.rotationIndex + 1,
          })}
          players={sortedPlayers}
          selectedPlayerId={selectedCell?.playerId ?? null}
          onOpenChange={(open) => {
            if (!open) setPickerTarget(null);
          }}
          onSelectPlayer={(playerId) => {
            upsertCell(pickerTarget.rotationIndex, pickerTarget.slot.id, playerId);
            setPickerTarget(null);
          }}
          onClear={() => {
            upsertCell(pickerTarget.rotationIndex, pickerTarget.slot.id, null);
            setPickerTarget(null);
          }}
        />
      )}
    </div>
  );
}

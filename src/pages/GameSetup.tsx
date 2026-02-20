import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useSolver } from '@/hooks/useSolver.ts';
import { Button } from '@/components/ui/button.tsx';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { SolverStatusCard } from '@/components/game/SolverStatusCard.tsx';
import { AttendanceList } from '@/components/game/AttendanceList.tsx';
import { GoalieAssignmentSelector } from '@/components/game/GoalieAssignmentSelector.tsx';
import { Input } from '@/components/ui/input.tsx';
import { generateId } from '@/utils/id.ts';
import { validateGoalieAssignments, validateRosterForGame } from '@/utils/validation.ts';
import { createConfigFromTemplate } from '@/utils/gameConfig.ts';
import { GAME_CONFIG_TEMPLATES } from '@/types/domain.ts';
import type { Game, GoalieAssignment, PlayerId } from '@/types/domain.ts';

export function GameSetup() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const solver = useSolver();
  const { t } = useTranslation('game');
  const { t: tCommon } = useTranslation('common');

  const preselectedTeamId = searchParams.get('teamId') ?? '';
  const pendingGameIdRef = useRef<string | null>(null);

  const [teamId, setTeamId] = useState(preselectedTeamId);
  const [rosterId, setRosterId] = useState('');
  const [configId, setConfigId] = useState('');
  const [gameName, setGameName] = useState('');
  const [absentPlayerIds, setAbsentPlayerIds] = useState<Set<PlayerId>>(new Set());
  const [goalieAssignments, setGoalieAssignments] = useState<GoalieAssignment[]>([]);
  const [isTeamPickerOpen, setIsTeamPickerOpen] = useState(false);
  const [isRosterPickerOpen, setIsRosterPickerOpen] = useState(false);
  const [isConfigPickerOpen, setIsConfigPickerOpen] = useState(false);

  const teams = Object.values(state.teams);
  const selectedTeam = teamId ? state.teams[teamId] : undefined;
  const selectedRoster = selectedTeam?.rosters.find((r) => r.id === rosterId);
  const selectedConfig = selectedTeam?.gameConfigs.find((c) => c.id === configId);

  const activePlayers = useMemo(
    () => selectedRoster?.players.filter((p) => !absentPlayerIds.has(p.id)) ?? [],
    [selectedRoster, absentPlayerIds],
  );

  const validationErrors = useMemo(() => {
    if (!selectedRoster || !selectedConfig) return [];
    const rosterErrors = validateRosterForGame(selectedRoster.players, selectedConfig, [
      ...absentPlayerIds,
    ]);
    const goalieErrors = validateGoalieAssignments(
      activePlayers,
      selectedConfig,
      goalieAssignments,
    );
    return [...rosterErrors, ...goalieErrors];
  }, [selectedRoster, selectedConfig, absentPlayerIds, activePlayers, goalieAssignments]);

  const canGenerate =
    selectedTeam &&
    selectedRoster &&
    selectedConfig &&
    validationErrors.filter((e) => !e.includes('no substitutions')).length === 0;

  const summaryValues = useMemo(() => {
    if (!selectedRoster || !selectedConfig) return null;
    return {
      players: activePlayers.length,
      fieldSize: selectedConfig.fieldSize,
      rotations: selectedConfig.periods * selectedConfig.rotationsPerPeriod,
      bench: Math.max(0, activePlayers.length - selectedConfig.fieldSize),
    };
  }, [selectedRoster, selectedConfig, activePlayers]);

  function handleToggleAbsent(playerId: PlayerId) {
    setAbsentPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  }

  function handleGoalieChange(periodIndex: number, playerId: string) {
    setGoalieAssignments((prev) => {
      const filtered = prev.filter((a) => a.periodIndex !== periodIndex);
      return [...filtered, { periodIndex, playerId: playerId as PlayerId | 'auto' }];
    });
  }

  function handleGenerate() {
    if (!selectedRoster || !selectedConfig || !teamId) return;

    const gameId = generateId();
    const effectiveGoalieAssignments = selectedConfig.useGoalie ? goalieAssignments : [];

    const game: Game = {
      id: gameId,
      teamId,
      rosterId,
      gameConfigId: configId,
      name: gameName.trim() || `Game ${new Date().toLocaleDateString()}`,
      status: 'setup',
      absentPlayerIds: [...absentPlayerIds],
      goalieAssignments: effectiveGoalieAssignments,
      manualOverrides: [],
      schedule: null,
      currentRotationIndex: 0,
      removedPlayerIds: [],
      addedPlayerIds: [],
      periodTimerStartedAt: null,
      periodTimerPausedElapsed: 0,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    };

    dispatch({ type: 'CREATE_GAME', payload: game });

    pendingGameIdRef.current = gameId;

    solver.solve({
      players: selectedRoster.players,
      config: selectedConfig,
      absentPlayerIds: [...absentPlayerIds],
      goalieAssignments: effectiveGoalieAssignments,
      manualOverrides: [],
    });
  }

  function autoSelectForTeam(nextTeamId: string) {
    const team = state.teams[nextTeamId];
    if (!team) {
      setRosterId('');
      setConfigId('');
      return;
    }

    // Try to reuse roster/config from the most recent game for this team
    const lastGame = Object.values(state.games)
      .filter((g) => g.teamId === nextTeamId)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    const lastRosterExists = lastGame && team.rosters.some((r) => r.id === lastGame.rosterId);
    const lastConfigExists =
      lastGame && team.gameConfigs.some((c) => c.id === lastGame.gameConfigId);

    setRosterId(lastRosterExists ? lastGame.rosterId : (team.rosters[0]?.id ?? ''));
    setConfigId(lastConfigExists ? lastGame.gameConfigId : (team.gameConfigs[0]?.id ?? ''));
  }

  function handleSelectTeam(nextTeamId: string) {
    setTeamId(nextTeamId);
    setIsTeamPickerOpen(false);
    autoSelectForTeam(nextTeamId);
  }

  function handleSelectRoster(nextRosterId: string) {
    setRosterId(nextRosterId);
    setIsRosterPickerOpen(false);
  }

  function handleSelectConfig(nextConfigId: string) {
    setConfigId(nextConfigId);
    setIsConfigPickerOpen(false);
  }

  // Auto-select roster/config when team is preselected via URL params
  useEffect(() => {
    if (preselectedTeamId) {
      autoSelectForTeam(preselectedTeamId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate when solver completes
  useEffect(() => {
    const gameId = pendingGameIdRef.current;
    if (!gameId) return;

    if (solver.result) {
      dispatch({
        type: 'SET_GAME_SCHEDULE',
        payload: { gameId, schedule: solver.result },
      });
      pendingGameIdRef.current = null;
      navigate(`/games/${gameId}/rotations`);
    }

    if (solver.error) {
      pendingGameIdRef.current = null;
    }
  }, [solver.result, solver.error, dispatch, navigate]);

  return (
    <div>
      <NavBar title={t('setup.title')} backTo="/games" backLabel={tCommon('nav.games')} />

      <div className="max-w-4xl mx-auto px-4 space-y-6 pt-4">
        {/* Step 1: Team & Configuration */}
        <GroupedList header={t('setup.team_and_config')}>
          <GroupedListRow onClick={() => setIsTeamPickerOpen(true)} chevron>
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span className="text-ios-body">{t('setup.team')}</span>
              <span className="text-ios-subheadline text-muted-foreground truncate">
                {selectedTeam?.name ?? t('setup.select')}
              </span>
            </div>
          </GroupedListRow>

          <GroupedListRow
            onClick={selectedTeam ? () => setIsRosterPickerOpen(true) : undefined}
            chevron={!!selectedTeam}
          >
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span className="text-ios-body">{t('setup.roster')}</span>
              <span className="text-ios-subheadline text-muted-foreground truncate">
                {!selectedTeam
                  ? t('setup.choose_team_first')
                  : (selectedRoster?.name ??
                    (selectedTeam.rosters.length === 0
                      ? t('setup.no_rosters')
                      : t('setup.select')))}
              </span>
            </div>
          </GroupedListRow>

          <GroupedListRow
            onClick={selectedTeam ? () => setIsConfigPickerOpen(true) : undefined}
            chevron={!!selectedTeam}
          >
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span className="text-ios-body">{t('setup.game_config')}</span>
              <span className="text-ios-subheadline text-muted-foreground truncate">
                {!selectedTeam
                  ? t('setup.choose_team_first')
                  : (selectedConfig?.name ??
                    (selectedTeam.gameConfigs.length === 0
                      ? t('setup.no_configs')
                      : t('setup.select')))}
              </span>
            </div>
          </GroupedListRow>

          <GroupedListRow last>
            <div className="flex w-full items-center justify-between gap-3 py-1">
              <label htmlFor="game-name" className="text-ios-body">
                {t('setup.game_name')}
              </label>
              <Input
                id="game-name"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder={t('setup.game_name_placeholder')}
                className="w-44 border-none bg-transparent px-0 py-0 text-right shadow-none focus-visible:ring-0"
              />
            </div>
          </GroupedListRow>

          {summaryValues && (
            <div className="px-4 py-2 text-ios-footnote text-muted-foreground border-t border-border/50">
              {t('setup.summary', summaryValues)}
            </div>
          )}
        </GroupedList>

        {/* Step 2: Attendance */}
        {selectedRoster && (
          <GroupedList
            header={t('setup.attendance', {
              present: activePlayers.length,
              total: selectedRoster.players.length,
            })}
          >
            <GroupedListRow last>
              <AttendanceList
                players={selectedRoster.players}
                absentIds={absentPlayerIds}
                onToggle={handleToggleAbsent}
              />
            </GroupedListRow>
          </GroupedList>
        )}

        {/* Step 3: Goalie Assignment */}
        {selectedConfig?.useGoalie !== false && selectedConfig && activePlayers.length > 0 && (
          <GroupedList header={t('setup.goalie_assignment')}>
            <GroupedListRow last>
              <GoalieAssignmentSelector
                periods={selectedConfig.periods}
                goalieAssignments={goalieAssignments}
                eligiblePlayers={activePlayers.filter((p) => p.canPlayGoalie)}
                onChange={handleGoalieChange}
              />
            </GroupedListRow>
          </GroupedList>
        )}

        {/* Validation */}
        {validationErrors.length > 0 && (
          <div className="bg-destructive/10 rounded-[10px] px-4 py-3">
            {validationErrors.map((error, i) => (
              <p key={i} className="text-ios-footnote text-destructive">
                {error}
              </p>
            ))}
          </div>
        )}

        {/* Solver status */}
        <SolverStatusCard
          isRunning={solver.isRunning}
          progress={solver.progress}
          message={solver.message}
          error={solver.error}
        />

        {/* CTA */}
        <Button size="lg" disabled={!canGenerate || solver.isRunning} onClick={handleGenerate}>
          {solver.isRunning ? t('setup.generating') : t('setup.generate_rotations')}
        </Button>
      </div>

      <BottomSheet
        open={isTeamPickerOpen}
        onOpenChange={setIsTeamPickerOpen}
        title={t('setup.team')}
      >
        {teams.length === 0 ? (
          <div className="space-y-4 pt-2">
            <p className="text-ios-footnote text-muted-foreground">{t('setup.no_team')}</p>
            <Button asChild size="lg">
              <Link to="/">{t('setup.go_to_teams')}</Link>
            </Button>
          </div>
        ) : (
          <GroupedList>
            {teams.map((team, index) => (
              <GroupedListRow
                key={team.id}
                onClick={() => handleSelectTeam(team.id)}
                last={index === teams.length - 1}
                trailing={
                  team.id === teamId ? (
                    <Check className="size-5 text-primary" aria-hidden />
                  ) : undefined
                }
              >
                <div className="min-w-0">
                  <div className="text-ios-body truncate">{team.name}</div>
                  <div className="text-ios-caption1 text-muted-foreground">
                    {t('setup.roster_count', { count: team.rosters.length })} &middot;{' '}
                    {t('setup.config_count', { count: team.gameConfigs.length })}
                  </div>
                </div>
              </GroupedListRow>
            ))}
          </GroupedList>
        )}
      </BottomSheet>

      <BottomSheet
        open={isRosterPickerOpen}
        onOpenChange={setIsRosterPickerOpen}
        title={t('setup.roster')}
      >
        {!selectedTeam ? (
          <p className="pt-2 text-ios-footnote text-muted-foreground">
            {t('setup.choose_team_first')}
          </p>
        ) : selectedTeam.rosters.length === 0 ? (
          <div className="space-y-4 pt-2">
            <p className="text-ios-footnote text-muted-foreground">
              {t('setup.no_roster_players')}
            </p>
            <Button asChild size="lg">
              <Link to={`/teams/${teamId}`}>{t('setup.manage_team')}</Link>
            </Button>
          </div>
        ) : (
          <GroupedList>
            {selectedTeam.rosters.map((roster, index) => (
              <GroupedListRow
                key={roster.id}
                onClick={() => handleSelectRoster(roster.id)}
                last={index === selectedTeam.rosters.length - 1}
                trailing={
                  roster.id === rosterId ? (
                    <Check className="size-5 text-primary" aria-hidden />
                  ) : undefined
                }
              >
                <div className="min-w-0">
                  <div className="text-ios-body truncate">{roster.name}</div>
                  <div className="text-ios-caption1 text-muted-foreground">
                    {tCommon('player_count', { count: roster.players.length })}
                  </div>
                </div>
              </GroupedListRow>
            ))}
          </GroupedList>
        )}
      </BottomSheet>

      <BottomSheet
        open={isConfigPickerOpen}
        onOpenChange={setIsConfigPickerOpen}
        title={t('setup.game_config')}
      >
        {!selectedTeam ? (
          <p className="pt-2 text-ios-footnote text-muted-foreground">
            {t('setup.choose_team_first')}
          </p>
        ) : (
          <div className="space-y-4">
            {selectedTeam.gameConfigs.length > 0 && (
              <GroupedList header={t('setup.saved_configs')}>
                {selectedTeam.gameConfigs.map((config, index) => (
                  <GroupedListRow
                    key={config.id}
                    onClick={() => handleSelectConfig(config.id)}
                    last={index === selectedTeam.gameConfigs.length - 1}
                    trailing={
                      config.id === configId ? (
                        <Check className="size-5 text-primary" aria-hidden />
                      ) : undefined
                    }
                  >
                    <div className="min-w-0">
                      <div className="text-ios-body truncate">{config.name}</div>
                      <div className="text-ios-caption1 text-muted-foreground">
                        {tCommon('team.config_summary', {
                          size: config.fieldSize,
                          periods: config.periods,
                          rpp: config.rotationsPerPeriod,
                        })}
                      </div>
                    </div>
                  </GroupedListRow>
                ))}
              </GroupedList>
            )}

            <GroupedList header={t('setup.quick_create')}>
              {GAME_CONFIG_TEMPLATES.map((template, index) => (
                <GroupedListRow
                  key={template.name}
                  onClick={() => {
                    const config = createConfigFromTemplate(teamId, template);
                    dispatch({
                      type: 'ADD_GAME_CONFIG',
                      payload: { teamId, config },
                    });
                    setConfigId(config.id);
                    setIsConfigPickerOpen(false);
                  }}
                  last={index === GAME_CONFIG_TEMPLATES.length - 1}
                >
                  <div className="w-full flex items-center justify-between gap-2">
                    <span className="text-ios-body">{template.name}</span>
                    <span className="text-ios-caption1 text-muted-foreground">
                      {template.fieldSize}v{template.fieldSize}
                    </span>
                  </div>
                </GroupedListRow>
              ))}
            </GroupedList>

            <p className="px-4 text-ios-footnote text-muted-foreground">
              {t('setup.need_custom_setup')}
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link to={`/teams/${teamId}`}>{t('setup.manage_configs')}</Link>
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

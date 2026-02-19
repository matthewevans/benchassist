import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
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
import { validateRosterForGame } from '@/utils/validation.ts';
import { createConfigFromTemplate } from '@/utils/gameConfig.ts';
import { GAME_CONFIG_TEMPLATES } from '@/types/domain.ts';
import type { Game, GoalieAssignment, PlayerId } from '@/types/domain.ts';

export function GameSetup() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const solver = useSolver();

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
    return validateRosterForGame(selectedRoster.players, selectedConfig, [...absentPlayerIds]);
  }, [selectedRoster, selectedConfig, absentPlayerIds]);

  const canGenerate =
    selectedTeam &&
    selectedRoster &&
    selectedConfig &&
    validationErrors.filter((e) => !e.includes('no substitutions')).length === 0;

  const summaryText = useMemo(() => {
    if (!selectedRoster || !selectedConfig) return null;
    const playerCount = activePlayers.length;
    const totalRotations = selectedConfig.periods * selectedConfig.rotationsPerPeriod;
    const fieldSlots = selectedConfig.fieldSize;
    const benchPerRotation = Math.max(0, playerCount - fieldSlots);
    return `${playerCount} players \u00b7 ${selectedConfig.fieldSize}v${selectedConfig.fieldSize} \u00b7 ${totalRotations} rotations \u00b7 ~${benchPerRotation} benched per rotation`;
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

  function handleSelectTeam(nextTeamId: string) {
    setTeamId(nextTeamId);
    setRosterId('');
    setConfigId('');
    setIsTeamPickerOpen(false);
  }

  function handleSelectRoster(nextRosterId: string) {
    setRosterId(nextRosterId);
    setIsRosterPickerOpen(false);
  }

  function handleSelectConfig(nextConfigId: string) {
    setConfigId(nextConfigId);
    setIsConfigPickerOpen(false);
  }

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
      <NavBar title="New Game" backTo="/games" backLabel="Games" />

      <div className="max-w-4xl mx-auto px-4 space-y-6 pt-4">
        {/* Step 1: Team & Configuration */}
        <GroupedList header="Team & Configuration">
          <GroupedListRow onClick={() => setIsTeamPickerOpen(true)} chevron>
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span className="text-ios-body">Team</span>
              <span className="text-ios-subheadline text-muted-foreground truncate">
                {selectedTeam?.name ?? 'Select'}
              </span>
            </div>
          </GroupedListRow>

          <GroupedListRow
            onClick={selectedTeam ? () => setIsRosterPickerOpen(true) : undefined}
            chevron={!!selectedTeam}
          >
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span className="text-ios-body">Roster</span>
              <span className="text-ios-subheadline text-muted-foreground truncate">
                {!selectedTeam
                  ? 'Choose team first'
                  : (selectedRoster?.name ??
                    (selectedTeam.rosters.length === 0 ? 'No rosters yet' : 'Select'))}
              </span>
            </div>
          </GroupedListRow>

          <GroupedListRow
            onClick={selectedTeam ? () => setIsConfigPickerOpen(true) : undefined}
            chevron={!!selectedTeam}
          >
            <div className="flex w-full items-center justify-between gap-3 pr-2">
              <span className="text-ios-body">Game Configuration</span>
              <span className="text-ios-subheadline text-muted-foreground truncate">
                {!selectedTeam
                  ? 'Choose team first'
                  : (selectedConfig?.name ??
                    (selectedTeam.gameConfigs.length === 0 ? 'No configurations yet' : 'Select'))}
              </span>
            </div>
          </GroupedListRow>

          <GroupedListRow last>
            <div className="flex w-full items-center justify-between gap-3 py-1">
              <label htmlFor="game-name" className="text-ios-body">
                Game Name
              </label>
              <Input
                id="game-name"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="Optional"
                className="w-44 border-none bg-transparent px-0 py-0 text-right shadow-none focus-visible:ring-0"
              />
            </div>
          </GroupedListRow>

          {summaryText && (
            <div className="px-4 py-2 text-ios-footnote text-muted-foreground border-t border-border/50">
              {summaryText}
            </div>
          )}
        </GroupedList>

        {/* Step 2: Attendance */}
        {selectedRoster && (
          <GroupedList
            header={`Attendance (${activePlayers.length} / ${selectedRoster.players.length})`}
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
          <GroupedList header="Goalie Assignment">
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
          {solver.isRunning ? 'Generating...' : 'Generate Rotations'}
        </Button>
      </div>

      <BottomSheet open={isTeamPickerOpen} onOpenChange={setIsTeamPickerOpen} title="Team">
        {teams.length === 0 ? (
          <div className="space-y-4 pt-2">
            <p className="text-ios-footnote text-muted-foreground">
              Create a team before starting a game.
            </p>
            <Button asChild size="lg">
              <Link to="/">Go to Teams</Link>
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
                    {team.rosters.length} roster{team.rosters.length !== 1 ? 's' : ''} &middot;{' '}
                    {team.gameConfigs.length} config{team.gameConfigs.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </GroupedListRow>
            ))}
          </GroupedList>
        )}
      </BottomSheet>

      <BottomSheet open={isRosterPickerOpen} onOpenChange={setIsRosterPickerOpen} title="Roster">
        {!selectedTeam ? (
          <p className="pt-2 text-ios-footnote text-muted-foreground">Select a team first.</p>
        ) : selectedTeam.rosters.length === 0 ? (
          <div className="space-y-4 pt-2">
            <p className="text-ios-footnote text-muted-foreground">
              No rosters yet. Add players to a roster first.
            </p>
            <Button asChild size="lg">
              <Link to={`/teams/${teamId}`}>Manage Team</Link>
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
                    {roster.players.length} player{roster.players.length !== 1 ? 's' : ''}
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
        title="Game Configuration"
      >
        {!selectedTeam ? (
          <p className="pt-2 text-ios-footnote text-muted-foreground">Select a team first.</p>
        ) : (
          <div className="space-y-4">
            {selectedTeam.gameConfigs.length > 0 && (
              <GroupedList header="Saved Configurations">
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
                        {config.fieldSize}v{config.fieldSize} &middot; {config.periods} periods
                        &middot; {config.rotationsPerPeriod} rot/period
                      </div>
                    </div>
                  </GroupedListRow>
                ))}
              </GroupedList>
            )}

            <GroupedList header="Quick Create">
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
              Need a custom setup? Create one from Team settings.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link to={`/teams/${teamId}`}>Manage Team Configurations</Link>
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

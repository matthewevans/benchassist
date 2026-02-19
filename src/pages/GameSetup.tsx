import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useSolver } from '@/hooks/useSolver.ts';
import { Button } from '@/components/ui/button.tsx';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { SolverStatusCard } from '@/components/game/SolverStatusCard.tsx';
import { AttendanceList } from '@/components/game/AttendanceList.tsx';
import { GoalieAssignmentSelector } from '@/components/game/GoalieAssignmentSelector.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
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

  const [configExpanded, setConfigExpanded] = useState(false);
  const configComplete = !!(teamId && rosterId && configId);
  const showConfigCollapsed = configComplete && !configExpanded && !!summaryText;

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
      <NavBar title="New Game" backTo="/" backLabel="Teams" />

      <div className="px-4 space-y-6 pt-4">
        {/* Step 1: Team & Configuration */}
        {showConfigCollapsed ? (
          <GroupedList header="Team & Configuration">
            <GroupedListRow
              last
              trailing={
                <Button variant="plain" size="sm" onClick={() => setConfigExpanded(true)}>
                  Edit
                </Button>
              }
            >
              <div>
                <div className="text-ios-body font-medium">
                  {selectedTeam?.name} &middot; {selectedRoster?.name}
                </div>
                <div className="text-ios-caption1 text-muted-foreground">{summaryText}</div>
              </div>
            </GroupedListRow>
          </GroupedList>
        ) : (
          <GroupedList header="Team & Configuration">
            <GroupedListRow>
              <div className="w-full space-y-2 py-1">
                <Label>Team</Label>
                <Select
                  value={teamId}
                  onValueChange={(v) => {
                    setTeamId(v);
                    setRosterId('');
                    setConfigId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </GroupedListRow>

            {selectedTeam && (
              <>
                <GroupedListRow>
                  <div className="w-full space-y-2 py-1">
                    <Label>Roster</Label>
                    <Select value={rosterId} onValueChange={setRosterId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select roster" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedTeam.rosters.map((roster) => (
                          <SelectItem key={roster.id} value={roster.id}>
                            {roster.name} ({roster.players.length} players)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTeam.rosters.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No rosters yet.{' '}
                        <Link
                          to={`/teams/${teamId}`}
                          className="text-primary underline hover:no-underline"
                        >
                          Add players to a roster
                        </Link>{' '}
                        first.
                      </p>
                    )}
                  </div>
                </GroupedListRow>

                <GroupedListRow>
                  <div className="w-full space-y-2 py-1">
                    <Label>Game Configuration</Label>
                    <Select value={configId} onValueChange={setConfigId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select configuration" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedTeam.gameConfigs.map((config) => (
                          <SelectItem key={config.id} value={config.id}>
                            {config.name} ({config.fieldSize}v{config.fieldSize})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTeam.gameConfigs.length === 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          No configurations yet. Quick-create one:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {GAME_CONFIG_TEMPLATES.map((template) => (
                            <Button
                              key={template.name}
                              variant="secondary"
                              size="capsule"
                              onClick={() => {
                                const config = createConfigFromTemplate(teamId, template);
                                dispatch({
                                  type: 'ADD_GAME_CONFIG',
                                  payload: { teamId, config },
                                });
                                setConfigId(config.id);
                              }}
                            >
                              {template.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </GroupedListRow>

                <GroupedListRow last>
                  <div className="w-full space-y-2 py-1">
                    <Label htmlFor="game-name">Game Name (optional)</Label>
                    <Input
                      id="game-name"
                      value={gameName}
                      onChange={(e) => setGameName(e.target.value)}
                      placeholder="e.g., vs Thunder - Feb 15"
                    />
                  </div>
                </GroupedListRow>
              </>
            )}

            {summaryText && (
              <div className="px-4 py-2 text-ios-footnote text-muted-foreground border-t border-border/50">
                {summaryText}
              </div>
            )}
          </GroupedList>
        )}

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
    </div>
  );
}

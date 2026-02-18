import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useSolver } from '@/hooks/useSolver.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { SolverStatusCard } from '@/components/game/SolverStatusCard.tsx';
import { AttendanceList } from '@/components/game/AttendanceList.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Separator } from '@/components/ui/separator.tsx';
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
    return `${playerCount} players · ${selectedConfig.fieldSize}v${selectedConfig.fieldSize} · ${totalRotations} rotations · ~${benchPerRotation} benched per rotation`;
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
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          Teams
        </Link>
        {selectedTeam && (
          <>
            <span className="text-muted-foreground">/</span>
            <Link to={`/teams/${teamId}`} className="text-muted-foreground hover:text-foreground">
              {selectedTeam.name}
            </Link>
          </>
        )}
        <span className="text-muted-foreground">/</span>
        <span>New Game</span>
      </div>
      <h1 className="text-2xl font-bold">New Game</h1>

      {/* Step 1: Select Team */}
      <Card>
        {showConfigCollapsed ? (
          <CardContent className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">
                {selectedTeam?.name} · {selectedRoster?.name}
              </p>
              <p className="text-xs text-muted-foreground">{summaryText}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setConfigExpanded(true)}>
              Edit
            </Button>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-base">
                <span className="text-muted-foreground mr-1.5">1.</span>
                Team & Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
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

              {selectedTeam && (
                <>
                  <div className="space-y-2">
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

                  <div className="space-y-2">
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
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const config = createConfigFromTemplate(teamId, template);
                                dispatch({ type: 'ADD_GAME_CONFIG', payload: { teamId, config } });
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

                  <div className="space-y-2">
                    <Label htmlFor="game-name">Game Name (optional)</Label>
                    <Input
                      id="game-name"
                      value={gameName}
                      onChange={(e) => setGameName(e.target.value)}
                      placeholder="e.g., vs Thunder - Feb 15"
                    />
                  </div>
                </>
              )}
              {summaryText && (
                <p className="text-sm text-muted-foreground pt-2 border-t">{summaryText}</p>
              )}
            </CardContent>
          </>
        )}
      </Card>

      {/* Step 2: Mark absences */}
      {selectedRoster && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <span className="text-muted-foreground mr-1.5">2.</span>
              Attendance ({activePlayers.length} / {selectedRoster.players.length} available)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceList
              players={selectedRoster.players}
              absentIds={absentPlayerIds}
              onToggle={handleToggleAbsent}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Goalie Assignment */}
      {selectedConfig?.useGoalie !== false && selectedConfig && activePlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <span className="text-muted-foreground mr-1.5">3.</span>
              Goalie Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: selectedConfig.periods }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Label className="w-24 text-sm">Period {i + 1}</Label>
                <Select
                  value={goalieAssignments.find((a) => a.periodIndex === i)?.playerId ?? 'auto'}
                  onValueChange={(v) => handleGoalieChange(i, v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-assign</SelectItem>
                    {activePlayers
                      .filter((p) => p.canPlayGoalie)
                      .map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Validation */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            {validationErrors.map((error, i) => (
              <p key={i} className="text-sm text-destructive">
                {error}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Solver status */}
      <SolverStatusCard
        isRunning={solver.isRunning}
        progress={solver.progress}
        message={solver.message}
        error={solver.error}
      />

      <Separator />

      <Button
        className="w-full"
        size="lg"
        disabled={!canGenerate || solver.isRunning}
        onClick={handleGenerate}
      >
        {solver.isRunning ? 'Generating...' : 'Generate Rotations'}
      </Button>
    </div>
  );
}

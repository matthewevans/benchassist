import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useSolver } from '@/hooks/useSolver.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { generateId } from '@/utils/id.ts';
import { validateRosterForGame } from '@/utils/validation.ts';
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

  const canGenerate = selectedTeam && selectedRoster && selectedConfig &&
    validationErrors.filter((e) => !e.includes('no substitutions')).length === 0;

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
    const effectiveGoalieAssignments = selectedConfig.useGoalie !== false ? goalieAssignments : [];

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
      <h1 className="text-2xl font-bold">New Game</h1>

      {/* Step 1: Select Team */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team & Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Team</Label>
            <Select value={teamId} onValueChange={(v) => { setTeamId(v); setRosterId(''); setConfigId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
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
        </CardContent>
      </Card>

      {/* Step 2: Mark absences */}
      {selectedRoster && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Attendance ({activePlayers.length} / {selectedRoster.players.length} available)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {selectedRoster.players.map((player) => {
                const isAbsent = absentPlayerIds.has(player.id);
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                      isAbsent ? 'bg-destructive/10 opacity-60' : 'hover:bg-accent'
                    }`}
                    onClick={() => handleToggleAbsent(player.id)}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!isAbsent}
                        onChange={() => handleToggleAbsent(player.id)}
                        className="h-4 w-4"
                      />
                      <span className={isAbsent ? 'line-through' : ''}>{player.name}</span>
                      <Badge variant="secondary" className="text-xs">{player.skillRanking}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Goalie Assignment */}
      {selectedConfig?.useGoalie !== false && selectedConfig && activePlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goalie Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: selectedConfig.periods }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Label className="w-24 text-sm">Period {i + 1}</Label>
                <Select
                  value={
                    goalieAssignments.find((a) => a.periodIndex === i)?.playerId ?? 'auto'
                  }
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
              <p key={i} className="text-sm text-destructive">{error}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Solver status */}
      {solver.isRunning && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{solver.message}</span>
                <span>{solver.progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${solver.progress}%` }}
                />
              </div>
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

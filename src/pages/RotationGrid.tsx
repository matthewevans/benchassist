import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { Label } from '@/components/ui/label.tsx';
import { cn } from '@/lib/utils.ts';
import { Settings2 } from 'lucide-react';
import { RotationAssignment, SUB_POSITION_LABELS } from '@/types/domain.ts';
import type { PlayerId, Player, Game, GoalieAssignment } from '@/types/domain.ts';
import { previewSwap } from '@/utils/stats.ts';
import { getAssignmentDisplay } from '@/utils/positions.ts';
import { useSolver } from '@/hooks/useSolver.ts';

export function RotationGrid() {
  const { gameId } = useParams<{ gameId: string }>();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'cards'>('grid');
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

  useEffect(() => {
    if (solver.result && game) {
      dispatch({
        type: 'SET_GAME_SCHEDULE',
        payload: { gameId: game.id, schedule: solver.result },
      });
      solver.reset();
    }
  }, [solver.result, game, dispatch, solver]);

  if (!game || !schedule || !roster) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Game or schedule not found</p>
        <Link to="/" className="text-primary underline mt-2 inline-block">Back to teams</Link>
      </div>
    );
  }

  const activePlayers = roster.players.filter(
    (p) => !game.absentPlayerIds.includes(p.id),
  );
  const playerMap = new Map(activePlayers.map((p) => [p.id, p]));

  function handleCellClick(rotationIndex: number, playerId: PlayerId) {
    if (!swapSource) {
      setSwapSource({ rotationIndex, playerId });
      return;
    }

    if (swapSource.rotationIndex === rotationIndex && swapSource.playerId === playerId) {
      setSwapSource(null);
      return;
    }

    if (swapSource.rotationIndex === rotationIndex && schedule) {
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
    navigate(`/games/${game.id}/live`);
  }

  function handleRegenerate() {
    if (!roster || !config || !game) return;
    solver.solve({
      players: roster.players,
      config,
      absentPlayerIds: game.absentPlayerIds,
      goalieAssignments: game.goalieAssignments,
      manualOverrides: game.manualOverrides,
    });
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

  return (
    <div className="space-y-4">
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

      {/* Overall stats */}
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

      {/* View toggle */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'cards')}>
        <TabsList className="w-full">
          <TabsTrigger value="grid" className="flex-1">Grid View</TabsTrigger>
          <TabsTrigger value="cards" className="flex-1">Card View</TabsTrigger>
        </TabsList>

        {/* Grid View */}
        <TabsContent value="grid">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-3 sticky left-0 bg-background font-medium">Player</th>
                  {schedule.rotations.map((r) => (
                    <th key={r.index} className="text-center py-2 px-1 font-medium min-w-[60px]">
                      <div>R{r.index + 1}</div>
                      <div className="text-xs text-muted-foreground font-normal">P{r.periodIndex + 1}</div>
                    </th>
                  ))}
                  <th className="text-center py-2 px-2 font-medium">Play%</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player) => {
                  const stats = schedule.playerStats[player.id];
                  return (
                    <tr key={player.id} className="border-b">
                      <td className="py-1.5 pr-3 sticky left-0 bg-background">
                        <span className="whitespace-nowrap">{player.name}</span>
                      </td>
                      {schedule.rotations.map((rotation) => {
                        const assignment = rotation.assignments[player.id];
                        if (!assignment) return <td key={rotation.index} />;
                        const usePositions = config?.usePositions ?? false;
                        const fieldPosition = rotation.fieldPositions?.[player.id];
                        const display = getAssignmentDisplay(assignment, fieldPosition, usePositions);
                        const isSelected =
                          swapSource?.rotationIndex === rotation.index &&
                          swapSource?.playerId === player.id;
                        return (
                          <td
                            key={rotation.index}
                            className="text-center py-1.5 px-1"
                            onClick={() => handleCellClick(rotation.index, player.id)}
                          >
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-all ${display.className} ${
                                isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                              } ${swapSource && !isSelected ? 'opacity-70 hover:opacity-100' : ''}`}
                              title={fieldPosition ? SUB_POSITION_LABELS[fieldPosition] : undefined}
                            >
                              {display.label}
                            </span>
                          </td>
                        );
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
                  <td className="py-2 pr-3 sticky left-0 bg-background text-sm">Team Strength</td>
                  {schedule.rotations.map((rotation) => (
                    <td key={rotation.index} className="text-center py-2 px-1 text-sm">
                      {rotation.teamStrength}
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {swapSource && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected {playerMap.get(swapSource.playerId)?.name} in R{swapSource.rotationIndex + 1}.
              Click another player in the same rotation to swap, or click again to deselect.
            </p>
          )}
        </TabsContent>

        {/* Card View */}
        <TabsContent value="cards">
          <div className="space-y-4">
            {schedule.rotations.map((rotation) => {
              const onField = Object.entries(rotation.assignments)
                .filter(([, a]) => a === RotationAssignment.Field)
                .map(([id]) => playerMap.get(id))
                .filter((p): p is Player => p !== undefined);
              const onBench = Object.entries(rotation.assignments)
                .filter(([, a]) => a === RotationAssignment.Bench)
                .map(([id]) => playerMap.get(id))
                .filter((p): p is Player => p !== undefined);
              const goalie = Object.entries(rotation.assignments)
                .filter(([, a]) => a === RotationAssignment.Goalie)
                .map(([id]) => playerMap.get(id))
                .filter((p): p is Player => p !== undefined);

              return (
                <Card key={rotation.index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Rotation {rotation.index + 1}
                        <span className="text-muted-foreground font-normal text-sm ml-2">
                          Period {rotation.periodIndex + 1}
                        </span>
                      </CardTitle>
                      <Badge variant="secondary">Strength: {rotation.teamStrength}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {goalie.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">GOALKEEPER</p>
                        <div className="flex flex-wrap gap-1">
                          {goalie.map((p) => (
                            <Badge key={p.id} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {p.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">ON FIELD</p>
                      <div className="flex flex-wrap gap-1">
                        {onField.map((p) => {
                          const pos = config?.usePositions ? rotation.fieldPositions?.[p.id] : undefined;
                          return (
                            <Badge key={p.id} variant="secondary" title={pos ? SUB_POSITION_LABELS[pos] : undefined}>
                              {pos ? `${pos} ${p.name}` : p.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    {onBench.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">BENCH</p>
                        <div className="flex flex-wrap gap-1">
                          {onBench.map((p) => (
                            <Badge key={p.id} variant="outline" className="opacity-60">{p.name}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Player Stats */}
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

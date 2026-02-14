import { useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useSolver } from '@/hooks/useSolver.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { RotationAssignment } from '@/types/domain.ts';
import type { Player, PlayerId, Game } from '@/types/domain.ts';

export function GameDay() {
  const { gameId } = useParams<{ gameId: string }>();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const solver = useSolver();

  const game = gameId ? state.games[gameId] : undefined;
  const team = game ? state.teams[game.teamId] : undefined;
  const roster = team?.rosters.find((r) => r.id === game?.rosterId);
  const config = team?.gameConfigs.find((c) => c.id === game?.gameConfigId);
  const schedule = game?.schedule;

  if (!game || !schedule || !roster || !config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Game not found</p>
        <Link to="/" className="text-primary underline mt-2 inline-block">Back to teams</Link>
      </div>
    );
  }

  const currentRotation = schedule.rotations[game.currentRotationIndex];
  const nextRotation = schedule.rotations[game.currentRotationIndex + 1];
  const isLastRotation = game.currentRotationIndex >= schedule.rotations.length - 1;
  const isCompleted = game.status === 'completed';

  const activePlayers = roster.players.filter(
    (p) =>
      !game.absentPlayerIds.includes(p.id) &&
      !game.removedPlayerIds.includes(p.id),
  );
  const playerMap = new Map(activePlayers.map((p) => [p.id, p]));

  // Compute substitutions happening this rotation
  const subs = useMemo(() => {
    if (!nextRotation || !currentRotation) return { goingIn: [] as Player[], goingOut: [] as Player[] };

    const goingIn: Player[] = [];
    const goingOut: Player[] = [];

    for (const [playerId, nextAssignment] of Object.entries(nextRotation.assignments)) {
      const currentAssignment = currentRotation.assignments[playerId];
      const player = playerMap.get(playerId);
      if (!player) continue;

      const isOnFieldNow = currentAssignment === RotationAssignment.Field || currentAssignment === RotationAssignment.Goalie;
      const isOnFieldNext = nextAssignment === RotationAssignment.Field || nextAssignment === RotationAssignment.Goalie;

      if (!isOnFieldNow && isOnFieldNext) goingIn.push(player);
      if (isOnFieldNow && !isOnFieldNext) goingOut.push(player);
    }

    return { goingIn, goingOut };
  }, [currentRotation, nextRotation, playerMap]);

  function handleAdvance() {
    if (!gameId) return;
    dispatch({ type: 'ADVANCE_ROTATION', payload: gameId });
  }

  function handleRemovePlayer(playerId: PlayerId) {
    if (!gameId || !game || !roster || !config) return;
    const player = playerMap.get(playerId);
    if (!player || !confirm(`Remove ${player.name} from the game?`)) return;

    dispatch({ type: 'REMOVE_PLAYER_FROM_GAME', payload: { gameId, playerId } });

    const remainingPlayers = activePlayers.filter((p) => p.id !== playerId);
    solver.solve({
      players: remainingPlayers,
      config,
      absentPlayerIds: [...game.absentPlayerIds, playerId, ...game.removedPlayerIds],
      goalieAssignments: game.goalieAssignments,
      manualOverrides: [],
      startFromRotation: game.currentRotationIndex,
    });
  }

  function handleEndGame() {
    if (!gameId || !game) return;
    const updatedGame: Game = {
      ...game,
      status: 'completed',
      completedAt: Date.now(),
    };
    dispatch({ type: 'UPDATE_GAME', payload: updatedGame });
    navigate(`/games/${gameId}/rotations`);
  }

  // Handle solver result for re-solve
  useEffect(() => {
    if (solver.result && gameId) {
      dispatch({
        type: 'SET_GAME_SCHEDULE',
        payload: { gameId, schedule: solver.result },
      });
      solver.reset();
    }
  }, [solver.result, gameId, dispatch, solver]);

  if (isCompleted) {
    return (
      <div className="text-center py-12 space-y-4">
        <h1 className="text-2xl font-bold">Game Complete</h1>
        <p className="text-muted-foreground">All rotations have been played.</p>
        <div className="flex gap-2 justify-center">
          <Link to={`/games/${gameId}/rotations`}>
            <Button>View Full Schedule</Button>
          </Link>
          <Link to="/">
            <Button variant="outline">Back to Teams</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!currentRotation) return null;

  const onField = Object.entries(currentRotation.assignments)
    .filter(([, a]) => a === RotationAssignment.Field)
    .map(([id]) => playerMap.get(id))
    .filter((p): p is Player => p !== undefined);
  const onBench = Object.entries(currentRotation.assignments)
    .filter(([, a]) => a === RotationAssignment.Bench)
    .map(([id]) => playerMap.get(id))
    .filter((p): p is Player => p !== undefined);
  const goalie = Object.entries(currentRotation.assignments)
    .filter(([, a]) => a === RotationAssignment.Goalie)
    .map(([id]) => playerMap.get(id))
    .filter((p): p is Player => p !== undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{game.name}</h1>
          <p className="text-sm text-muted-foreground">
            Rotation {game.currentRotationIndex + 1} of {schedule.rotations.length}
            {' '}&middot; Period {currentRotation.periodIndex + 1}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleEndGame}>
          End Game
        </Button>
      </div>

      {/* Rotation progress */}
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{
            width: `${((game.currentRotationIndex + 1) / schedule.rotations.length) * 100}%`,
          }}
        />
      </div>

      {/* Current rotation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Current Rotation</CardTitle>
            <Badge>Strength: {currentRotation.teamStrength}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {goalie.length > 0 && (
            <div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">GOALKEEPER</p>
              <div className="flex flex-wrap gap-2">
                {goalie.map((p) => (
                  <div key={p.id} className="flex items-center gap-1">
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-base py-1 px-3">
                      {p.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive"
                      onClick={() => handleRemovePlayer(p.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">ON FIELD</p>
            <div className="flex flex-wrap gap-2">
              {onField.map((p) => (
                <div key={p.id} className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-base py-1 px-3">{p.name}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-destructive"
                    onClick={() => handleRemovePlayer(p.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
          {onBench.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">BENCH</p>
              <div className="flex flex-wrap gap-2">
                {onBench.map((p) => (
                  <div key={p.id} className="flex items-center gap-1">
                    <Badge variant="outline" className="text-base py-1 px-3 opacity-60">{p.name}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive"
                      onClick={() => handleRemovePlayer(p.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next rotation preview */}
      {nextRotation && (
        <>
          <Separator />
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-muted-foreground">
                Next: Rotation {game.currentRotationIndex + 2}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {subs.goingIn.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-green-600">IN:</span>
                  <div className="flex flex-wrap gap-1">
                    {subs.goingIn.map((p) => (
                      <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {subs.goingOut.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-destructive">OUT:</span>
                  <div className="flex flex-wrap gap-1">
                    {subs.goingOut.map((p) => (
                      <Badge key={p.id} variant="outline" className="text-xs opacity-60">{p.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Advance button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleAdvance}
        disabled={isLastRotation}
      >
        {isLastRotation ? 'Final Rotation' : 'Next Rotation'}
      </Button>

      {/* Quick link to full grid */}
      <div className="text-center">
        <Link to={`/games/${gameId}/rotations`} className="text-sm text-muted-foreground underline">
          View full rotation grid
        </Link>
      </div>
    </div>
  );
}

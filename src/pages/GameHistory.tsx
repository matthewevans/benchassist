import { Link } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';

const STATUS_STYLES: Record<string, string> = {
  setup: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'in-progress': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function GameHistory() {
  const { state, dispatch } = useAppContext();

  const games = Object.values(state.games).sort((a, b) => b.createdAt - a.createdAt);

  function handleDeleteGame(gameId: string) {
    if (!confirm('Delete this game?')) return;
    dispatch({ type: 'DELETE_GAME', payload: gameId });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Game History</h1>

      {games.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <p className="text-lg font-medium">No games yet</p>
            <p className="text-sm mt-1">Create a game from a team page to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {games.map((game) => {
            const team = state.teams[game.teamId];
            const linkPath =
              game.status === 'in-progress'
                ? `/games/${game.id}/live`
                : `/games/${game.id}/rotations`;

            return (
              <Card key={game.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <Link to={linkPath} className="flex-1">
                      <div>
                        <p className="font-medium">{game.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {team?.name} &middot; {new Date(game.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_STYLES[game.status] ?? ''}>
                        {game.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteGame(game.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ConfirmDialog } from '@/components/ui/confirm-dialog.tsx';

const STATUS_STYLES: Record<string, string> = {
  setup: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'in-progress': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function GameHistory() {
  const { state, dispatch } = useAppContext();
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);

  const games = Object.values(state.games).sort((a, b) => b.createdAt - a.createdAt);

  function handleDeleteGame() {
    if (!deletingGameId) return;
    dispatch({ type: 'DELETE_GAME', payload: deletingGameId });
    setDeletingGameId(null);
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
            const linkPath = `/games/${game.id}/rotations`;

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
                      <Badge className={STATUS_STYLES[game.status] ?? ''}>{game.status}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeletingGameId(game.id)}
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

      <ConfirmDialog
        open={deletingGameId !== null}
        onConfirm={handleDeleteGame}
        onCancel={() => setDeletingGameId(null)}
        title="Delete game?"
        description="This will permanently remove this game and its rotation schedule."
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}

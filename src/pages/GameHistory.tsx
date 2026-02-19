import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { IOSAlert } from '@/components/ui/ios-alert.tsx';
import { GAME_STATUS_LABELS, GAME_STATUS_STYLES } from '@/types/domain.ts';

export function GameHistory() {
  const { state } = useAppContext();
  const dispatchWithUndo = useUndoToast();
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);

  const games = Object.values(state.games).sort((a, b) => b.createdAt - a.createdAt);

  function handleDeleteGame() {
    if (!deletingGameId) return;
    dispatchWithUndo({ type: 'DELETE_GAME', payload: deletingGameId });
    setDeletingGameId(null);
  }

  return (
    <div>
      <NavBar title="History" largeTitle />

      <div className="px-4 space-y-6 pt-4">
        {games.length === 0 ? (
          <GroupedList>
            <GroupedListRow last>
              <div className="text-center py-4">
                <div className="text-ios-body font-medium text-muted-foreground">No games yet</div>
                <div className="text-ios-caption1 text-muted-foreground mt-1">
                  Create a game from a team page to get started.
                </div>
              </div>
            </GroupedListRow>
          </GroupedList>
        ) : (
          <GroupedList>
            {games.map((game, i) => {
              const team = state.teams[game.teamId];
              return (
                <Link key={game.id} to={`/games/${game.id}/rotations`}>
                  <GroupedListRow
                    chevron
                    last={i === games.length - 1}
                    trailing={
                      <div className="flex items-center gap-2">
                        <Badge className={GAME_STATUS_STYLES[game.status]}>
                          {GAME_STATUS_LABELS[game.status]}
                        </Badge>
                        <Button
                          variant="plain"
                          size="icon-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeletingGameId(game.id);
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    }
                  >
                    <div>
                      <div className="text-ios-body font-medium">{game.name}</div>
                      <div className="text-ios-caption1 text-muted-foreground">
                        {team?.name} &middot; {new Date(game.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </GroupedListRow>
                </Link>
              );
            })}
          </GroupedList>
        )}
      </div>

      <IOSAlert
        open={deletingGameId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingGameId(null);
        }}
        onConfirm={handleDeleteGame}
        onCancel={() => setDeletingGameId(null)}
        title="Delete game?"
        message="This will permanently remove this game and its rotation schedule."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

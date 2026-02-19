import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import { ChevronRight, Plus } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { IOSAlert } from '@/components/ui/ios-alert.tsx';
import { SwipeableRow } from '@/components/ui/swipeable-row.tsx';
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
      <NavBar
        title="Games"
        largeTitle
        trailing={
          <Button asChild variant="plain" size="icon">
            <Link to="/games/new" aria-label="Create new game">
              <Plus className="size-[22px]" />
            </Link>
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 space-y-6 pt-4">
        {games.length === 0 ? (
          <GroupedList>
            <GroupedListRow last>
              <div className="text-center py-4">
                <div className="text-ios-body font-medium text-muted-foreground">No games yet</div>
                <div className="text-ios-caption1 text-muted-foreground mt-1">
                  Tap + to create your first game.
                </div>
              </div>
            </GroupedListRow>
          </GroupedList>
        ) : (
          <GroupedList>
            {games.map((game, i) => {
              const team = state.teams[game.teamId];
              return (
                <SwipeableRow key={game.id} onDelete={() => setDeletingGameId(game.id)}>
                  <ContextMenuPrimitive.Root>
                    <ContextMenuPrimitive.Trigger asChild>
                      <Link
                        to={`/games/${game.id}/rotations`}
                        className="block active:bg-[#D1D1D6] dark:active:bg-[#3A3A3C] transition-colors"
                      >
                        <GroupedListRow
                          last={i === games.length - 1}
                          trailing={
                            <div className="flex items-center gap-2">
                              <Badge className={GAME_STATUS_STYLES[game.status]}>
                                {GAME_STATUS_LABELS[game.status]}
                              </Badge>
                              <ChevronRight className="size-5 text-[#C7C7CC] dark:text-[#48484A]" />
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
                    </ContextMenuPrimitive.Trigger>
                    <ContextMenuPrimitive.Portal>
                      <ContextMenuPrimitive.Content className="bg-popover text-popover-foreground z-50 min-w-[160px] overflow-hidden rounded-xl border p-1 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                        <ContextMenuPrimitive.Item
                          className="flex items-center rounded-lg px-3 py-2 text-ios-subheadline text-destructive outline-hidden select-none data-[highlighted]:bg-accent cursor-default"
                          onSelect={() => setDeletingGameId(game.id)}
                        >
                          Delete
                        </ContextMenuPrimitive.Item>
                      </ContextMenuPrimitive.Content>
                    </ContextMenuPrimitive.Portal>
                  </ContextMenuPrimitive.Root>
                </SwipeableRow>
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

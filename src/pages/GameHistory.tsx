import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui';
import { ChevronRight, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { Button } from '@/components/ui/button.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Input } from '@/components/ui/input.tsx';
import { IOSAlert } from '@/components/ui/ios-alert.tsx';
import { Label } from '@/components/ui/label.tsx';
import { SwipeableRow } from '@/components/ui/swipeable-row.tsx';
import { GAME_STATUS_STYLES, TEAM_GENDER_DOT_COLORS } from '@/types/domain.ts';
import { cloneGame } from '@/utils/gameClone.ts';

export function GameHistory() {
  const { state, dispatch } = useAppContext();
  const dispatchWithUndo = useUndoToast();
  const navigate = useNavigate();
  const { t } = useTranslation('game');
  const { t: tCommon } = useTranslation('common');
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
  const [renamingGameId, setRenamingGameId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const games = Object.values(state.games).sort((a, b) => b.createdAt - a.createdAt);

  function handleDeleteGame() {
    if (!deletingGameId) return;
    dispatchWithUndo({ type: 'DELETE_GAME', payload: deletingGameId });
    setDeletingGameId(null);
  }

  function handleStartRename(gameId: string) {
    const game = state.games[gameId];
    if (!game) return;
    setEditName(game.name);
    setRenamingGameId(gameId);
  }

  function handleRenameGame() {
    if (!renamingGameId || !editName.trim()) return;
    const game = state.games[renamingGameId];
    if (!game) return;
    dispatch({ type: 'UPDATE_GAME', payload: { ...game, name: editName.trim() } });
    setRenamingGameId(null);
  }

  function handleDuplicateGame(gameId: string) {
    const source = state.games[gameId];
    if (!source) return;
    const name = `${source.name} ${t('history.duplicate_suffix')}`;
    const newGame = cloneGame(source, name);
    dispatch({ type: 'CREATE_GAME', payload: newGame });
    navigate(`/games/${newGame.id}/rotations`);
  }

  return (
    <div>
      <NavBar
        title={t('history.title')}
        largeTitle
        trailing={
          <Button asChild variant="plain" size="icon">
            <Link to="/games/new" aria-label={t('history.create_new_aria')}>
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
                <div className="text-ios-body font-medium text-muted-foreground">
                  {t('history.empty')}
                </div>
                <div className="text-ios-caption1 text-muted-foreground mt-1">
                  {t('history.empty_sub')}
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
                                {tCommon(`game_status.${game.status}`)}
                              </Badge>
                              <ChevronRight className="size-5 text-[#C7C7CC] dark:text-[#48484A]" />
                            </div>
                          }
                        >
                          <div>
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="min-w-0 truncate text-ios-body font-medium">
                                {game.name}
                              </div>
                              {team && (
                                <span className="inline-flex max-w-44 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-ios-caption2 text-muted-foreground">
                                  <span
                                    className={`size-1.5 shrink-0 rounded-full ${TEAM_GENDER_DOT_COLORS[team.gender]}`}
                                  />
                                  <span className="truncate">{team.name}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-ios-caption1 text-muted-foreground">
                              {new Date(game.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </GroupedListRow>
                      </Link>
                    </ContextMenuPrimitive.Trigger>
                    <ContextMenuPrimitive.Portal>
                      <ContextMenuPrimitive.Content className="bg-popover text-popover-foreground z-50 min-w-[160px] overflow-hidden rounded-xl border p-1 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                        <ContextMenuPrimitive.Item
                          className="flex items-center rounded-lg px-3 py-2 text-ios-subheadline outline-hidden select-none data-[highlighted]:bg-accent cursor-default"
                          onSelect={() => handleStartRename(game.id)}
                        >
                          {t('history.rename')}
                        </ContextMenuPrimitive.Item>
                        <ContextMenuPrimitive.Item
                          className="flex items-center rounded-lg px-3 py-2 text-ios-subheadline outline-hidden select-none data-[highlighted]:bg-accent cursor-default"
                          onSelect={() => handleDuplicateGame(game.id)}
                        >
                          {t('history.duplicate')}
                        </ContextMenuPrimitive.Item>
                        <ContextMenuPrimitive.Item
                          className="flex items-center rounded-lg px-3 py-2 text-ios-subheadline text-destructive outline-hidden select-none data-[highlighted]:bg-accent cursor-default"
                          onSelect={() => setDeletingGameId(game.id)}
                        >
                          {tCommon('actions.delete')}
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

      <BottomSheet
        open={renamingGameId !== null}
        onOpenChange={(open) => {
          if (!open) setRenamingGameId(null);
        }}
        title={t('history.rename_title')}
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="game-name">{t('history.game_name_label')}</Label>
            <Input
              id="game-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameGame();
                if (e.key === 'Escape') setRenamingGameId(null);
              }}
              aria-label={t('history.game_name_label')}
              autoFocus
            />
          </div>
          <Button onClick={handleRenameGame} size="lg" disabled={!editName.trim()}>
            {tCommon('actions.save')}
          </Button>
        </div>
      </BottomSheet>

      <IOSAlert
        open={deletingGameId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingGameId(null);
        }}
        onConfirm={handleDeleteGame}
        onCancel={() => setDeletingGameId(null)}
        title={t('history.delete_title')}
        message={t('history.delete_message')}
        confirmLabel={tCommon('actions.delete')}
        destructive
      />
    </div>
  );
}

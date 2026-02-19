import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { IOSAlert } from '@/components/ui/ios-alert.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { cn } from '@/lib/utils.ts';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import { generateId } from '@/utils/id.ts';
import { PlayerImportDialog, type ImportRow } from '@/components/game/PlayerImportDialog.tsx';
import { POSITION_LABELS } from '@/types/domain.ts';
import type { Player, SkillRanking, Position } from '@/types/domain.ts';

const SKILL_LABELS: Record<SkillRanking, string> = {
  1: '1 - Beginner',
  2: '2 - Developing',
  3: '3 - Average',
  4: '4 - Above Average',
  5: '5 - Advanced',
};

interface PlayerFormData {
  name: string;
  skillRanking: SkillRanking;
  canPlayGoalie: boolean;
  primaryPosition: Position | null;
  secondaryPositions: Position[];
}

const DEFAULT_FORM: PlayerFormData = {
  name: '',
  skillRanking: 3,
  canPlayGoalie: false,
  primaryPosition: null,
  secondaryPositions: [],
};

export function RosterEditor() {
  const { teamId, rosterId } = useParams<{ teamId: string; rosterId: string }>();
  const { state, dispatch } = useAppContext();
  const dispatchWithUndo = useUndoToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [form, setForm] = useState<PlayerFormData>(DEFAULT_FORM);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);

  const team = teamId ? state.teams[teamId] : undefined;
  const roster = team?.rosters.find((r) => r.id === rosterId);

  if (!team || !roster) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Roster not found</p>
        <Link to="/" className="text-primary underline mt-2 inline-block">
          Back to teams
        </Link>
      </div>
    );
  }

  /* eslint-disable react-hooks/purity -- event handler, not called during render */
  function handleSavePlayer() {
    if (!form.name.trim() || !teamId || !rosterId) return;

    if (editingPlayerId) {
      const player: Player = {
        id: editingPlayerId,
        name: form.name.trim(),
        skillRanking: form.skillRanking,
        canPlayGoalie: form.canPlayGoalie,
        primaryPosition: form.primaryPosition,
        secondaryPositions: form.secondaryPositions,
        createdAt: roster?.players.find((p) => p.id === editingPlayerId)?.createdAt ?? Date.now(),
      };
      dispatch({ type: 'UPDATE_PLAYER', payload: { teamId, rosterId, player } });
    } else {
      const player: Player = {
        id: generateId(),
        name: form.name.trim(),
        skillRanking: form.skillRanking,
        canPlayGoalie: form.canPlayGoalie,
        primaryPosition: form.primaryPosition,
        secondaryPositions: form.secondaryPositions,
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_PLAYER', payload: { teamId, rosterId, player } });
    }

    setForm(DEFAULT_FORM);
    setEditingPlayerId(null);
    setIsAdding(false);
  }
  /* eslint-enable react-hooks/purity */

  function handleEditPlayer(player: Player) {
    setForm({
      name: player.name,
      skillRanking: player.skillRanking,
      canPlayGoalie: player.canPlayGoalie,
      primaryPosition: player.primaryPosition,
      secondaryPositions: player.secondaryPositions,
    });
    setEditingPlayerId(player.id);
    setIsAdding(true);
  }

  function handleDeletePlayer(playerId: string) {
    if (!teamId || !rosterId) return;
    dispatchWithUndo({ type: 'DELETE_PLAYER', payload: { teamId, rosterId, playerId } });
  }

  /* eslint-disable react-hooks/purity -- event handler, not called during render */
  function handleImportRows(rows: ImportRow[]) {
    if (!teamId || !rosterId) return;
    for (const row of rows) {
      if (row.existingPlayerId) {
        const existing = roster?.players.find((p) => p.id === row.existingPlayerId);
        dispatch({
          type: 'UPDATE_PLAYER',
          payload: {
            teamId,
            rosterId,
            player: {
              id: row.existingPlayerId,
              name: row.name.trim(),
              skillRanking: row.skillRanking,
              canPlayGoalie: row.canPlayGoalie,
              primaryPosition: existing?.primaryPosition ?? null,
              secondaryPositions: existing?.secondaryPositions ?? [],
              createdAt: existing?.createdAt ?? Date.now(),
            },
          },
        });
      } else {
        dispatch({
          type: 'ADD_PLAYER',
          payload: {
            teamId,
            rosterId,
            player: {
              id: generateId(),
              name: row.name.trim(),
              skillRanking: row.skillRanking,
              canPlayGoalie: row.canPlayGoalie,
              primaryPosition: null,
              secondaryPositions: [],
              createdAt: Date.now(),
            },
          },
        });
      }
    }
  }
  /* eslint-enable react-hooks/purity */

  const sortedPlayers = [...roster.players].sort((a, b) => b.skillRanking - a.skillRanking);

  return (
    <div>
      <NavBar
        title={roster.name}
        backTo={`/teams/${teamId}`}
        backLabel={team.name}
        trailing={
          <Button
            variant="plain"
            size="icon"
            onClick={() => {
              setForm(DEFAULT_FORM);
              setEditingPlayerId(null);
              setIsAdding(true);
            }}
          >
            <Plus className="size-[22px]" />
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 space-y-4 pt-4">
        <p className="text-ios-footnote text-muted-foreground">
          {roster.players.length} player{roster.players.length !== 1 ? 's' : ''}
        </p>

        {sortedPlayers.length === 0 ? (
          <GroupedList>
            <GroupedListRow last>
              <span className="text-muted-foreground">
                No players yet. Add players to this roster.
              </span>
            </GroupedListRow>
          </GroupedList>
        ) : (
          <GroupedList>
            {sortedPlayers.map((player, index) => (
              <GroupedListRow
                key={player.id}
                last={index === sortedPlayers.length - 1}
                trailing={
                  <div className="flex items-center gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold hover:bg-primary/20 transition-colors cursor-pointer"
                          aria-label={`Skill ${player.skillRanking}, click to change`}
                        >
                          {player.skillRanking}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-1" align="end">
                        <div className="flex flex-col">
                          {([1, 2, 3, 4, 5] as const).map((rank) => (
                            <button
                              key={rank}
                              className={cn(
                                'px-3 py-1.5 text-sm text-left rounded hover:bg-accent transition-colors',
                                rank === player.skillRanking && 'bg-accent font-medium',
                              )}
                              onClick={() => {
                                dispatch({
                                  type: 'UPDATE_PLAYER',
                                  payload: {
                                    teamId: teamId!,
                                    rosterId: rosterId!,
                                    player: { ...player, skillRanking: rank },
                                  },
                                });
                              }}
                            >
                              {SKILL_LABELS[rank]}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeletingPlayerId(player.id)}
                    >
                      <span className="text-destructive text-ios-caption1">Remove</span>
                    </Button>
                  </div>
                }
              >
                <button className="text-left w-full" onClick={() => handleEditPlayer(player)}>
                  <div className="text-ios-body font-medium">{player.name}</div>
                  <div className="flex gap-1 mt-0.5">
                    {player.primaryPosition && (
                      <Badge variant="secondary" className="text-xs">
                        {player.primaryPosition}
                      </Badge>
                    )}
                    {player.canPlayGoalie && (
                      <Badge variant="outline" className="text-xs">
                        GK
                      </Badge>
                    )}
                  </div>
                </button>
              </GroupedListRow>
            ))}
          </GroupedList>
        )}

        <PlayerImportDialog
          existingPlayers={roster.players}
          onImport={handleImportRows}
          trigger={
            <Button variant="secondary" size="sm">
              Import Players
            </Button>
          }
        />
      </div>

      <BottomSheet
        open={isAdding}
        onOpenChange={(open) => {
          setIsAdding(open);
          if (!open) {
            setForm(DEFAULT_FORM);
            setEditingPlayerId(null);
          }
        }}
        title={editingPlayerId ? 'Edit Player' : 'Add Player'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="player-name">Name</Label>
            <Input
              id="player-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Player name"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Skill Ranking</Label>
            <Select
              value={String(form.skillRanking)}
              onValueChange={(v) => setForm({ ...form, skillRanking: Number(v) as SkillRanking })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {([1, 2, 3, 4, 5] as const).map((rank) => (
                  <SelectItem key={rank} value={String(rank)}>
                    {SKILL_LABELS[rank]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Primary Position</Label>
            <Select
              value={form.primaryPosition ?? 'none'}
              onValueChange={(v) =>
                setForm({ ...form, primaryPosition: v === 'none' ? null : (v as Position) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(Object.keys(POSITION_LABELS) as Position[]).map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {POSITION_LABELS[pos]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="can-play-goalie"
              checked={form.canPlayGoalie}
              onCheckedChange={(checked) => setForm({ ...form, canPlayGoalie: checked as boolean })}
            />
            <Label htmlFor="can-play-goalie">Can play goalkeeper</Label>
          </div>

          <Button onClick={handleSavePlayer} className="w-full" disabled={!form.name.trim()}>
            {editingPlayerId ? 'Save Changes' : 'Add Player'}
          </Button>
        </div>
      </BottomSheet>

      <IOSAlert
        open={deletingPlayerId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingPlayerId(null);
        }}
        title={`Remove ${roster.players.find((p) => p.id === deletingPlayerId)?.name ?? 'player'}?`}
        message="This player will be permanently removed from this roster."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deletingPlayerId) handleDeletePlayer(deletingPlayerId);
          setDeletingPlayerId(null);
        }}
        onCancel={() => setDeletingPlayerId(null)}
        destructive
      />
    </div>
  );
}

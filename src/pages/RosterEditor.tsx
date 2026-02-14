import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { generateId } from '@/utils/id.ts';
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
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [form, setForm] = useState<PlayerFormData>(DEFAULT_FORM);

  const team = teamId ? state.teams[teamId] : undefined;
  const roster = team?.rosters.find((r) => r.id === rosterId);

  if (!team || !roster) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Roster not found</p>
        <Link to="/" className="text-primary underline mt-2 inline-block">
          Back to teams
        </Link>
      </div>
    );
  }

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
    dispatch({ type: 'DELETE_PLAYER', payload: { teamId, rosterId, playerId } });
  }

  const sortedPlayers = [...roster.players].sort((a, b) => b.skillRanking - a.skillRanking);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/teams/${teamId}`} className="text-muted-foreground hover:text-foreground text-sm">
          {team.name}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold">{roster.name}</h1>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {roster.players.length} player{roster.players.length !== 1 ? 's' : ''}
        </p>
        <Dialog
          open={isAdding}
          onOpenChange={(open) => {
            setIsAdding(open);
            if (!open) {
              setForm(DEFAULT_FORM);
              setEditingPlayerId(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">Add Player</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPlayerId ? 'Edit Player' : 'Add Player'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
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
                <input
                  type="checkbox"
                  id="can-play-goalie"
                  checked={form.canPlayGoalie}
                  onChange={(e) => setForm({ ...form, canPlayGoalie: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="can-play-goalie">Can play goalkeeper</Label>
              </div>

              <Button
                onClick={handleSavePlayer}
                className="w-full"
                disabled={!form.name.trim()}
              >
                {editingPlayerId ? 'Save Changes' : 'Add Player'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sortedPlayers.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            No players yet. Add players to this roster.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {sortedPlayers.map((player) => (
            <Card key={player.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                    {player.skillRanking}
                  </div>
                  <div>
                    <p className="font-medium">{player.name}</p>
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
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEditPlayer(player)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeletePlayer(player.id)}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

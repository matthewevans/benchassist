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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { cn } from '@/lib/utils.ts';
import { generateId } from '@/utils/id.ts';
import { parsePlayerImport } from '@/utils/parsePlayerImport.ts';
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

interface ImportRow {
  name: string;
  skillRanking: SkillRanking;
  canPlayGoalie: boolean;
  existingPlayerId: string | null;
  error: string | null;
}

export function RosterEditor() {
  const { teamId, rosterId } = useParams<{ teamId: string; rosterId: string }>();
  const { state, dispatch } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [form, setForm] = useState<PlayerFormData>(DEFAULT_FORM);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStep, setImportStep] = useState<'paste' | 'preview'>('paste');
  const [importRows, setImportRows] = useState<ImportRow[]>([]);

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

  function handleImportParse() {
    const parsed = parsePlayerImport(importText);
    const rows: ImportRow[] = parsed.map((p) => {
      if ('error' in p) {
        return { name: p.name, skillRanking: 3, canPlayGoalie: false, existingPlayerId: null, error: p.error };
      }
      const existing = roster?.players.find(
        (rp) => rp.name.toLowerCase() === p.name.toLowerCase(),
      );
      return {
        name: p.name,
        skillRanking: p.skillRanking,
        canPlayGoalie: existing?.canPlayGoalie ?? false,
        existingPlayerId: existing?.id ?? null,
        error: null,
      };
    });
    setImportRows(rows);
    setImportStep('preview');
  }

  function handleImportSave() {
    if (!teamId || !rosterId) return;
    const validRows = importRows.filter((r) => !r.error);
    for (const row of validRows) {
      if (row.existingPlayerId) {
        const existing = roster?.players.find((p) => p.id === row.existingPlayerId);
        const player: Player = {
          id: row.existingPlayerId,
          name: row.name.trim(),
          skillRanking: row.skillRanking,
          canPlayGoalie: row.canPlayGoalie,
          primaryPosition: existing?.primaryPosition ?? null,
          secondaryPositions: existing?.secondaryPositions ?? [],
          createdAt: existing?.createdAt ?? Date.now(),
        };
        dispatch({ type: 'UPDATE_PLAYER', payload: { teamId, rosterId, player } });
      } else {
        const player: Player = {
          id: generateId(),
          name: row.name.trim(),
          skillRanking: row.skillRanking,
          canPlayGoalie: row.canPlayGoalie,
          primaryPosition: null,
          secondaryPositions: [],
          createdAt: Date.now(),
        };
        dispatch({ type: 'ADD_PLAYER', payload: { teamId, rosterId, player } });
      }
    }
    handleImportClose();
  }

  function handleImportClose() {
    setIsImporting(false);
    setImportText('');
    setImportStep('paste');
    setImportRows([]);
  }

  function updateImportRow(index: number, updates: Partial<ImportRow>) {
    setImportRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  }

  function removeImportRow(index: number) {
    setImportRows((rows) => rows.filter((_, i) => i !== index));
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
        <div className="flex gap-2">
          <Dialog open={isImporting} onOpenChange={(open) => { if (!open) handleImportClose(); else setIsImporting(true); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Import Players</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {importStep === 'paste' ? 'Import Players' : 'Review Import'}
                </DialogTitle>
              </DialogHeader>

              {importStep === 'paste' ? (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="import-text">Paste player list (Name: Skill per line)</Label>
                    <textarea
                      id="import-text"
                      className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder={'Sloane: 4\nElla: 3\nKendall: 5'}
                      autoFocus
                    />
                  </div>
                  <Button
                    onClick={handleImportParse}
                    className="w-full"
                    disabled={!importText.trim()}
                  >
                    Preview
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    {importRows.map((row, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {row.error ? (
                          <div className="flex-1 flex items-center gap-2 text-sm text-destructive">
                            <span className="truncate">{row.name}</span>
                            <span className="text-xs">({row.error})</span>
                          </div>
                        ) : (
                          <>
                            <Input
                              value={row.name}
                              onChange={(e) => updateImportRow(i, { name: e.target.value })}
                              className="flex-1 h-8 text-sm"
                            />
                            <Select
                              value={String(row.skillRanking)}
                              onValueChange={(v) => updateImportRow(i, { skillRanking: Number(v) as SkillRanking })}
                            >
                              <SelectTrigger className="w-16 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {([1, 2, 3, 4, 5] as const).map((rank) => (
                                  <SelectItem key={rank} value={String(rank)}>
                                    {rank}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Checkbox
                              checked={row.canPlayGoalie}
                              onCheckedChange={(checked) => updateImportRow(i, { canPlayGoalie: checked as boolean })}
                              aria-label="Can play goalie"
                            />
                            {row.existingPlayerId ? (
                              <Badge variant="secondary" className="text-xs shrink-0">Update</Badge>
                            ) : (
                              <Badge className="text-xs shrink-0">New</Badge>
                            )}
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1 text-xs text-destructive shrink-0"
                          onClick={() => removeImportRow(i)}
                          aria-label="Remove player"
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setImportStep('paste')}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleImportSave}
                      className="flex-1"
                      disabled={importRows.filter((r) => !r.error).length === 0}
                    >
                      Import {importRows.filter((r) => !r.error).length} Players
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

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
                  <Switch
                    id="can-play-goalie"
                    checked={form.canPlayGoalie}
                    onCheckedChange={(checked) => setForm({ ...form, canPlayGoalie: checked as boolean })}
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
      </div>

      {sortedPlayers.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            No players yet. Add players to this roster.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={cn(
                  "flex items-center justify-between px-4 py-3",
                  index < sortedPlayers.length - 1 && "border-b"
                )}
              >
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold hover:bg-primary/20 transition-colors cursor-pointer"
                        aria-label={`Skill ${player.skillRanking}, click to change`}
                      >
                        {player.skillRanking}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1" align="start">
                      <div className="flex flex-col">
                        {([1, 2, 3, 4, 5] as const).map((rank) => (
                          <button
                            key={rank}
                            className={cn(
                              "px-3 py-1.5 text-sm text-left rounded hover:bg-accent transition-colors",
                              rank === player.skillRanking && "bg-accent font-medium"
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
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

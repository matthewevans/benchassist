import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { GameConfigForm } from '@/components/game/GameConfigForm.tsx';
import { generateId } from '@/utils/id.ts';
import { GAME_CONFIG_TEMPLATES } from '@/types/domain.ts';
import type { Roster, GameConfig } from '@/types/domain.ts';

export function TeamManagement() {
  const { teamId } = useParams<{ teamId: string }>();
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [isAddingRoster, setIsAddingRoster] = useState(false);
  const [newRosterName, setNewRosterName] = useState('');
  const [isAddingConfig, setIsAddingConfig] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingConfig, setEditingConfig] = useState<GameConfig | null>(null);

  const team = teamId ? state.teams[teamId] : undefined;

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Team not found</p>
        <Link to="/" className="text-primary underline mt-2 inline-block">
          Back to teams
        </Link>
      </div>
    );
  }

  function handleAddRoster() {
    if (!newRosterName.trim() || !teamId) return;

    const roster: Roster = {
      id: generateId(),
      teamId,
      name: newRosterName.trim(),
      players: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    dispatch({ type: 'ADD_ROSTER', payload: { teamId, roster } });
    setNewRosterName('');
    setIsAddingRoster(false);
  }

  function handleSaveConfig(config: GameConfig) {
    if (!teamId) return;
    dispatch({ type: 'ADD_GAME_CONFIG', payload: { teamId, config } });
    setIsAddingConfig(false);
  }

  function handleUpdateConfig(config: GameConfig) {
    if (!teamId) return;
    dispatch({ type: 'UPDATE_GAME_CONFIG', payload: { teamId, config } });
    setEditingConfig(null);
  }

  function handleDeleteTeam() {
    if (!teamId || !team) return;
    if (confirm(`Delete "${team.name}" and all its data?`)) {
      dispatch({ type: 'DELETE_TEAM', payload: teamId });
      navigate('/');
    }
  }

  function handleRenameTeam() {
    if (!teamId || !editName.trim()) return;
    dispatch({ type: 'UPDATE_TEAM', payload: { teamId, name: editName.trim() } });
    setIsEditing(false);
  }

  return (
    <div className="space-y-6">
      {/* Team header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground text-sm">
            Teams
          </Link>
          <span className="text-muted-foreground">/</span>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameTeam();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                autoFocus
                className="h-8 w-48"
              />
              <Button size="sm" onClick={handleRenameTeam}>Save</Button>
            </div>
          ) : (
            <h1
              className="text-2xl font-bold cursor-pointer hover:text-primary"
              onClick={() => {
                setEditName(team.name);
                setIsEditing(true);
              }}
            >
              {team.name}
            </h1>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/games/new?teamId=${teamId}`}>
            <Button>New Game</Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleDeleteTeam}>
            Delete
          </Button>
        </div>
      </div>

      {/* Rosters */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rosters</h2>
          <Dialog open={isAddingRoster} onOpenChange={setIsAddingRoster}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Add Roster</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Roster</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="roster-name">Roster Name</Label>
                  <Input
                    id="roster-name"
                    value={newRosterName}
                    onChange={(e) => setNewRosterName(e.target.value)}
                    placeholder="e.g., Spring 2026"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddRoster();
                    }}
                    autoFocus
                  />
                </div>
                <Button onClick={handleAddRoster} className="w-full" disabled={!newRosterName.trim()}>
                  Create Roster
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {team.rosters.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No rosters yet. Add a roster to start managing players.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {team.rosters.map((roster) => (
              <Link key={roster.id} to={`/teams/${teamId}/rosters/${roster.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{roster.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {roster.players.length} player{roster.players.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Game Configs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Game Configurations</h2>
          <Dialog open={isAddingConfig} onOpenChange={setIsAddingConfig}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Custom...</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Game Configuration</DialogTitle>
              </DialogHeader>
              <GameConfigForm
                teamId={teamId ?? ''}
                onSave={handleSaveConfig}
                onCancel={() => setIsAddingConfig(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Template quick-create buttons */}
        <div className="flex flex-wrap gap-2">
          {GAME_CONFIG_TEMPLATES.map((template) => (
            <Button
              key={template.name}
              variant="outline"
              size="sm"
              onClick={() => {
                const config: GameConfig = {
                  id: generateId(),
                  teamId: teamId!,
                  name: template.name,
                  fieldSize: template.fieldSize,
                  periods: template.periods,
                  periodDurationMinutes: template.periodDurationMinutes,
                  rotationsPerPeriod: template.rotationsPerPeriod,
                  usePositions: template.usePositions,
                  formation: template.formation,
                  useGoalie: template.useGoalie,
                  noConsecutiveBench: true,
                  maxConsecutiveBench: 1,
                  enforceMinPlayTime: true,
                  minPlayPercentage: 50,
                  goaliePlayFullPeriod: true,
                  goalieRestAfterPeriod: true,
                  balancePriority: 'balanced',
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
                dispatch({ type: 'ADD_GAME_CONFIG', payload: { teamId: teamId!, config } });
              }}
            >
              {template.name}
            </Button>
          ))}
        </div>

        {team.gameConfigs.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No game configurations. Add one to define field size, periods, and rules.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {team.gameConfigs.map((config) => (
              <Card
                key={config.id}
                className="hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => setEditingConfig(config)}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{config.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {config.fieldSize}v{config.fieldSize} &middot;{' '}
                        {config.periods} periods &middot;{' '}
                        {config.rotationsPerPeriod} rotations/period
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!teamId) return;
                        if (confirm(`Delete "${config.name}"?`)) {
                          dispatch({
                            type: 'DELETE_GAME_CONFIG',
                            payload: { teamId, configId: config.id },
                          });
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit config dialog */}
        <Dialog open={!!editingConfig} onOpenChange={(open) => { if (!open) setEditingConfig(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Configuration</DialogTitle>
            </DialogHeader>
            {editingConfig && (
              <GameConfigForm
                teamId={teamId ?? ''}
                initialConfig={editingConfig}
                onSave={handleUpdateConfig}
                onCancel={() => setEditingConfig(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}

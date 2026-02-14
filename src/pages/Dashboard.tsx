import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.tsx';
import { generateId } from '@/utils/id.ts';
import type { Team } from '@/types/domain.ts';

export function Dashboard() {
  const { state, dispatch } = useAppContext();
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  const teams = Object.values(state.teams).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  const recentGames = Object.values(state.games)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  function handleCreateTeam() {
    if (!newTeamName.trim()) return;

    const team: Team = {
      id: generateId(),
      name: newTeamName.trim(),
      rosters: [],
      gameConfigs: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    dispatch({ type: 'CREATE_TEAM', payload: team });
    setNewTeamName('');
    setIsCreating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>New Team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g., Thunder FC U12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTeam();
                  }}
                  autoFocus
                />
              </div>
              <Button onClick={handleCreateTeam} className="w-full" disabled={!newTeamName.trim()}>
                Create Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <p className="text-lg font-medium">No teams yet</p>
            <p className="text-sm mt-1">Create a team to get started with rotation management.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {teams.map((team) => (
            <Link key={team.id} to={`/teams/${team.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>
                      {team.rosters.length} roster{team.rosters.length !== 1 ? 's' : ''}
                    </span>
                    <span>
                      {team.gameConfigs.length} config{team.gameConfigs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {recentGames.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Games</h2>
          <div className="grid gap-2">
            {recentGames.map((game) => {
              const team = state.teams[game.teamId];
              return (
                <Link
                  key={game.id}
                  to={
                    game.status === 'in-progress'
                      ? `/games/${game.id}/live`
                      : `/games/${game.id}/rotations`
                  }
                >
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{game.name}</p>
                        <p className="text-sm text-muted-foreground">{team?.name}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                        {game.status}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

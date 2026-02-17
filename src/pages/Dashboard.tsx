import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import { ConfirmDialog } from '@/components/ui/confirm-dialog.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { generateId } from '@/utils/id.ts';
import { downloadJSON, readJSONFile } from '@/storage/exportImport.ts';
import { CURRENT_VERSION, type StorageData } from '@/storage/localStorage.ts';
import {
  TEAM_GENDER_LABELS,
  TEAM_GENDER_BORDER_COLORS,
  TEAM_GENDER_DOT_COLORS,
  type Player,
  type Team,
  type TeamGender,
} from '@/types/domain.ts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

const AVATAR_COLORS = [
  'bg-red-200 text-red-800',
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-yellow-200 text-yellow-800',
  'bg-purple-200 text-purple-800',
  'bg-pink-200 text-pink-800',
  'bg-indigo-200 text-indigo-800',
  'bg-orange-200 text-orange-800',
  'bg-teal-200 text-teal-800',
  'bg-cyan-200 text-cyan-800',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getColorClass(name: string): string {
  let hash = 0;
  for (const ch of name) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getAllPlayers(team: Team): Player[] {
  const seen = new Set<string>();
  const players: Player[] = [];
  for (const roster of team.rosters) {
    for (const player of roster.players) {
      if (!seen.has(player.id)) {
        seen.add(player.id);
        players.push(player);
      }
    }
  }
  return players;
}

const MAX_AVATARS = 8;

export function Dashboard() {
  const { state, dispatch } = useAppContext();
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGender, setNewTeamGender] = useState<TeamGender>('coed');

  const teams = Object.values(state.teams).sort((a, b) => b.updatedAt - a.updatedAt);

  const recentGames = Object.values(state.games)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<StorageData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function handleExport() {
    const data: StorageData = { version: CURRENT_VERSION, teams: state.teams, games: state.games };
    downloadJSON(data, `benchassist-backup-${new Date().toISOString().slice(0, 10)}.json`);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const data = await readJSONFile(file);
      setImportData(data);
    } catch {
      setImportError("Could not read file. Make sure it's a valid BenchAssist export.");
    }
  }

  function handleConfirmImport() {
    if (!importData) return;
    dispatch({
      type: 'IMPORT_DATA',
      payload: {
        teams: importData.teams,
        games: importData.games,
        favoriteDrillIds: importData.favoriteDrillIds ?? [],
      },
    });
    setImportData(null);
  }

  function handleCreateTeam() {
    if (!newTeamName.trim()) return;

    const team: Team = {
      id: generateId(),
      name: newTeamName.trim(),
      gender: newTeamGender,
      birthYear: null,
      rosters: [],
      gameConfigs: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    dispatch({ type: 'CREATE_TEAM', payload: team });
    setNewTeamName('');
    setNewTeamGender('coed');
    setIsCreating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center py-2">
        <img
          src={`${import.meta.env.BASE_URL}full_logo_light.png`}
          alt="BenchAssist"
          className="h-40 dark:hidden"
        />
        <img
          src={`${import.meta.env.BASE_URL}full_logo_dark.png`}
          alt="BenchAssist"
          className="h-40 hidden dark:block"
        />
      </div>

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
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={newTeamGender}
                  onValueChange={(v) => setNewTeamGender(v as TeamGender)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEAM_GENDER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <span
                            className={`size-2 rounded-full ${TEAM_GENDER_DOT_COLORS[value as TeamGender]}`}
                          />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          {teams.map((team) => {
            const players = getAllPlayers(team);
            const visible = players.slice(0, MAX_AVATARS);
            const overflow = players.length - MAX_AVATARS;
            return (
              <Link key={team.id} to={`/teams/${team.id}`}>
                <Card
                  className={`hover:bg-accent/50 transition-colors cursor-pointer border-l-4 ${TEAM_GENDER_BORDER_COLORS[team.gender]}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{TEAM_GENDER_LABELS[team.gender]}</span>
                      <span>
                        {team.rosters.length} roster{team.rosters.length !== 1 ? 's' : ''}
                      </span>
                      <span>
                        {players.length} player{players.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {players.length > 0 && (
                      <div className="flex -space-x-2">
                        {visible.map((player) => (
                          <div
                            key={player.id}
                            title={player.name}
                            className={`size-8 rounded-full flex items-center justify-center text-xs font-medium ring-2 ring-background ${getColorClass(player.name)}`}
                          >
                            {getInitials(player.name)}
                          </div>
                        ))}
                        {overflow > 0 && (
                          <div className="size-8 rounded-full flex items-center justify-center text-xs font-medium ring-2 ring-background bg-muted text-muted-foreground">
                            +{overflow}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {recentGames.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Games</h2>
          <div className="grid gap-2">
            {recentGames.map((game) => {
              const team = state.teams[game.teamId];
              return (
                <Link key={game.id} to={`/games/${game.id}/rotations`}>
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
      <Separator />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Data</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export Backup
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Import Backup
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      <ConfirmDialog
        open={importData !== null}
        onConfirm={handleConfirmImport}
        onCancel={() => setImportData(null)}
        title="Import backup?"
        description="This will replace all your current teams, rosters, and games with the imported data."
        confirmLabel="Import"
        variant="destructive"
      />

      {importError && (
        <Dialog open onOpenChange={() => setImportError(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Failed</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{importError}</p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

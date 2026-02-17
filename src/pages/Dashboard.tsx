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
import { Separator } from '@/components/ui/separator.tsx';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import { generateId } from '@/utils/id.ts';
import { getUAge } from '@/utils/age.ts';
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

function OnboardingStep({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-muted text-muted-foreground">
        {number}
      </span>
      <span>{label}</span>
    </div>
  );
}

const MAX_AVATARS = 8;

export function Dashboard() {
  const { state, dispatch } = useAppContext();
  const dispatchWithUndo = useUndoToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGender, setNewTeamGender] = useState<TeamGender>('coed');

  const teams = Object.values(state.teams).sort((a, b) => b.updatedAt - a.updatedAt);

  const activeGame = Object.values(state.games).find((g) => g.status === 'in-progress');
  const activeTeam = activeGame ? state.teams[activeGame.teamId] : undefined;

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

  function handleImport(mode: 'replace' | 'merge') {
    if (!importData) return;
    const payload = {
      teams: importData.teams,
      games: importData.games,
      favoriteDrillIds: importData.favoriteDrillIds ?? [],
    };
    dispatchWithUndo({
      type: mode === 'merge' ? 'MERGE_DATA' : 'IMPORT_DATA',
      payload,
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
      <div className="space-y-3">
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

        {activeGame && (
          <Link to={`/games/${activeGame.id}/rotations`}>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                <span className="text-sm font-medium">{activeGame.name}</span>
                <span className="text-xs text-muted-foreground">
                  {activeTeam?.name} · R{activeGame.currentRotationIndex + 1}
                </span>
              </div>
              <span className="text-xs font-semibold text-green-700 dark:text-green-400 shrink-0">
                Resume →
              </span>
            </div>
          </Link>
        )}
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
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <OnboardingStep number={1} label="Create a team" />
            <OnboardingStep number={2} label="Add players to a roster" />
            <OnboardingStep number={3} label="Set up a game format (5v5, 7v7, etc.)" />
            <OnboardingStep number={4} label="Generate fair rotations" />
            <div className="pt-2">
              <Button className="w-full" onClick={() => setIsCreating(true)}>
                Create Your First Team
              </Button>
            </div>
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
                      {team.birthYear && <span>U{getUAge(team.birthYear)}</span>}
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

      <Dialog
        open={importData !== null}
        onOpenChange={(open) => {
          if (!open) setImportData(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import backup</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">How would you like to import the data?</p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => handleImport('merge')}>Merge</Button>
            <p className="text-xs text-muted-foreground -mt-1 mb-1 pl-1">
              Add imported teams and games to your existing data. Duplicates are overwritten.
            </p>
            <Button variant="destructive" onClick={() => handleImport('replace')}>
              Replace All
            </Button>
            <p className="text-xs text-muted-foreground -mt-1 mb-1 pl-1">
              Delete all current data and replace with the imported backup.
            </p>
            <Button variant="outline" onClick={() => setImportData(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

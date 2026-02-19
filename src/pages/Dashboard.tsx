import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { Button } from '@/components/ui/button.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { generateId } from '@/utils/id.ts';
import { getUAge } from '@/utils/age.ts';
import {
  TEAM_GENDER_LABELS,
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

export function Dashboard() {
  const { state, dispatch } = useAppContext();
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGender, setNewTeamGender] = useState<TeamGender>('coed');

  const teams = Object.values(state.teams).sort((a, b) => b.updatedAt - a.updatedAt);

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
    <div>
      <NavBar
        title="Teams"
        largeTitle
        leading={
          <>
            <img
              src="/benchassist/small_logo_light_square.png"
              alt=""
              className="size-7 dark:hidden lg:hidden"
            />
            <img
              src="/benchassist/small_logo.png"
              alt=""
              className="size-7 hidden dark:block dark:lg:hidden"
            />
          </>
        }
        trailing={
          <Button variant="plain" size="icon" onClick={() => setIsCreating(true)}>
            <Plus className="size-[22px]" />
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 space-y-6 pt-4">
        {teams.length === 0 ? (
          <>
            <GroupedList header="Get Started">
              <GroupedListRow>
                <span className="text-ios-body">1. Create a team</span>
              </GroupedListRow>
              <GroupedListRow>
                <span className="text-ios-body">2. Add players to a roster</span>
              </GroupedListRow>
              <GroupedListRow>
                <span className="text-ios-body">3. Set up a game format (5v5, 7v7, etc.)</span>
              </GroupedListRow>
              <GroupedListRow last>
                <span className="text-ios-body">4. Generate fair rotations</span>
              </GroupedListRow>
            </GroupedList>
            <Button size="lg" onClick={() => setIsCreating(true)}>
              Create Your First Team
            </Button>
          </>
        ) : (
          <GroupedList>
            {teams.map((team, i) => {
              const players = getAllPlayers(team);
              return (
                <Link key={team.id} to={`/teams/${team.id}`}>
                  <GroupedListRow chevron last={i === teams.length - 1}>
                    <div className="flex items-center gap-3">
                      <span
                        className={`size-2.5 rounded-full shrink-0 ${TEAM_GENDER_DOT_COLORS[team.gender]}`}
                      />
                      <div className="min-w-0">
                        <div className="text-ios-body font-medium truncate">{team.name}</div>
                        <div className="text-ios-caption1 text-muted-foreground">
                          {TEAM_GENDER_LABELS[team.gender]}
                          {team.birthYear && ` · U${getUAge(team.birthYear)}`}
                          {` · ${players.length} player${players.length !== 1 ? 's' : ''}`}
                        </div>
                      </div>
                    </div>
                  </GroupedListRow>
                </Link>
              );
            })}
          </GroupedList>
        )}
      </div>

      <BottomSheet open={isCreating} onOpenChange={setIsCreating} title="New Team">
        <div className="space-y-4">
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
            <Select value={newTeamGender} onValueChange={(v) => setNewTeamGender(v as TeamGender)}>
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
          <Button size="lg" onClick={handleCreateTeam} disabled={!newTeamName.trim()}>
            Create Team
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

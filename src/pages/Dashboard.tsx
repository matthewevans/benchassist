import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { Button } from '@/components/ui/button.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { generateId } from '@/utils/id.ts';
import { getUAge } from '@/utils/age.ts';
import { createConfigFromTemplate, getGysaTemplateForBirthYear } from '@/utils/gameConfig.ts';
import { TEAM_GENDER_DOT_COLORS, type Player, type Team, type TeamGender } from '@/types/domain.ts';
import { ImportMethodDialog } from '@/components/ImportMethodDialog.tsx';
import { ImportDialog } from '@/components/ImportDialog.tsx';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import type { StorageData } from '@/storage/localStorage.ts';
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
  const { t } = useTranslation('common');
  const dispatchWithUndo = useUndoToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<StorageData | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGender, setNewTeamGender] = useState<TeamGender>('coed');
  const [newTeamBirthYear, setNewTeamBirthYear] = useState<number | null>(null);

  const teams = Object.values(state.teams).sort((a, b) => b.updatedAt - a.updatedAt);

  function handleCreateTeam() {
    if (!newTeamName.trim()) return;

    const teamId = generateId();
    const gysaTemplate = newTeamBirthYear
      ? getGysaTemplateForBirthYear(newTeamBirthYear)
      : undefined;
    const gameConfigs = gysaTemplate ? [createConfigFromTemplate(teamId, gysaTemplate)] : [];

    const team: Team = {
      id: teamId,
      name: newTeamName.trim(),
      gender: newTeamGender,
      birthYear: newTeamBirthYear,
      rosters: [],
      gameConfigs,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    dispatch({ type: 'CREATE_TEAM', payload: team });
    setNewTeamName('');
    setNewTeamGender('coed');
    setNewTeamBirthYear(null);
    setIsCreating(false);
  }

  return (
    <div>
      <NavBar
        title={t('nav.teams')}
        largeTitle
        trailing={
          <Button variant="plain" size="icon" onClick={() => setIsCreating(true)}>
            <Plus className="size-[22px]" />
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 space-y-6 pt-4">
        {teams.length === 0 ? (
          <>
            <GroupedList header={t('dashboard.get_started')}>
              <GroupedListRow>
                <span className="text-ios-body">{t('dashboard.step_1')}</span>
              </GroupedListRow>
              <GroupedListRow>
                <span className="text-ios-body">{t('dashboard.step_2')}</span>
              </GroupedListRow>
              <GroupedListRow>
                <span className="text-ios-body">{t('dashboard.step_3')}</span>
              </GroupedListRow>
              <GroupedListRow last>
                <span className="text-ios-body">{t('dashboard.step_4')}</span>
              </GroupedListRow>
            </GroupedList>
            <Button size="lg" onClick={() => setIsCreating(true)}>
              {t('dashboard.create_first_team')}
            </Button>
            <GroupedList>
              <GroupedListRow chevron last onClick={() => setIsImporting(true)}>
                <div className="flex items-center gap-3">
                  <Download className="size-5 text-primary" />
                  <div>
                    <div className="text-ios-body">{t('dashboard.have_backup')}</div>
                    <div className="text-ios-caption1 text-muted-foreground">
                      {t('dashboard.import_data')}
                    </div>
                  </div>
                </div>
              </GroupedListRow>
            </GroupedList>
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
                          {t(`gender.${team.gender}`)}
                          {team.birthYear && ` · U${getUAge(team.birthYear)}`}
                          {` · ${t('player_count', { count: players.length })}`}
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

      <BottomSheet open={isCreating} onOpenChange={setIsCreating} title={t('team.new_team')}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">{t('team.name_label')}</Label>
            <Input
              id="team-name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder={t('team.name_placeholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTeam();
              }}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>{t('team.gender_label')}</Label>
            <Select value={newTeamGender} onValueChange={(v) => setNewTeamGender(v as TeamGender)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['coed', 'boys', 'girls'] as const).map((value) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${TEAM_GENDER_DOT_COLORS[value]}`} />
                      {t(`gender.${value}`)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-birth-year">{t('team.birth_year')}</Label>
            <Input
              id="team-birth-year"
              type="number"
              min={2005}
              max={new Date().getFullYear()}
              value={newTeamBirthYear ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                setNewTeamBirthYear(val);
              }}
              placeholder={t('team.birth_year_placeholder')}
            />
            {newTeamBirthYear &&
              (() => {
                const match = getGysaTemplateForBirthYear(newTeamBirthYear);
                return match ? (
                  <p className="text-ios-footnote text-primary">
                    {t('team.gysa_auto_config', { name: match.name })}
                  </p>
                ) : null;
              })()}
          </div>
          <Button size="lg" onClick={handleCreateTeam} disabled={!newTeamName.trim()}>
            {t('team.create')}
          </Button>
        </div>
      </BottomSheet>

      <ImportMethodDialog
        open={isImporting}
        onOpenChange={setIsImporting}
        onDataLoaded={(data) => {
          setImportData(data);
          setIsImporting(false);
        }}
      />

      {importData && (
        <ImportDialog
          open={importData !== null}
          onOpenChange={(open) => {
            if (!open) setImportData(null);
          }}
          importData={importData}
          onImportSelected={(filtered) => {
            dispatchWithUndo({
              type: 'MERGE_DATA',
              payload: {
                teams: filtered.teams,
                games: filtered.games,
                favoriteDrillIds: filtered.favoriteDrillIds ?? [],
              },
            });
            setImportData(null);
          }}
          onReplaceAll={(data) => {
            dispatchWithUndo({
              type: 'IMPORT_DATA',
              payload: {
                teams: data.teams,
                games: data.games,
                favoriteDrillIds: data.favoriteDrillIds ?? [],
              },
            });
            setImportData(null);
          }}
        />
      )}
    </div>
  );
}

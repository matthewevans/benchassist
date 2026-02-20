import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { IOSAlert } from '@/components/ui/ios-alert.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { GameConfigForm } from '@/components/game/GameConfigForm.tsx';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import { generateId } from '@/utils/id.ts';
import { getUAge } from '@/utils/age.ts';
import {
  createConfigFromTemplate,
  formatConfigSummary,
  getGysaTemplateForBirthYear,
} from '@/utils/gameConfig.ts';
import { GAME_CONFIG_TEMPLATES, TEAM_GENDER_DOT_COLORS } from '@/types/domain.ts';
import type {
  GameConfig,
  GameConfigId,
  GameConfigTemplate,
  Roster,
  TeamGender,
} from '@/types/domain.ts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

export function TeamManagement() {
  const { teamId } = useParams<{ teamId: string }>();
  const { state, dispatch } = useAppContext();
  const dispatchWithUndo = useUndoToast();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { t: tGame } = useTranslation('game');
  const [isAddingRoster, setIsAddingRoster] = useState(false);
  const [newRosterName, setNewRosterName] = useState('');
  const [isAddingConfig, setIsAddingConfig] = useState(false);
  const [isChoosingTemplate, setIsChoosingTemplate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingConfig, setEditingConfig] = useState<GameConfig | null>(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false);
  const [deletingConfigId, setDeletingConfigId] = useState<GameConfigId | null>(null);

  const team = teamId ? state.teams[teamId] : undefined;

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">{t('team.not_found')}</p>
        <Link to="/" className="text-primary underline mt-2 inline-block">
          {t('team.back_to_teams')}
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
    dispatchWithUndo({ type: 'DELETE_TEAM', payload: teamId });
    navigate('/');
  }

  function handleRenameTeam() {
    if (!teamId || !editName.trim() || !team) return;
    dispatch({
      type: 'UPDATE_TEAM',
      payload: { teamId, name: editName.trim(), gender: team.gender },
    });
    setIsEditing(false);
  }

  function handleChangeGender(gender: TeamGender) {
    if (!teamId || !team) return;
    const name = isEditing ? editName.trim() || team.name : team.name;
    dispatch({ type: 'UPDATE_TEAM', payload: { teamId, name, gender } });
  }

  return (
    <div>
      <NavBar
        title={team.name}
        backTo="/"
        backLabel={t('nav.teams')}
        trailing={
          <Button
            variant="plain"
            size="sm"
            onClick={() => {
              setEditName(team.name);
              setIsEditing(true);
            }}
          >
            {t('actions.edit')}
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 space-y-6 pt-4">
        {/* Team Details */}
        <GroupedList header={t('team.details')}>
          <GroupedListRow
            trailing={
              <Select
                value={team.gender}
                onValueChange={(v) => handleChangeGender(v as TeamGender)}
              >
                <SelectTrigger className="w-32 min-h-11 text-ios-body">
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
            }
          >
            {t('team.gender_label')}
          </GroupedListRow>
          <GroupedListRow
            last
            trailing={
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={2005}
                  max={new Date().getFullYear()}
                  value={team.birthYear ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : null;
                    dispatch({
                      type: 'SET_TEAM_BIRTH_YEAR',
                      payload: { teamId: teamId!, birthYear: val },
                    });
                  }}
                  placeholder={t('team.birth_year_placeholder')}
                  className="w-24 text-right border-none shadow-none bg-transparent px-0 focus-visible:ring-0 h-auto text-ios-body"
                />
                {team.birthYear && (
                  <span className="text-muted-foreground text-ios-footnote">
                    U{getUAge(team.birthYear)}
                  </span>
                )}
              </div>
            }
          >
            {t('team.birth_year')}
          </GroupedListRow>
        </GroupedList>

        {/* Rosters */}
        <GroupedList header={t('team.rosters')}>
          {team.rosters.length === 0 ? (
            <GroupedListRow last>
              <span className="text-muted-foreground">{t('team.no_rosters')}</span>
            </GroupedListRow>
          ) : (
            team.rosters.map((roster, i) => (
              <Link key={roster.id} to={`/teams/${teamId}/rosters/${roster.id}`}>
                <GroupedListRow chevron last={i === team.rosters.length - 1}>
                  <div>
                    <div className="text-ios-body font-medium">{roster.name}</div>
                    <div className="text-ios-caption1 text-muted-foreground">
                      {t('player_count', { count: roster.players.length })}
                    </div>
                  </div>
                </GroupedListRow>
              </Link>
            ))
          )}
        </GroupedList>
        <Button variant="secondary" size="sm" onClick={() => setIsAddingRoster(true)}>
          {t('team.add_roster')}
        </Button>

        {/* Game Configurations */}
        <GroupedList header={t('team.game_configs')}>
          {team.gameConfigs.length === 0 ? (
            <GroupedListRow last>
              <span className="text-muted-foreground">{t('team.no_configs')}</span>
            </GroupedListRow>
          ) : (
            team.gameConfigs.map((config, i) => (
              <GroupedListRow
                key={config.id}
                onClick={() => setEditingConfig(config)}
                chevron
                last={i === team.gameConfigs.length - 1}
              >
                <div>
                  <div className="text-ios-body font-medium">{config.name}</div>
                  <div className="text-ios-caption1 text-muted-foreground">
                    {t('team.config_summary', {
                      size: config.fieldSize,
                      periods: config.periods,
                      rpp: config.rotationsPerPeriod,
                    })}
                  </div>
                </div>
              </GroupedListRow>
            ))
          )}
        </GroupedList>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsChoosingTemplate(true)}>
            {t('team.add_from_template')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsAddingConfig(true)}>
            {t('team.custom')}
          </Button>
        </div>

        {/* Actions */}
        <GroupedList header={t('team.actions')}>
          <Link to={`/practice?team=${teamId}`}>
            <GroupedListRow chevron>{t('team.practice_planner')}</GroupedListRow>
          </Link>
          <Link to={`/games/new?teamId=${teamId}`}>
            <GroupedListRow chevron>{tGame('history.new_game')}</GroupedListRow>
          </Link>
          <GroupedListRow last onClick={() => setConfirmDeleteTeam(true)}>
            <span className="text-destructive">{t('team.delete')}</span>
          </GroupedListRow>
        </GroupedList>
      </div>

      {/* BottomSheets */}
      <BottomSheet
        open={isAddingRoster}
        onOpenChange={setIsAddingRoster}
        title={t('team.new_roster')}
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="roster-name">{t('team.roster_name')}</Label>
            <Input
              id="roster-name"
              value={newRosterName}
              onChange={(e) => setNewRosterName(e.target.value)}
              placeholder={t('team.roster_name_placeholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddRoster();
              }}
              autoFocus
            />
          </div>
          <Button onClick={handleAddRoster} size="lg" disabled={!newRosterName.trim()}>
            {t('team.create_roster')}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isChoosingTemplate}
        onOpenChange={setIsChoosingTemplate}
        title={t('team.add_from_template')}
      >
        <TemplatePickerSheet
          team={team}
          teamId={teamId ?? ''}
          onSelect={(template) => {
            const config = createConfigFromTemplate(teamId!, template);
            dispatch({ type: 'ADD_GAME_CONFIG', payload: { teamId: teamId!, config } });
            setIsChoosingTemplate(false);
          }}
          onCustom={() => {
            setIsChoosingTemplate(false);
            setIsAddingConfig(true);
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={isAddingConfig}
        onOpenChange={setIsAddingConfig}
        title={t('team.new_config')}
      >
        <GameConfigForm teamId={teamId ?? ''} onSave={handleSaveConfig} />
      </BottomSheet>

      <BottomSheet
        open={!!editingConfig}
        onOpenChange={(open) => {
          if (!open) setEditingConfig(null);
        }}
        title={t('team.edit_config')}
      >
        {editingConfig && (
          <>
            <GameConfigForm
              teamId={teamId ?? ''}
              initialConfig={editingConfig}
              onSave={handleUpdateConfig}
            />
            <div className="pt-6">
              <GroupedList>
                <GroupedListRow last onClick={() => setDeletingConfigId(editingConfig.id)}>
                  <span className="text-destructive block text-center">
                    {t('team.delete_config')}
                  </span>
                </GroupedListRow>
              </GroupedList>
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={isEditing} onOpenChange={setIsEditing} title={t('team.rename')}>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="team-name">{t('team.name_label')}</Label>
            <Input
              id="team-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameTeam();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              aria-label={t('team.name_label')}
              autoFocus
            />
          </div>
          <Button onClick={handleRenameTeam} size="lg" disabled={!editName.trim()}>
            {t('actions.save')}
          </Button>
        </div>
      </BottomSheet>

      {/* IOSAlerts */}
      <IOSAlert
        open={confirmDeleteTeam}
        onOpenChange={setConfirmDeleteTeam}
        title={t('team.delete_title', { name: team.name })}
        message={t('team.delete_message')}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        onConfirm={() => {
          setConfirmDeleteTeam(false);
          handleDeleteTeam();
        }}
        onCancel={() => setConfirmDeleteTeam(false)}
        destructive
      />

      <IOSAlert
        open={deletingConfigId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingConfigId(null);
        }}
        title={t('team.delete_config_title')}
        message={t('team.delete_config_message')}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        onConfirm={() => {
          if (teamId && deletingConfigId) {
            dispatchWithUndo({
              type: 'DELETE_GAME_CONFIG',
              payload: { teamId, configId: deletingConfigId },
            });
          }
          setDeletingConfigId(null);
          setEditingConfig(null);
        }}
        onCancel={() => setDeletingConfigId(null)}
        destructive
      />
    </div>
  );
}

// ─── Template Picker Sheet ────────────────────────────────────────────────────

interface TemplatePickerSheetProps {
  team: import('@/types/domain.ts').Team;
  teamId: string;
  onSelect: (template: GameConfigTemplate) => void;
  onCustom: () => void;
}

function TemplatePickerSheet({ team, onSelect, onCustom }: TemplatePickerSheetProps) {
  const { t } = useTranslation('common');

  const recommendedTemplate = team.birthYear
    ? getGysaTemplateForBirthYear(team.birthYear)
    : undefined;

  const standardTemplates = GAME_CONFIG_TEMPLATES.filter((t) => t.group === 'standard');
  const gysaTemplates = GAME_CONFIG_TEMPLATES.filter((t) => t.group === 'gysa');

  function renderTemplateRow(template: GameConfigTemplate, isLast: boolean) {
    const isRecommended = recommendedTemplate?.name === template.name;
    const subtitle = formatConfigSummary(template);

    return (
      <GroupedListRow
        key={template.name}
        last={isLast}
        onClick={() => onSelect(template)}
        trailing={
          isRecommended ? (
            <span className="text-ios-footnote text-primary font-medium">
              {t('team.template_recommended')}
            </span>
          ) : undefined
        }
      >
        <div>
          <div className="text-ios-body font-medium">{template.name}</div>
          <div className="text-ios-caption1 text-muted-foreground">{subtitle}</div>
        </div>
      </GroupedListRow>
    );
  }

  return (
    <div className="space-y-5 pb-2">
      <GroupedList header={t('team.template_section_standard')}>
        {standardTemplates.map((template, i) =>
          renderTemplateRow(template, i === standardTemplates.length - 1),
        )}
      </GroupedList>

      <GroupedList header={t('team.template_section_gysa')}>
        {gysaTemplates.map((template, i) =>
          renderTemplateRow(template, i === gysaTemplates.length - 1),
        )}
      </GroupedList>

      <GroupedList>
        <GroupedListRow last chevron onClick={onCustom}>
          <span className="text-ios-body">{t('team.custom')}</span>
        </GroupedListRow>
      </GroupedList>
    </div>
  );
}

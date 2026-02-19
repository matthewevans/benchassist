import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
import { createConfigFromTemplate } from '@/utils/gameConfig.ts';
import {
  GAME_CONFIG_TEMPLATES,
  TEAM_GENDER_LABELS,
  TEAM_GENDER_DOT_COLORS,
} from '@/types/domain.ts';
import type { GameConfig, GameConfigId, Roster, TeamGender } from '@/types/domain.ts';
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
  const [isAddingRoster, setIsAddingRoster] = useState(false);
  const [newRosterName, setNewRosterName] = useState('');
  const [isAddingConfig, setIsAddingConfig] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editingConfig, setEditingConfig] = useState<GameConfig | null>(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false);
  const [deletingConfigId, setDeletingConfigId] = useState<GameConfigId | null>(null);

  const team = teamId ? state.teams[teamId] : undefined;

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Team not found</p>
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
        backLabel="Teams"
        trailing={
          <Button
            variant="plain"
            size="sm"
            onClick={() => {
              setEditName(team.name);
              setIsEditing(true);
            }}
          >
            Edit
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 space-y-6 pt-4">
        {/* Team Details */}
        <GroupedList header="Details">
          <GroupedListRow
            trailing={
              <Select
                value={team.gender}
                onValueChange={(v) => handleChangeGender(v as TeamGender)}
              >
                <SelectTrigger className="w-28 h-8">
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
            }
          >
            Gender
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
                  placeholder="e.g., 2017"
                  className="w-24 h-8"
                />
                {team.birthYear && (
                  <span className="text-muted-foreground text-ios-footnote">
                    U{getUAge(team.birthYear)}
                  </span>
                )}
              </div>
            }
          >
            Birth Year
          </GroupedListRow>
        </GroupedList>

        {/* Rosters */}
        <GroupedList header="Rosters">
          {team.rosters.length === 0 ? (
            <GroupedListRow last>
              <span className="text-muted-foreground">No rosters yet</span>
            </GroupedListRow>
          ) : (
            team.rosters.map((roster, i) => (
              <Link key={roster.id} to={`/teams/${teamId}/rosters/${roster.id}`}>
                <GroupedListRow chevron last={i === team.rosters.length - 1}>
                  <div>
                    <div className="text-ios-body font-medium">{roster.name}</div>
                    <div className="text-ios-caption1 text-muted-foreground">
                      {roster.players.length} player{roster.players.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </GroupedListRow>
              </Link>
            ))
          )}
        </GroupedList>
        <Button variant="secondary" size="sm" onClick={() => setIsAddingRoster(true)}>
          Add Roster
        </Button>

        {/* Game Configurations */}
        <GroupedList header="Game Configurations">
          {team.gameConfigs.length === 0 ? (
            <GroupedListRow last>
              <span className="text-muted-foreground">No configurations</span>
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
                    {config.fieldSize}v{config.fieldSize} &middot; {config.periods} periods &middot;{' '}
                    {config.rotationsPerPeriod} rot/period
                  </div>
                </div>
              </GroupedListRow>
            ))
          )}
        </GroupedList>

        {/* Template quick-create buttons */}
        <div className="flex flex-wrap gap-2">
          {GAME_CONFIG_TEMPLATES.map((template) => (
            <Button
              key={template.name}
              variant="secondary"
              size="capsule"
              onClick={() => {
                const config = createConfigFromTemplate(teamId!, template);
                dispatch({ type: 'ADD_GAME_CONFIG', payload: { teamId: teamId!, config } });
              }}
            >
              {template.name}
            </Button>
          ))}
          <Button variant="secondary" size="capsule" onClick={() => setIsAddingConfig(true)}>
            Custom...
          </Button>
        </div>

        {/* Actions */}
        <GroupedList header="Actions">
          <Link to={`/practice?team=${teamId}`}>
            <GroupedListRow chevron>Practice Planner</GroupedListRow>
          </Link>
          <Link to={`/games/new?teamId=${teamId}`}>
            <GroupedListRow chevron>New Game</GroupedListRow>
          </Link>
          <GroupedListRow last onClick={() => setConfirmDeleteTeam(true)}>
            <span className="text-destructive">Delete Team</span>
          </GroupedListRow>
        </GroupedList>
      </div>

      {/* BottomSheets */}
      <BottomSheet open={isAddingRoster} onOpenChange={setIsAddingRoster} title="New Roster">
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
          <Button onClick={handleAddRoster} size="lg" disabled={!newRosterName.trim()}>
            Create Roster
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isAddingConfig}
        onOpenChange={setIsAddingConfig}
        title="New Game Configuration"
      >
        <GameConfigForm teamId={teamId ?? ''} onSave={handleSaveConfig} />
      </BottomSheet>

      <BottomSheet
        open={!!editingConfig}
        onOpenChange={(open) => {
          if (!open) setEditingConfig(null);
        }}
        title="Edit Configuration"
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
                  <span className="text-destructive">Delete Configuration</span>
                </GroupedListRow>
              </GroupedList>
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={isEditing} onOpenChange={setIsEditing} title="Rename Team">
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameTeam();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              aria-label="Team name"
              autoFocus
            />
          </div>
          <Button onClick={handleRenameTeam} size="lg" disabled={!editName.trim()}>
            Save
          </Button>
        </div>
      </BottomSheet>

      {/* IOSAlerts */}
      <IOSAlert
        open={confirmDeleteTeam}
        onOpenChange={setConfirmDeleteTeam}
        title={`Delete "${team.name}"?`}
        message="This will permanently delete the team and all its rosters, configs, and games."
        confirmLabel="Delete"
        cancelLabel="Cancel"
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
        title="Delete configuration?"
        message="This game configuration will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
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

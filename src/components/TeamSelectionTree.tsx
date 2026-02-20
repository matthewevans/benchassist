import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { ChevronRight } from 'lucide-react';
import { useSelectionState } from '@/hooks/useSelectionState.ts';
import type { Game, Team } from '@/types/domain.ts';

interface TeamSelectionTreeProps {
  teams: Team[];
  games: Record<string, Game>;
  selectionState: ReturnType<typeof useSelectionState>;
}

export function TeamSelectionTree({ teams, games, selectionState }: TeamSelectionTreeProps) {
  const { t } = useTranslation('common');
  const { selections, toggleField, getTeamState, toggleTeam, selectAll, clearAll } = selectionState;

  function gameCountForTeam(teamId: string): number {
    return Object.values(games).filter((g) => g.teamId === teamId).length;
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2 text-xs text-muted-foreground mb-2">
        <button type="button" className="hover:underline" onClick={selectAll}>
          {t('actions.select_all')}
        </button>
        <span>·</span>
        <button type="button" className="hover:underline" onClick={clearAll}>
          {t('actions.clear_all')}
        </button>
      </div>

      {teams.map((team) => (
        <TeamRow
          key={team.id}
          team={team}
          gameCount={gameCountForTeam(team.id)}
          parentState={getTeamState(team.id)}
          selection={selections[team.id]}
          onToggleTeam={() => toggleTeam(team.id)}
          onToggleField={(field) => toggleField(team.id, field)}
        />
      ))}
    </div>
  );
}

interface TeamRowProps {
  team: Team;
  gameCount: number;
  parentState: boolean | 'indeterminate';
  selection: { rosters: boolean; configs: boolean; history: boolean };
  onToggleTeam: () => void;
  onToggleField: (field: 'rosters' | 'configs' | 'history') => void;
}

function TeamRow({
  team,
  gameCount,
  parentState,
  selection,
  onToggleTeam,
  onToggleField,
}: TeamRowProps) {
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);
  const playerCount = team.rosters.reduce((sum, r) => sum + r.players.length, 0);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="flex items-center gap-2 py-1.5">
        <Checkbox checked={parentState} onCheckedChange={onToggleTeam} />
        <CollapsibleTrigger className="flex items-center gap-1 flex-1 text-sm font-medium hover:underline text-left">
          <ChevronRight
            className={`size-3.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          {team.name}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="ml-8 space-y-1 pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.rosters}
              onCheckedChange={() => onToggleField('rosters')}
            />
            <span>{t('data.rosters_label')}</span>
            <span className="text-xs text-muted-foreground">
              ({tCommon('player_count', { count: playerCount })})
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.configs}
              onCheckedChange={() => onToggleField('configs')}
            />
            <span>{t('data.configs_label')}</span>
            <span className="text-xs text-muted-foreground">({team.gameConfigs.length})</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.history}
              onCheckedChange={() => onToggleField('history')}
            />
            <span>{t('data.history_label')}</span>
            <span className="text-xs text-muted-foreground">
              ({t('data.game_count', { count: gameCount })})
            </span>
          </label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import { ChevronRight } from 'lucide-react';
import { useSelectionState } from '@/hooks/useSelectionState.ts';
import { downloadJSON, filterStorageData } from '@/storage/exportImport.ts';
import { CURRENT_VERSION, type StorageData } from '@/storage/localStorage.ts';
import type { Game, Team, TeamId } from '@/types/domain.ts';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Record<TeamId, Team>;
  games: Record<string, Game>;
}

export function ExportDialog({ open, onOpenChange, teams, games }: ExportDialogProps) {
  const teamList = Object.values(teams).sort((a, b) => b.updatedAt - a.updatedAt);
  const selectionState = useSelectionState(teamList);
  const { selections, getTeamState, toggleTeam, toggleField, selectAll, clearAll, hasAnySelected } =
    selectionState;

  function gameCountForTeam(teamId: string): number {
    return Object.values(games).filter((g) => g.teamId === teamId).length;
  }

  function handleExport() {
    const data: StorageData = { version: CURRENT_VERSION, teams, games };
    const filtered = filterStorageData(data, selections);
    downloadJSON(filtered, `benchassist-backup-${new Date().toISOString().slice(0, 10)}.json`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Backup</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <div className="flex gap-2 text-xs text-muted-foreground mb-2">
            <button type="button" className="hover:underline" onClick={selectAll}>
              Select all
            </button>
            <span>·</span>
            <button type="button" className="hover:underline" onClick={clearAll}>
              Clear all
            </button>
          </div>

          {teamList.map((team) => (
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={!hasAnySelected}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            <span>Rosters</span>
            <span className="text-xs text-muted-foreground">({playerCount} players)</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.configs}
              onCheckedChange={() => onToggleField('configs')}
            />
            <span>Game Configs</span>
            <span className="text-xs text-muted-foreground">({team.gameConfigs.length})</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={selection.history}
              onCheckedChange={() => onToggleField('history')}
            />
            <span>Game History</span>
            <span className="text-xs text-muted-foreground">({gameCount} games)</span>
          </label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

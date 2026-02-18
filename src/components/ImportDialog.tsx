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
import { ConfirmDialog } from '@/components/ui/confirm-dialog.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { ChevronRight } from 'lucide-react';
import { useSelectionState } from '@/hooks/useSelectionState.ts';
import { filterStorageData } from '@/storage/exportImport.ts';
import type { StorageData } from '@/storage/localStorage.ts';
import type { Team } from '@/types/domain.ts';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importData: StorageData;
  onImportSelected: (filtered: StorageData) => void;
  onReplaceAll: (data: StorageData) => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  importData,
  onImportSelected,
  onReplaceAll,
}: ImportDialogProps) {
  const teamList = Object.values(importData.teams).sort((a, b) => b.updatedAt - a.updatedAt);
  const { selections, toggleField, getTeamState, toggleTeam, selectAll, clearAll, hasAnySelected } =
    useSelectionState(teamList);
  const [confirmReplace, setConfirmReplace] = useState(false);

  function gameCountForTeam(teamId: string): number {
    return Object.values(importData.games).filter((g) => g.teamId === teamId).length;
  }

  function handleImportSelected() {
    const filtered = filterStorageData(importData, selections);
    onImportSelected(filtered);
    onOpenChange(false);
  }

  function handleReplaceAll() {
    onReplaceAll(importData);
    setConfirmReplace(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Backup</DialogTitle>
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

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleImportSelected} disabled={!hasAnySelected} className="w-full">
              Import Selected
            </Button>
            <Separator />
            <Button
              variant="destructive"
              onClick={() => setConfirmReplace(true)}
              className="w-full"
            >
              Replace All Data
            </Button>
            <p className="text-xs text-muted-foreground">
              Deletes all current data and replaces with this backup.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmReplace}
        onConfirm={handleReplaceAll}
        onCancel={() => setConfirmReplace(false)}
        title="Replace all data?"
        description="This will delete all your current teams, rosters, and game history and replace them with the imported backup. This action can be undone."
        confirmLabel="Replace All"
        variant="destructive"
      />
    </>
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

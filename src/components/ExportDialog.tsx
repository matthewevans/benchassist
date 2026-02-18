import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { TeamSelectionTree } from '@/components/TeamSelectionTree.tsx';
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
  const { selections, hasAnySelected } = selectionState;

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

        <TeamSelectionTree teams={teamList} games={games} selectionState={selectionState} />

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

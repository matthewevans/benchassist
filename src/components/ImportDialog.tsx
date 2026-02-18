import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ConfirmDialog } from '@/components/ui/confirm-dialog.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { TeamSelectionTree } from '@/components/TeamSelectionTree.tsx';
import { useSelectionState } from '@/hooks/useSelectionState.ts';
import { filterStorageData } from '@/storage/exportImport.ts';
import type { StorageData } from '@/storage/localStorage.ts';

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
  const selectionState = useSelectionState(teamList);
  const { selections, hasAnySelected } = selectionState;
  const [confirmReplace, setConfirmReplace] = useState(false);

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

          <TeamSelectionTree
            teams={teamList}
            games={importData.games}
            selectionState={selectionState}
          />

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

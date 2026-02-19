import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { Button } from '@/components/ui/button.tsx';
import { IOSAlert } from '@/components/ui/ios-alert.tsx';
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
      <BottomSheet open={open} onOpenChange={onOpenChange} title="Import Backup">
        <TeamSelectionTree
          teams={teamList}
          games={importData.games}
          selectionState={selectionState}
        />

        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={handleImportSelected} disabled={!hasAnySelected} className="w-full">
            Import Selected
          </Button>
          <Button variant="destructive" onClick={() => setConfirmReplace(true)} className="w-full">
            Replace All Data
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Deletes all current data and replaces with this backup.
          </p>
        </div>
      </BottomSheet>

      <IOSAlert
        open={confirmReplace}
        onOpenChange={setConfirmReplace}
        title="Replace all data?"
        message="This will delete all your current teams, rosters, and game history and replace them with the imported backup. This action can be undone."
        confirmLabel="Replace All"
        onConfirm={handleReplaceAll}
        onCancel={() => setConfirmReplace(false)}
        destructive
      />
    </>
  );
}

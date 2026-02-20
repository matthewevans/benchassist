import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('settings');
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
      <BottomSheet open={open} onOpenChange={onOpenChange} title={t('data.import_title')}>
        <TeamSelectionTree
          teams={teamList}
          games={importData.games}
          selectionState={selectionState}
        />

        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={handleImportSelected} disabled={!hasAnySelected} className="w-full">
            {t('data.import_selected')}
          </Button>
          <Button variant="destructive" onClick={() => setConfirmReplace(true)} className="w-full">
            {t('data.replace_all')}
          </Button>
          <p className="text-xs text-muted-foreground text-center">{t('data.replace_all_desc')}</p>
        </div>
      </BottomSheet>

      <IOSAlert
        open={confirmReplace}
        onOpenChange={setConfirmReplace}
        title={t('data.replace_confirm_title')}
        message={t('data.replace_confirm_message')}
        confirmLabel={t('data.replace_confirm')}
        onConfirm={handleReplaceAll}
        onCancel={() => setConfirmReplace(false)}
        destructive
      />
    </>
  );
}

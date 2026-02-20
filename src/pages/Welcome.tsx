import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import { Button } from '@/components/ui/button.tsx';
import { ImportMethodDialog } from '@/components/ImportMethodDialog.tsx';
import { ImportDialog } from '@/components/ImportDialog.tsx';
import { markWelcomed } from '@/storage/welcomed.ts';
import type { StorageData } from '@/storage/localStorage.ts';

interface WelcomeProps {
  onComplete: () => void;
}

export function Welcome({ onComplete }: WelcomeProps) {
  const { t } = useTranslation();
  const dispatchWithUndo = useUndoToast();
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<StorageData | null>(null);

  function handleGetStarted() {
    markWelcomed();
    onComplete();
  }

  function handleImportComplete() {
    markWelcomed();
    onComplete();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <img src="/pwa-192x192.png" alt="" className="size-20 rounded-[18px] mb-4" />
        <h1 className="text-[28px] leading-[34px] tracking-[0.36px] font-semibold mb-2">
          {t('welcome.title')}
        </h1>
        <p className="text-[17px] leading-[22px] tracking-[-0.41px] text-muted-foreground mb-10">
          {t('welcome.subtitle')}
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <Button size="lg" onClick={handleGetStarted}>
          {t('welcome.get_started')}
        </Button>
        <Button variant="plain" size="lg" onClick={() => setIsImporting(true)}>
          {t('welcome.restore_backup')}
        </Button>
      </div>

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
            handleImportComplete();
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
            handleImportComplete();
          }}
        />
      )}
    </div>
  );
}

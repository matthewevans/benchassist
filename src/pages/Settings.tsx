import { useState } from 'react';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { useTheme } from '@/hooks/useTheme.ts';
import type { ThemePreference } from '@/hooks/useTheme.ts';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import { ExportDialog } from '@/components/ExportDialog.tsx';
import { ImportDialog } from '@/components/ImportDialog.tsx';
import { ImportMethodDialog } from '@/components/ImportMethodDialog.tsx';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import type { StorageData } from '@/storage/localStorage.ts';

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function Settings() {
  const { preference, setPreference } = useTheme();
  const { state } = useAppContext();
  const dispatchWithUndo = useUndoToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<StorageData | null>(null);

  return (
    <div>
      <NavBar title="Settings" largeTitle />

      <div className="max-w-4xl mx-auto px-4 md:px-5 space-y-9 pt-4">
        {/* Appearance Section */}
        <section>
          <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            Appearance
          </h2>
          <div className="bg-card rounded-[10px] overflow-hidden">
            {APPEARANCE_OPTIONS.map((option, i) => (
              <button
                key={option.value}
                onClick={() => setPreference(option.value)}
                className={cn(
                  'flex items-center justify-between w-full h-11 px-4 text-ios-body text-left',
                  i < APPEARANCE_OPTIONS.length - 1 && 'border-b border-border/50',
                )}
              >
                <span>{option.label}</span>
                {preference === option.value && <Check className="size-5 text-primary" />}
              </button>
            ))}
          </div>
        </section>

        {/* Data Section */}
        <section>
          <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            Data
          </h2>
          <div className="bg-card rounded-[10px] overflow-hidden">
            <button
              onClick={() => setIsExporting(true)}
              className="flex items-center justify-between w-full h-11 px-4 text-ios-body border-b border-border/50 text-left"
            >
              <span>Export Backup</span>
              <ChevronRight className="size-5 text-[#C7C7CC] dark:text-[#48484A]" />
            </button>
            <button
              onClick={() => setIsImporting(true)}
              className="flex items-center justify-between w-full h-11 px-4 text-ios-body text-left"
            >
              <span>Import Backup</span>
              <ChevronRight className="size-5 text-[#C7C7CC] dark:text-[#48484A]" />
            </button>
          </div>
        </section>

        {/* About Section */}
        <section>
          <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            About
          </h2>
          <div className="bg-card rounded-[10px] overflow-hidden">
            <div className="flex items-center justify-between h-11 px-4 text-ios-body border-b border-border/50">
              <span>Version</span>
              <span className="text-muted-foreground">1.0</span>
            </div>
            <div className="flex items-center justify-between h-11 px-4 text-ios-body">
              <span>Build</span>
              <span className="text-muted-foreground">{__BUILD_HASH__}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Export/Import dialogs */}
      <ExportDialog
        open={isExporting}
        onOpenChange={setIsExporting}
        teams={state.teams}
        games={state.games}
      />

      <ImportMethodDialog
        open={isImporting}
        onOpenChange={setIsImporting}
        onDataLoaded={setImportData}
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
          }}
        />
      )}
    </div>
  );
}

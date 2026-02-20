import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { useTheme } from '@/hooks/useTheme.ts';
import type { ThemePreference } from '@/hooks/useTheme.ts';
import { useLocale } from '@/hooks/useLocale.ts';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { useUndoToast } from '@/hooks/useUndoToast.ts';
import { usePwaUpdate } from '@/hooks/usePwaUpdate.ts';
import { ExportDialog } from '@/components/ExportDialog.tsx';
import { ImportDialog } from '@/components/ImportDialog.tsx';
import { ImportMethodDialog } from '@/components/ImportMethodDialog.tsx';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import type { StorageData } from '@/storage/localStorage.ts';

const APPEARANCE_OPTION_VALUES: ThemePreference[] = ['light', 'dark', 'system'];

export function Settings() {
  const { t } = useTranslation('settings');
  const { preference, setPreference } = useTheme();
  const { locale, setLocale, supportedLocales } = useLocale();
  const { state } = useAppContext();
  const { isUpdateAvailable, applyUpdate } = usePwaUpdate();
  const dispatchWithUndo = useUndoToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<StorageData | null>(null);

  const { t: tCommon } = useTranslation();

  const appearanceOptions = APPEARANCE_OPTION_VALUES.map((value) => ({
    value,
    label: tCommon(`theme.${value}`),
  }));

  return (
    <div>
      <NavBar title={t('title')} largeTitle />

      <div className="max-w-4xl mx-auto px-4 md:px-5 space-y-9 pt-4">
        {/* Appearance Section */}
        <section>
          <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            {t('sections.appearance')}
          </h2>
          <div className="bg-card rounded-[10px] overflow-hidden">
            {appearanceOptions.map((option, i) => (
              <button
                key={option.value}
                onClick={() => setPreference(option.value)}
                className={cn(
                  'flex items-center justify-between w-full h-11 px-4 text-ios-body text-left',
                  i < appearanceOptions.length - 1 && 'border-b border-border/50',
                )}
              >
                <span>{option.label}</span>
                {preference === option.value && <Check className="size-5 text-primary" />}
              </button>
            ))}
          </div>
        </section>

        {/* Language Section */}
        <section>
          <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            {t('sections.language')}
          </h2>
          <div className="bg-card rounded-[10px] overflow-hidden">
            {supportedLocales.map((loc, i) => (
              <button
                key={loc.code}
                onClick={() => setLocale(loc.code)}
                className={cn(
                  'flex items-center justify-between w-full h-11 px-4 text-ios-body text-left',
                  i < supportedLocales.length - 1 && 'border-b border-border/50',
                )}
              >
                <span>{loc.label}</span>
                {locale === loc.code && <Check className="size-5 text-primary" />}
              </button>
            ))}
          </div>
        </section>

        {/* Data Section */}
        <section>
          <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            {t('sections.data')}
          </h2>
          <div className="bg-card rounded-[10px] overflow-hidden">
            <button
              onClick={() => setIsExporting(true)}
              className="flex items-center justify-between w-full h-11 px-4 text-ios-body border-b border-border/50 text-left"
            >
              <span>{t('data.export_backup')}</span>
              <ChevronRight className="size-5 text-[#C7C7CC] dark:text-[#48484A]" />
            </button>
            <button
              onClick={() => setIsImporting(true)}
              className="flex items-center justify-between w-full h-11 px-4 text-ios-body text-left"
            >
              <span>{t('data.import_backup')}</span>
              <ChevronRight className="size-5 text-[#C7C7CC] dark:text-[#48484A]" />
            </button>
          </div>
        </section>

        {/* About Section */}
        <section>
          <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            {t('sections.about')}
          </h2>
          <div className="bg-card rounded-[10px] overflow-hidden">
            <div className="flex items-center justify-between h-11 px-4 text-ios-body border-b border-border/50">
              <span>{t('about.version')}</span>
              <span className="text-muted-foreground">1.0</span>
            </div>
            <div className="flex items-center justify-between h-11 px-4 text-ios-body border-b border-border/50">
              <span>{t('about.build')}</span>
              <span className="text-muted-foreground">{__BUILD_HASH__}</span>
            </div>
            {isUpdateAvailable ? (
              <button
                onClick={() => {
                  void applyUpdate();
                }}
                className="flex items-center justify-between w-full h-11 px-4 text-ios-body text-left active:bg-[#D1D1D6] dark:active:bg-[#3A3A3C] transition-colors"
              >
                <span>{t('about.update_available')}</span>
                <span className="text-primary font-medium">{t('about.refresh')}</span>
              </button>
            ) : (
              <div className="flex items-center justify-between h-11 px-4 text-ios-body">
                <span>{t('about.app_update')}</span>
                <span className="text-muted-foreground">{t('about.up_to_date')}</span>
              </div>
            )}
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

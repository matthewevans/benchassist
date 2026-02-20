import { cloneElement, isValidElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { parsePlayerImport } from '@/utils/parsePlayerImport.ts';
import type { Player, SkillRanking } from '@/types/domain.ts';

export interface ImportRow {
  name: string;
  skillRanking: SkillRanking;
  canPlayGoalie: boolean;
  existingPlayerId: string | null;
  error: string | null;
}

interface PlayerImportDialogProps {
  existingPlayers: Player[];
  onImport: (rows: ImportRow[]) => void;
  trigger: React.ReactNode;
}

export function PlayerImportDialog({
  existingPlayers,
  onImport,
  trigger,
}: PlayerImportDialogProps) {
  const { t } = useTranslation('roster');
  const { t: tCommon } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStep, setImportStep] = useState<'paste' | 'preview'>('paste');
  const [importRows, setImportRows] = useState<ImportRow[]>([]);

  function handleClose() {
    setOpen(false);
    setImportText('');
    setImportStep('paste');
    setImportRows([]);
  }

  function handleParse() {
    const parsed = parsePlayerImport(importText);
    const rows: ImportRow[] = parsed.map((p) => {
      if ('error' in p) {
        return {
          name: p.name,
          skillRanking: 3,
          canPlayGoalie: false,
          existingPlayerId: null,
          error: p.error,
        };
      }
      const existing = existingPlayers.find((rp) => rp.name.toLowerCase() === p.name.toLowerCase());
      return {
        name: p.name,
        skillRanking: p.skillRanking,
        canPlayGoalie: existing?.canPlayGoalie ?? false,
        existingPlayerId: existing?.id ?? null,
        error: null,
      };
    });
    setImportRows(rows);
    setImportStep('preview');
  }

  function handleSave() {
    const validRows = importRows.filter((r) => !r.error);
    onImport(validRows);
    handleClose();
  }

  function updateRow(index: number, updates: Partial<ImportRow>) {
    setImportRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  }

  function removeRow(index: number) {
    setImportRows((rows) => rows.filter((_, i) => i !== index));
  }

  return (
    <>
      {isValidElement(trigger)
        ? cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, {
            onClick: () => setOpen(true),
          })
        : trigger}

      <BottomSheet
        open={open}
        onOpenChange={(o) => {
          if (!o) handleClose();
        }}
        title={importStep === 'paste' ? t('import_players') : t('review_import')}
        footer={
          importStep === 'paste' ? (
            <Button onClick={handleParse} className="w-full" disabled={!importText.trim()}>
              {t('import_preview_btn')}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportStep('paste')} className="flex-1">
                {tCommon('actions.back')}
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={importRows.filter((r) => !r.error).length === 0}
              >
                {t('import_add', { count: importRows.filter((r) => !r.error).length })}
              </Button>
            </div>
          )
        }
      >
        {importStep === 'paste' ? (
          <div className="space-y-2 pt-2">
            <Label htmlFor="import-text">{t('import_paste_label')}</Label>
            {/* font-size must be ≥16px to prevent iOS Safari viewport zoom on focus */}
            <textarea
              id="import-text"
              className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-base font-mono"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={t('import_placeholder')}
            />
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {importRows.map((row, i) => (
              <div key={i} className="flex min-h-11 items-center gap-2">
                {row.error ? (
                  <div className="flex-1 flex items-center gap-2 text-ios-body text-destructive">
                    <span className="truncate">{row.name}</span>
                    <span className="text-ios-caption1">({row.error})</span>
                  </div>
                ) : (
                  <>
                    <Input
                      value={row.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                      className="flex-1 text-ios-body"
                    />
                    <Select
                      value={String(row.skillRanking)}
                      onValueChange={(v) =>
                        updateRow(i, { skillRanking: Number(v) as SkillRanking })
                      }
                    >
                      <SelectTrigger className="w-16 min-h-11 text-ios-body">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {([1, 2, 3, 4, 5] as const).map((rank) => (
                          <SelectItem key={rank} value={String(rank)}>
                            {rank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Checkbox
                      checked={row.canPlayGoalie}
                      onCheckedChange={(checked) =>
                        updateRow(i, { canPlayGoalie: checked as boolean })
                      }
                      aria-label={t('can_play_goalie_aria')}
                    />
                    {row.existingPlayerId ? (
                      <Badge variant="secondary" className="text-ios-caption2 shrink-0">
                        {t('import_update')}
                      </Badge>
                    ) : (
                      <Badge className="text-ios-caption2 shrink-0">{t('import_new')}</Badge>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive shrink-0"
                  onClick={() => removeRow(i)}
                  aria-label={t('import_remove_aria')}
                >
                  X
                </Button>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>
    </>
  );
}

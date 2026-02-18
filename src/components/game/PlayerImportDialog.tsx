import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{importStep === 'paste' ? 'Import Players' : 'Review Import'}</DialogTitle>
        </DialogHeader>

        {importStep === 'paste' ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="import-text">Paste player list (Name: Skill per line)</Label>
              <textarea
                id="import-text"
                className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'Sloane: 4\nElla: 3\nKendall: 5'}
                autoFocus
              />
            </div>
            <Button onClick={handleParse} className="w-full" disabled={!importText.trim()}>
              Preview
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              {importRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  {row.error ? (
                    <div className="flex-1 flex items-center gap-2 text-sm text-destructive">
                      <span className="truncate">{row.name}</span>
                      <span className="text-xs">({row.error})</span>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(i, { name: e.target.value })}
                        className="flex-1 h-8 text-sm"
                      />
                      <Select
                        value={String(row.skillRanking)}
                        onValueChange={(v) =>
                          updateRow(i, { skillRanking: Number(v) as SkillRanking })
                        }
                      >
                        <SelectTrigger className="w-16 h-8 text-sm">
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
                        aria-label="Can play goalie"
                      />
                      {row.existingPlayerId ? (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Update
                        </Badge>
                      ) : (
                        <Badge className="text-xs shrink-0">New</Badge>
                      )}
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive shrink-0"
                    onClick={() => removeRow(i)}
                    aria-label="Remove player"
                  >
                    X
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportStep('paste')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
                disabled={importRows.filter((r) => !r.error).length === 0}
              >
                Import {importRows.filter((r) => !r.error).length} Players
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

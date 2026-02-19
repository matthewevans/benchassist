import { useState } from 'react';
import { Check } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { Button } from '@/components/ui/button.tsx';
import { TeamSelectionTree } from '@/components/TeamSelectionTree.tsx';
import { useSelectionState } from '@/hooks/useSelectionState.ts';
import { shareOrDownloadJSON, exportToBase64, filterStorageData } from '@/storage/exportImport.ts';
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
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [didCopy, setDidCopy] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCopiedText(null);
      setDidCopy(false);
    }
    onOpenChange(nextOpen);
  }

  async function handleShare() {
    const data: StorageData = { version: CURRENT_VERSION, teams, games };
    const filtered = filterStorageData(data, selections);
    try {
      await shareOrDownloadJSON(filtered);
    } catch {
      // User cancelled the share sheet
      return;
    }
    handleOpenChange(false);
  }

  async function handleCopyAsText() {
    const data: StorageData = { version: CURRENT_VERSION, teams, games };
    const filtered = filterStorageData(data, selections);
    const base64 = exportToBase64(filtered);
    try {
      await navigator.clipboard.writeText(base64);
      setDidCopy(true);
    } catch {
      // Clipboard failed — user can still copy from the textarea
    }
    setCopiedText(base64);
  }

  async function handleCopyAgain() {
    if (!copiedText) return;
    try {
      await navigator.clipboard.writeText(copiedText);
      setDidCopy(true);
    } catch {
      // Clipboard failed — user can still copy from the textarea
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={handleOpenChange} title="Export Backup">
      {copiedText === null ? (
        <>
          <TeamSelectionTree teams={teamList} games={games} selectionState={selectionState} />

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={handleShare} disabled={!hasAnySelected} className="w-full">
              Share
            </Button>
            <Button
              variant="plain"
              onClick={handleCopyAsText}
              disabled={!hasAnySelected}
              className="w-full"
            >
              Copy as Text
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1 py-2">
            {didCopy && <Check className="size-6 text-primary" />}
            <p className="text-ios-body font-medium">
              {didCopy ? 'Copied to Clipboard' : 'Copy the text below'}
            </p>
          </div>

          <textarea
            readOnly
            value={copiedText}
            onFocus={(e) => e.currentTarget.select()}
            className="bg-secondary rounded-lg p-3 font-mono text-ios-footnote text-secondary-foreground h-32 w-full resize-none outline-none"
          />

          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={handleCopyAgain} className="w-full">
              Copy Again
            </Button>
            <Button variant="plain" onClick={() => handleOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

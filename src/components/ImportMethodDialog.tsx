import { useRef, useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Button } from '@/components/ui/button.tsx';
import { FileText, ClipboardPaste } from 'lucide-react';
import { readJSONFile, importFromBase64 } from '@/storage/exportImport.ts';
import type { StorageData } from '@/storage/localStorage.ts';

type View = 'choose' | 'paste';

interface ImportMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataLoaded: (data: StorageData) => void;
}

export function ImportMethodDialog({ open, onOpenChange, onDataLoaded }: ImportMethodDialogProps) {
  const [view, setView] = useState<View>('choose');
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setView('choose');
      setPasteText('');
      setError(null);
    }
    onOpenChange(isOpen);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const data = await readJSONFile(file);
      onDataLoaded(data);
      handleClose(false);
    } catch {
      setError('Invalid backup file.');
    }
  }

  function handleLoadText() {
    setError(null);
    try {
      const data = importFromBase64(pasteText);
      onDataLoaded(data);
      handleClose(false);
    } catch {
      setError('Invalid backup data. Check that you copied the full text.');
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={handleClose} title="Import Backup">
      {view === 'choose' ? (
        <GroupedList>
          <GroupedListRow onClick={() => fileInputRef.current?.click()} chevron>
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-primary" />
              <span>Choose File</span>
            </div>
          </GroupedListRow>
          <GroupedListRow onClick={() => setView('paste')} chevron last>
            <div className="flex items-center gap-3">
              <ClipboardPaste className="size-5 text-primary" />
              <span>Paste Text</span>
            </div>
          </GroupedListRow>
        </GroupedList>
      ) : (
        <div className="flex flex-col gap-4">
          <textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setError(null);
            }}
            placeholder="Paste backup text here…"
            className="w-full h-40 p-3 rounded-lg bg-secondary text-ios-body font-mono resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {error && <p className="text-ios-footnote text-destructive px-1">{error}</p>}
          <Button onClick={handleLoadText} disabled={!pasteText.trim()} className="w-full">
            Load Backup
          </Button>
          <Button
            variant="plain"
            onClick={() => {
              setView('choose');
              setPasteText('');
              setError(null);
            }}
            className="w-full"
          >
            Back
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelect}
      />
    </BottomSheet>
  );
}

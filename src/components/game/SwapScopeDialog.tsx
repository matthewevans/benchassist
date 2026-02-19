import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { Button } from '@/components/ui/button.tsx';

interface SwapScopeDialogProps {
  open: boolean;
  playerA: string;
  playerB: string;
  onThisRotation: () => void;
  onAllRemaining: () => void;
  onCancel: () => void;
}

export function SwapScopeDialog({
  open,
  playerA,
  playerB,
  onThisRotation,
  onAllRemaining,
  onCancel,
}: SwapScopeDialogProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
      title={`Swap ${playerA} and ${playerB}`}
    >
      <p className="text-ios-footnote text-muted-foreground text-center pb-4">
        Apply this swap to just this rotation, or to all remaining rotations?
      </p>
      <div className="flex flex-col gap-2">
        <Button onClick={onAllRemaining} className="w-full">
          All Remaining
        </Button>
        <Button variant="secondary" onClick={onThisRotation} className="w-full">
          Just This Rotation
        </Button>
        <Button variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </Button>
      </div>
    </BottomSheet>
  );
}

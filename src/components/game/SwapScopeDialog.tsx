import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
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
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            Swap {playerA} and {playerB}
          </DialogTitle>
          <DialogDescription>
            Apply this swap to just this rotation, or to all remaining rotations?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onThisRotation}>
            Just This Rotation
          </Button>
          <Button onClick={onAllRemaining}>All Remaining</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

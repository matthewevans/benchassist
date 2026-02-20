import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('game');

  return (
    <BottomSheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
      title={t('swap.title', { playerA, playerB })}
    >
      <p className="text-ios-footnote text-muted-foreground text-center pb-4">
        {t('swap.instruction')}
      </p>
      <div className="flex flex-col gap-2">
        <Button onClick={onAllRemaining} className="w-full">
          {t('swap.all_remaining')}
        </Button>
        <Button variant="secondary" onClick={onThisRotation} className="w-full">
          {t('swap.just_this')}
        </Button>
        <Button variant="outline" onClick={onCancel} className="w-full">
          {t('swap.cancel')}
        </Button>
      </div>
    </BottomSheet>
  );
}

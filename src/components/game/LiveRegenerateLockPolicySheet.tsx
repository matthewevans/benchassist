import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Button } from '@/components/ui/button.tsx';

export type LiveLockPolicy = 'off' | 'hard-only' | 'hard+soft';

interface LiveRegenerateLockPolicySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: LiveLockPolicy;
  onPolicyChange: (policy: LiveLockPolicy) => void;
  onConfirm: (policy: LiveLockPolicy) => void;
}

export function LiveRegenerateLockPolicySheet({
  open,
  onOpenChange,
  policy,
  onPolicyChange,
  onConfirm,
}: LiveRegenerateLockPolicySheetProps) {
  const { t } = useTranslation('game');

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('direct_entry.live_lock_policy_title')}
      description={t('direct_entry.live_lock_policy_desc')}
      footer={
        <Button
          className="w-full"
          onClick={() => {
            onConfirm(policy);
            onOpenChange(false);
          }}
        >
          {t('live.regenerate')}
        </Button>
      }
    >
      <GroupedList>
        <GroupedListRow
          onClick={() => onPolicyChange('off')}
          trailing={policy === 'off' ? <Check className="size-5 text-primary" /> : undefined}
        >
          <div>
            <p className="text-ios-body">{t('direct_entry.lock_policy_off')}</p>
            <p className="text-ios-caption1 text-muted-foreground">
              {t('direct_entry.lock_policy_off_desc')}
            </p>
          </div>
        </GroupedListRow>
        <GroupedListRow
          onClick={() => onPolicyChange('hard-only')}
          trailing={policy === 'hard-only' ? <Check className="size-5 text-primary" /> : undefined}
        >
          <div>
            <p className="text-ios-body">{t('direct_entry.lock_policy_hard_only')}</p>
            <p className="text-ios-caption1 text-muted-foreground">
              {t('direct_entry.lock_policy_hard_only_desc')}
            </p>
          </div>
        </GroupedListRow>
        <GroupedListRow
          last
          onClick={() => onPolicyChange('hard+soft')}
          trailing={policy === 'hard+soft' ? <Check className="size-5 text-primary" /> : undefined}
        >
          <div>
            <p className="text-ios-body">{t('direct_entry.lock_policy_hard_soft')}</p>
            <p className="text-ios-caption1 text-muted-foreground">
              {t('direct_entry.lock_policy_hard_soft_desc')}
            </p>
          </div>
        </GroupedListRow>
      </GroupedList>
    </BottomSheet>
  );
}

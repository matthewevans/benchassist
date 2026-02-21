import { CheckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';

interface PeriodDivisionSheetProps {
  open: boolean;
  periodIndex: number | null;
  currentDivision: number | null;
  onSelectDivision: (division: number) => void;
  onOpenChange: (open: boolean) => void;
  isDivisionEnabled: (division: number) => boolean;
}

export function PeriodDivisionSheet({
  open,
  periodIndex,
  currentDivision,
  onSelectDivision,
  onOpenChange,
  isDivisionEnabled,
}: PeriodDivisionSheetProps) {
  const { t } = useTranslation('game');
  const options = [1, 2, 3, 4, 5, 6];
  const showPeriod = periodIndex != null ? periodIndex + 1 : null;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('period_division.title', { period: showPeriod ?? '-' })}
    >
      <p className="text-ios-footnote text-muted-foreground text-center pb-4">
        {t('period_division.instruction')}
      </p>

      <GroupedList header={t('period_division.options_header')}>
        {options.map((division, idx) => {
          const isCurrent = currentDivision === division;
          const enabled = isDivisionEnabled(division);

          return (
            <GroupedListRow
              key={division}
              onClick={enabled ? () => onSelectDivision(division) : undefined}
              trailing={
                isCurrent ? (
                  <CheckIcon className="size-4 text-primary" />
                ) : !enabled ? (
                  <span className="text-ios-caption1 text-muted-foreground">
                    {t('period_division.unavailable')}
                  </span>
                ) : undefined
              }
              last={idx === options.length - 1}
              className={!enabled ? 'opacity-60' : undefined}
            >
              {t('period_division.option', { count: division })}
            </GroupedListRow>
          );
        })}
      </GroupedList>
    </BottomSheet>
  );
}

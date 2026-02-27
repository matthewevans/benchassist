import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils.ts';

export interface PeriodRotationGroup {
  periodIndex: number;
  rotations: { index: number }[];
}

interface PeriodRotationIndicatorProps {
  periodGroups: PeriodRotationGroup[];
  currentRotationIndex: number;
  className?: string;
}

export function PeriodRotationIndicator({
  periodGroups,
  currentRotationIndex,
  className,
}: PeriodRotationIndicatorProps) {
  const { t } = useTranslation('game');
  const totalRotations = periodGroups.reduce((sum, group) => sum + group.rotations.length, 0);
  const currentPeriodIndex =
    periodGroups.find((group) =>
      group.rotations.some((rotation) => rotation.index === currentRotationIndex),
    )?.periodIndex ?? 0;

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2.5 overflow-x-auto py-0.5 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      role="status"
      aria-label={t('live.rotation_progress', {
        current: currentRotationIndex + 1,
        total: totalRotations,
        period: currentPeriodIndex + 1,
      })}
      title={t('live.rotation_progress_title', {
        current: currentRotationIndex + 1,
        total: totalRotations,
        period: currentPeriodIndex + 1,
      })}
    >
      {periodGroups.map((group) => {
        const isCurrentPeriod = group.periodIndex === currentPeriodIndex;
        const isPastPeriod = group.periodIndex < currentPeriodIndex;
        return (
          <div
            key={group.periodIndex}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-1.5 py-1 transition-colors',
              isCurrentPeriod && 'bg-primary/10 border-primary/30',
              isPastPeriod && 'bg-secondary/45 border-border/35',
              !isCurrentPeriod && !isPastPeriod && 'bg-secondary/25 border-border/25',
            )}
            aria-label={t('field.period_label', { period: group.periodIndex + 1 })}
          >
            <span
              className={cn(
                'text-[10px] font-semibold tabular-nums',
                isCurrentPeriod && 'text-primary',
                isPastPeriod && 'text-foreground/75',
                !isCurrentPeriod && !isPastPeriod && 'text-muted-foreground',
              )}
            >
              {t('field.period_label', { period: group.periodIndex + 1 })}
            </span>
            <div className="flex items-center gap-0.5">
              {group.rotations.map((rotation) => {
                const isPast = rotation.index < currentRotationIndex;
                const isCurrent = rotation.index === currentRotationIndex;
                return (
                  <div
                    key={rotation.index}
                    className={cn(
                      'h-2 w-3 rounded-sm transition-colors',
                      isCurrent && 'bg-primary',
                      isPast && 'bg-primary/50',
                      !isPast && !isCurrent && 'bg-muted-foreground/35',
                    )}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

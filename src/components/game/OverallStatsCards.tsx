import { useState } from 'react';
import { CircleHelpIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils.ts';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { RotationSchedule } from '@/types/domain.ts';

interface OverallStatsCardsProps {
  stats: RotationSchedule['overallStats'];
}

export function OverallStatsCards({ stats }: OverallStatsCardsProps) {
  const { t } = useTranslation('game');
  const [showDetails, setShowDetails] = useState(false);
  const spread = Math.max(0, stats.maxStrength - stats.minStrength);

  function formatValue(value: number): string {
    if (!Number.isFinite(value)) return '0';
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
  }

  const balanceKey =
    spread <= 2
      ? 'balance_very_steady'
      : spread <= 4
        ? 'balance_steady'
        : spread <= 6
          ? 'balance_mixed'
          : 'balance_uneven';
  const balanceClass =
    spread <= 2
      ? 'text-emerald-700 dark:text-emerald-300'
      : spread <= 4
        ? 'text-teal-700 dark:text-teal-300'
        : spread <= 6
          ? 'text-amber-700 dark:text-amber-300'
          : 'text-rose-700 dark:text-rose-300';
  const balanceTipKey =
    spread <= 2
      ? 'balance_tip_very_steady'
      : spread <= 4
        ? 'balance_tip_steady'
        : spread <= 6
          ? 'balance_tip_mixed'
          : 'balance_tip_uneven';

  return (
    <section>
      <h3 className="text-ios-footnote font-normal text-muted-foreground uppercase pb-1.5">
        {t('schedule.overview')}
      </h3>
      <div className="rounded-[10px] border border-border/50 bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-ios-caption1 text-muted-foreground">{t('schedule.balance_label')}</p>
            <p className={cn('text-ios-title3 font-semibold', balanceClass)}>
              {t(`schedule.${balanceKey}`)}
            </p>
            <p className="mt-0.5 text-ios-caption1 text-muted-foreground">
              {t(`schedule.${balanceTipKey}`)}
            </p>
          </div>
          <Button
            type="button"
            variant="plain"
            size="xs"
            className="px-2 text-ios-caption1 text-primary"
            onClick={() => setShowDetails((prev) => !prev)}
          >
            {showDetails ? t('schedule.hide_details') : t('schedule.show_details')}
          </Button>
        </div>

        <div className="mt-3 rounded-[10px] bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <p className="text-ios-caption1 text-muted-foreground">
              {t('schedule.strength_range')}
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:bg-accent/60"
                  aria-label={t('schedule.strength_range_help_button')}
                >
                  <CircleHelpIcon className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-3">
                <PopoverHeader>
                  <PopoverTitle className="text-ios-subheadline">
                    {t('schedule.strength_range')}
                  </PopoverTitle>
                  <PopoverDescription className="text-ios-caption1">
                    {t('schedule.strength_range_help')}
                  </PopoverDescription>
                </PopoverHeader>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-ios-title3 font-semibold tabular-nums text-foreground">
            {formatValue(spread)}
          </p>
          <p className="text-ios-caption2 tabular-nums text-muted-foreground">
            {t('schedule.min_max_inline', {
              min: formatValue(stats.minStrength),
              max: formatValue(stats.maxStrength),
            })}
          </p>
        </div>

        {showDetails && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-[10px] bg-muted/40 px-3 py-2">
              <p className="text-ios-caption1 text-muted-foreground">
                {t('schedule.avg_strength')}
              </p>
              <p className="text-ios-subheadline tabular-nums text-foreground">
                {formatValue(stats.avgStrength)}
              </p>
            </div>
            <div className="rounded-[10px] bg-muted/40 px-3 py-2">
              <p className="text-ios-caption1 text-muted-foreground">
                {t('schedule.consistency_label')}
              </p>
              <p className="text-ios-subheadline tabular-nums text-foreground">
                {formatValue(stats.strengthVariance)}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, CircleHelpIcon } from 'lucide-react';
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

  return (
    <section>
      <h3 className="text-ios-footnote font-normal text-muted-foreground uppercase pb-1.5">
        {t('schedule.overview')}
      </h3>
      <div className="rounded-[10px] bg-card px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('text-ios-headline font-semibold', balanceClass)}>
            {t(`schedule.${balanceKey}`)}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-ios-footnote tabular-nums text-muted-foreground">
              {t('schedule.spread_inline', {
                value: formatValue(spread),
                min: formatValue(stats.minStrength),
                max: formatValue(stats.maxStrength),
              })}
            </span>
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
              <PopoverContent align="end" className="w-64 p-3">
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
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:bg-accent/60"
              onClick={() => setShowDetails((prev) => !prev)}
              aria-label={showDetails ? t('schedule.hide_details') : t('schedule.show_details')}
            >
              {showDetails ? (
                <ChevronUpIcon className="size-4" />
              ) : (
                <ChevronDownIcon className="size-4" />
              )}
            </button>
          </div>
        </div>
        {showDetails && (
          <p className="mt-1 text-ios-caption1 text-muted-foreground">
            {t('schedule.details_inline', {
              avg: formatValue(stats.avgStrength),
              consistency: formatValue(stats.strengthVariance),
            })}
          </p>
        )}
      </div>
    </section>
  );
}

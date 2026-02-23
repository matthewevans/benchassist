import { useTranslation } from 'react-i18next';
import { ChartNoAxesColumnIncreasingIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import type { OptimizationSuggestion } from '@/utils/divisionOptimizer.ts';

interface PlaytimeOptimizeBannerProps {
  suggestion: OptimizationSuggestion;
  onOptimize: () => void;
  onDismiss: () => void;
  isRunning?: boolean;
}

export function PlaytimeOptimizeBanner({
  suggestion,
  onOptimize,
  onDismiss,
  isRunning,
}: PlaytimeOptimizeBannerProps) {
  const { t } = useTranslation('game');
  const { t: tCommon } = useTranslation('common');
  const recommended = suggestion.options[0];

  if (!recommended) return null;

  return (
    <div className="rounded-[10px] bg-primary/8 dark:bg-primary/12 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 dark:bg-primary/20">
          <ChartNoAxesColumnIncreasingIcon className="size-3.5 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-ios-subheadline font-semibold text-foreground">
              {t('optimize.headline')}
            </p>
            <button
              type="button"
              className="-mt-0.5 -mr-1 inline-flex min-h-11 min-w-11 items-center justify-center shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground active:bg-accent/60"
              onClick={onDismiss}
              aria-label={tCommon('actions.close')}
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <p className="mt-0.5 text-ios-footnote text-muted-foreground">
            {t(suggestion.options.length > 1 ? 'optimize.detail_multi' : 'optimize.detail_single', {
              optionCount: suggestion.options.length,
              extraCount: recommended.expectedExtraCount,
              maxPercent: Math.round(recommended.expectedMaxPercent),
              currentExtra: suggestion.currentExtraCount,
              currentMax: Math.round(suggestion.currentMaxPercent),
            })}
          </p>

          <button
            type="button"
            className="mt-1 inline-flex min-h-11 items-center gap-0.5 rounded-md pr-2 text-ios-subheadline font-medium text-primary active:bg-accent/60 disabled:opacity-50"
            onClick={onOptimize}
            disabled={isRunning}
          >
            {t('optimize.action')}
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

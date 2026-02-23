import { useMemo } from 'react';
import { CheckIcon, ChartNoAxesColumnIncreasingIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  getOptimizationOptionKey,
  type OptimizationSuggestion,
} from '@/utils/divisionOptimizer.ts';

interface OptimizeDivisionsSheetProps {
  open: boolean;
  suggestion: OptimizationSuggestion | null;
  currentDivisions: number[];
  selectedOptionKey: string | null;
  failedOptionKeys: string[];
  optimizeError: string | null;
  isRunning: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectOption: (optionKey: string) => void;
  onConfirm: () => void;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function getChangedPeriods(periodDivisions: number[], currentDivisions: number[]): number[] {
  const changed: number[] = [];
  for (let i = 0; i < periodDivisions.length; i++) {
    if ((periodDivisions[i] ?? 1) !== (currentDivisions[i] ?? 1)) {
      changed.push(i + 1);
    }
  }
  return changed;
}

function formatRotationDelta(delta: number): string {
  if (delta === 0) return '0';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function OptimizeDivisionsSheet({
  open,
  suggestion,
  currentDivisions,
  selectedOptionKey,
  failedOptionKeys,
  optimizeError,
  isRunning,
  onOpenChange,
  onSelectOption,
  onConfirm,
}: OptimizeDivisionsSheetProps) {
  const { t } = useTranslation('game');
  const { t: tCommon } = useTranslation('common');

  const recommendedOption = suggestion?.options[0] ?? null;
  const groupedOptions = useMemo(() => {
    if (!suggestion) return [];
    const groups = new Map<number, OptimizationSuggestion['options']>();

    for (const option of suggestion.options) {
      const group = groups.get(option.addedRotations) ?? [];
      group.push(option);
      groups.set(option.addedRotations, group);
    }

    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [suggestion]);

  if (!suggestion || !recommendedOption) return null;

  const failedKeys = new Set(failedOptionKeys);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('optimize.sheet_title')}
      description={t('optimize.sheet_desc')}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRunning}>
            {tCommon('actions.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={!selectedOptionKey || isRunning}>
            {isRunning ? t('live.solving') : t('optimize.preview_option')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="rounded-[10px] bg-primary/8 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <ChartNoAxesColumnIncreasingIcon className="size-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-ios-subheadline font-semibold text-foreground">
                {t('optimize.recommended_title')}
              </p>
              <p className="text-ios-footnote text-muted-foreground">
                {t('optimize.recommended_detail', {
                  addedRotations: recommendedOption.addedRotations,
                  periodsChanged: recommendedOption.periodsChanged,
                  improvement: formatNumber(recommendedOption.gapImprovement),
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[10px] border border-border/50 bg-card px-3 py-2">
            <p className="text-ios-caption1 text-muted-foreground">{t('optimize.current_label')}</p>
            <p className="text-ios-subheadline tabular-nums text-foreground">
              {t('optimize.current_summary_compact', {
                gap: formatNumber(suggestion.currentGap),
                maxPercent: formatNumber(suggestion.currentMaxPercent),
              })}
            </p>
            <p className="text-ios-caption2 text-muted-foreground">
              {t('optimize.current_rotations', { count: suggestion.currentTotalRotations })}
            </p>
          </div>
          <div className="rounded-[10px] border border-primary/25 bg-primary/5 px-3 py-2">
            <p className="text-ios-caption1 text-muted-foreground">{t('optimize.preview_label')}</p>
            <p className="text-ios-subheadline tabular-nums text-foreground">
              {t('optimize.preview_summary_compact', {
                gap: formatNumber(recommendedOption.expectedGap),
                maxPercent: formatNumber(recommendedOption.expectedMaxPercent),
              })}
            </p>
            <p className="text-ios-caption2 text-muted-foreground">
              {t('optimize.current_rotations', { count: recommendedOption.totalRotations })}
            </p>
          </div>
        </div>

        {optimizeError && (
          <div className="rounded-[10px] bg-destructive/10 px-3 py-2">
            <p className="text-ios-caption1 text-destructive">{optimizeError}</p>
          </div>
        )}

        {groupedOptions.map(([addedRotations, options]) => (
          <GroupedList
            key={addedRotations}
            header={t('optimize.group_header', {
              addedRotations: formatRotationDelta(addedRotations),
            })}
          >
            {options.map((option, index) => {
              const optionKey = getOptimizationOptionKey(option.periodDivisions);
              const selected = optionKey === selectedOptionKey;
              const failed = failedKeys.has(optionKey);
              const isRecommended =
                optionKey === getOptimizationOptionKey(recommendedOption.periodDivisions);

              return (
                <GroupedListRow
                  key={optionKey}
                  last={index === options.length - 1}
                  onClick={() => onSelectOption(optionKey)}
                  trailing={selected ? <CheckIcon className="size-4 text-primary" /> : undefined}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-ios-subheadline text-foreground">
                        {(() => {
                          const changed = getChangedPeriods(
                            option.periodDivisions,
                            currentDivisions,
                          );
                          if (changed.length === 0)
                            return option.periodDivisions.map((d) => `${d}`).join('-');
                          if (changed.length === 1)
                            return t('optimize.change_split_one', { period: changed[0] });
                          const last = changed[changed.length - 1];
                          const rest = changed.slice(0, -1).join(', ');
                          return t('optimize.change_split_multi', { periods: rest, last });
                        })()}
                      </p>
                      {isRecommended && (
                        <span className="shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] leading-[13px] tracking-[0.07px] text-primary">
                          {t('optimize.recommended_badge')}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-ios-caption1 tabular-nums text-muted-foreground">
                      {t('optimize.option_summary', {
                        gap: formatNumber(option.expectedGap),
                        maxPercent: formatNumber(option.expectedMaxPercent),
                        minPercent: formatNumber(option.expectedMinPercent),
                      })}
                    </p>
                    {failed && (
                      <p className="text-ios-caption1 text-destructive">
                        {t('optimize.option_failed')}
                      </p>
                    )}
                  </div>
                </GroupedListRow>
              );
            })}
          </GroupedList>
        ))}
      </div>
    </BottomSheet>
  );
}

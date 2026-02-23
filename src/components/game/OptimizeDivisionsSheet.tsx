import { useMemo, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
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
  const [showCompareOptions, setShowCompareOptions] = useState(false);
  const [showAllOptionGroups, setShowAllOptionGroups] = useState(false);

  const recommendedOption = suggestion?.options[0] ?? null;
  const selectedOption = useMemo(() => {
    if (!suggestion || suggestion.options.length === 0) return null;
    if (!selectedOptionKey) return suggestion.options[0] ?? null;
    return (
      suggestion.options.find(
        (option) => getOptimizationOptionKey(option.periodDivisions) === selectedOptionKey,
      ) ?? suggestion.options[0] ?? null
    );
  }, [suggestion, selectedOptionKey]);
  const selectedOptionKeyResolved = useMemo(
    () => getOptimizationOptionKey(selectedOption?.periodDivisions ?? []),
    [selectedOption],
  );
  const recommendedOptionKey = useMemo(
    () => getOptimizationOptionKey(recommendedOption?.periodDivisions ?? []),
    [recommendedOption],
  );
  const summaryOption = showCompareOptions ? selectedOption : recommendedOption;
  const summaryOptionKey = showCompareOptions ? selectedOptionKeyResolved : recommendedOptionKey;
  const summaryIsRecommended = summaryOptionKey === recommendedOptionKey;
  const formatOptionChangeLabel = (periodDivisions: number[]) => {
    const changed = getChangedPeriods(periodDivisions, currentDivisions);
    if (changed.length === 0) return periodDivisions.map((d) => `${d}`).join('-');
    if (changed.length === 1) return t('optimize.change_split_one', { period: changed[0] });
    const last = changed[changed.length - 1];
    const rest = changed.slice(0, -1).join(', ');
    return t('optimize.change_split_multi', { periods: rest, last });
  };
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
  const visibleOptionGroups = useMemo(() => {
    if (showAllOptionGroups) return groupedOptions;
    const primaryGroups = groupedOptions.filter(([addedRotations]) => addedRotations <= 1);
    if (primaryGroups.length > 0) return primaryGroups;
    return groupedOptions.slice(0, 1);
  }, [groupedOptions, showAllOptionGroups]);
  const hiddenOptionGroupCount = Math.max(0, groupedOptions.length - visibleOptionGroups.length);

  if (!suggestion || !recommendedOption || !selectedOption) return null;
  const safeSummaryOption = summaryOption ?? recommendedOption;
  const selectedChangeLabel = formatOptionChangeLabel(safeSummaryOption.periodDivisions);

  const failedKeys = new Set(failedOptionKeys);

  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setShowCompareOptions(false);
          setShowAllOptionGroups(false);
        }
        onOpenChange(nextOpen);
      }}
      title={t('optimize.sheet_title')}
      description={t('optimize.sheet_desc')}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRunning}>
            {tCommon('actions.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={!selectedOptionKey || isRunning}>
            {isRunning
              ? t('live.solving')
              : showCompareOptions
                ? t('optimize.preview_selected')
                : t('optimize.preview_recommended')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        <div
          data-testid="optimize-selected-summary"
          className="rounded-[10px] border border-primary/25 bg-primary/5 px-4 py-3"
        >
          <p className="text-ios-caption1 text-muted-foreground">
            {summaryIsRecommended
              ? t('optimize.selected_recommended_title')
              : t('optimize.selected_title')}
          </p>
          <p className="mt-0.5 text-ios-title3 font-semibold tabular-nums text-foreground">
            {t('optimize.selected_improvement', {
              improvement: formatNumber(safeSummaryOption.gapImprovement),
            })}
          </p>
          <p className="mt-1 text-ios-caption1 text-muted-foreground">
            {t('optimize.selected_detail', {
              change: selectedChangeLabel,
              count: safeSummaryOption.totalRotations,
            })}
          </p>
        </div>

        {!showCompareOptions && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[10px] border border-border/50 bg-card px-3 py-2">
                <p className="text-ios-caption1 text-muted-foreground">{t('optimize.current_label')}</p>
                <p className="text-ios-subheadline tabular-nums text-foreground">
                  {t('optimize.gap_metric', {
                    gap: formatNumber(suggestion.currentGap),
                  })}
                </p>
                <p className="mt-0.5 text-ios-caption1 tabular-nums text-muted-foreground">
                  {t('optimize.skill_range_metric', {
                    range: formatNumber(suggestion.currentStrengthRange ?? 0),
                  })}
                </p>
                <p className="text-ios-caption2 text-muted-foreground">
                  {t('optimize.current_rotations', { count: suggestion.currentTotalRotations })}
                </p>
              </div>
              <div className="rounded-[10px] border border-primary/25 bg-primary/5 px-3 py-2">
                <p className="text-ios-caption1 text-muted-foreground">{t('optimize.preview_label')}</p>
                <p className="text-ios-subheadline tabular-nums text-foreground">
                  {t('optimize.gap_metric', {
                    gap: formatNumber(recommendedOption.expectedGap),
                  })}
                </p>
                <p className="mt-0.5 text-ios-caption1 tabular-nums text-muted-foreground">
                  {t('optimize.skill_range_metric', {
                    range: formatNumber(recommendedOption.expectedStrengthRange ?? 0),
                  })}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="plain"
              size="sm"
              className="w-full"
              onClick={() => setShowCompareOptions(true)}
            >
              {t('optimize.show_compare_options')}
            </Button>
          </>
        )}

        {optimizeError && (
          <div className="rounded-[10px] bg-destructive/10 px-3 py-2">
            <p className="text-ios-caption1 text-destructive">{optimizeError}</p>
          </div>
        )}

        {showCompareOptions &&
          visibleOptionGroups.map(([addedRotations, options]) => (
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
              const optionChangeLabel = formatOptionChangeLabel(option.periodDivisions);

              return (
                <GroupedListRow
                  key={optionKey}
                  last={index === options.length - 1}
                  onClick={() => onSelectOption(optionKey)}
                  className={cn(selected && 'bg-primary/5')}
                  trailing={
                    <div className="ml-2 flex items-center gap-2">
                      <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] leading-[13px] tracking-[0.07px] tabular-nums text-primary">
                        {t('optimize.option_gap_chip', {
                          improvement: formatNumber(option.gapImprovement),
                        })}
                      </span>
                      {selected ? <CheckIcon className="size-4 text-primary" /> : null}
                    </div>
                  }
                >
                  <div className="min-w-0">
                    <p className="truncate text-ios-subheadline text-foreground">{optionChangeLabel}</p>
                    <p className="mt-0.5 text-ios-caption1 tabular-nums text-muted-foreground">
                      {t('optimize.option_meta', {
                        count: option.totalRotations,
                        range: formatNumber(option.expectedStrengthRange ?? 0),
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
        {showCompareOptions && hiddenOptionGroupCount > 0 && !showAllOptionGroups && (
          <Button
            type="button"
            variant="plain"
            size="sm"
            className="w-full"
            onClick={() => setShowAllOptionGroups(true)}
          >
            {t('optimize.show_more_groups')}
          </Button>
        )}
        {showCompareOptions &&
          hiddenOptionGroupCount === 0 &&
          showAllOptionGroups &&
          groupedOptions.length > 1 && (
            <Button
              type="button"
              variant="plain"
              size="sm"
              className="w-full"
              onClick={() => setShowAllOptionGroups(false)}
            >
              {t('optimize.show_less_groups')}
            </Button>
          )}
        {showCompareOptions && (
          <Button
            type="button"
            variant="plain"
            size="sm"
            className="w-full"
            onClick={() => {
              setShowCompareOptions(false);
              setShowAllOptionGroups(false);
              onSelectOption(recommendedOptionKey);
            }}
          >
            {t('optimize.show_recommended')}
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}

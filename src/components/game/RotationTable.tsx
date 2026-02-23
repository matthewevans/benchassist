import { forwardRef } from 'react';
import { ChevronRightIcon, ChevronDownIcon, EllipsisIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils.ts';
import { PlayerPopover } from '@/components/game/PlayerPopover.tsx';
import { SUB_POSITION_LABELS } from '@/types/domain.ts';
import type { Player, PlayerId, Rotation, PlayerStats, GameConfig } from '@/types/domain.ts';
import { getAssignmentDisplay } from '@/utils/positions.ts';

function PlayPercentageCell({
  percentage,
  belowMinimum,
  highDeviation,
}: {
  percentage: number;
  belowMinimum: boolean;
  highDeviation: boolean;
}) {
  const size = 24;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = belowMinimum
    ? 'stroke-orange-500 dark:stroke-orange-400'
    : highDeviation
      ? 'stroke-blue-500 dark:stroke-blue-400'
      : 'stroke-green-500 dark:stroke-green-400';
  const status = belowMinimum ? 'below-minimum' : highDeviation ? 'high-deviation' : 'normal';

  return (
    <div className="flex flex-col items-center gap-0.5" data-play-status={status}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-secondary"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={cn(
          'text-[10px] tabular-nums leading-none',
          belowMinimum
            ? 'text-orange-600 dark:text-orange-400'
            : highDeviation
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-muted-foreground',
        )}
      >
        {percentage}
      </span>
    </div>
  );
}

function PeriodActionButton({
  periodIndex,
  disabled,
  onClick,
}: {
  periodIndex: number;
  disabled: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation('game');
  return (
    <button
      type="button"
      className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent/80 active:bg-accent/80 disabled:opacity-40 disabled:pointer-events-none outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      aria-label={t('rotation_table.period_actions', { number: periodIndex + 1 })}
      disabled={disabled}
      onClick={onClick}
    >
      <EllipsisIcon className="size-4 text-muted-foreground" />
    </button>
  );
}

interface PeriodGroup {
  periodIndex: number;
  rotations: Rotation[];
}

interface RotationTableProps {
  periodGroups: PeriodGroup[];
  allDisplayPlayers: Player[];
  playerStats: Record<PlayerId, PlayerStats>;
  config: GameConfig;
  gameRemovedPlayerIds: PlayerId[];
  isLive: boolean;
  isCompleted: boolean;
  currentRotationIndex: number;
  changingPlayerIds: Set<PlayerId>;
  subTooltipMap: Map<PlayerId, string>;
  collapsedPeriods: Set<number>;
  togglePeriod: (periodIndex: number) => void;
  highPlayOutlierIds: Set<PlayerId>;
  canEditPeriodDivision: (periodIndex: number) => boolean;
  onPeriodActionsClick: (periodIndex: number) => void;
  swapSource: { rotationIndex: number; playerId: PlayerId } | null;
  onCellClick: (rotationIndex: number, playerId: PlayerId) => void;
  onRemovePlayer: (playerId: PlayerId) => void;
  onAddPlayerBack: (playerId: PlayerId) => void;
  showPeriodActions?: boolean;
  interactiveCells?: boolean;
  previewCellChanges?: Map<string, { fromLabel: string; toLabel: string }>;
}

export const RotationTable = forwardRef<HTMLDivElement, RotationTableProps>(
  function RotationTable(props, ref) {
    const {
      periodGroups,
      allDisplayPlayers,
      playerStats,
      config,
      gameRemovedPlayerIds,
      isLive,
      isCompleted,
      currentRotationIndex,
      changingPlayerIds,
      subTooltipMap,
      collapsedPeriods,
      togglePeriod,
      highPlayOutlierIds,
      canEditPeriodDivision,
      onPeriodActionsClick,
      swapSource,
      onCellClick,
      onRemovePlayer,
      onAddPlayerBack,
      showPeriodActions = true,
      interactiveCells = true,
      previewCellChanges,
    } = props;

    const { t } = useTranslation('game');

    return (
      <div className="overflow-x-auto px-4" ref={ref}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2.5 pr-3 pl-1 sticky left-0 bg-background text-ios-footnote uppercase tracking-wide text-muted-foreground z-10">
                {t('rotation_table.player')}
              </th>
              {periodGroups.map((group) => {
                if (collapsedPeriods.has(group.periodIndex)) {
                  return (
                    <th
                      key={`collapsed-${group.periodIndex}`}
                      className="text-center py-1.5 px-0.5 font-medium min-w-12 w-12 align-top"
                    >
                      <div className="mx-auto flex flex-col items-center justify-start gap-0.5">
                        <button
                          type="button"
                          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-0.5 rounded-md transition-colors hover:bg-accent/80 active:bg-accent/80 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          aria-label={t('rotation_table.expand_period', {
                            number: group.periodIndex + 1,
                          })}
                          onClick={() => togglePeriod(group.periodIndex)}
                        >
                          <span className="text-ios-caption1 font-semibold text-muted-foreground">
                            P{group.periodIndex + 1}
                          </span>
                          <ChevronRightIcon className="size-3 text-muted-foreground" />
                        </button>
                        {showPeriodActions && (
                          <PeriodActionButton
                            periodIndex={group.periodIndex}
                            disabled={!canEditPeriodDivision(group.periodIndex)}
                            onClick={() => onPeriodActionsClick(group.periodIndex)}
                          />
                        )}
                      </div>
                    </th>
                  );
                }
                return group.rotations.map((r, i) => {
                  const isCurrent = isLive && r.index === currentRotationIndex;
                  const isPast = isLive && r.index < currentRotationIndex;
                  const isNext = isLive && r.index === currentRotationIndex + 1;
                  const isFirstInPeriod = i === 0 && group.periodIndex > 0;
                  return (
                    <th
                      key={r.index}
                      className={cn(
                        'text-center py-2 font-medium align-top',
                        isLive ? 'px-2 min-w-[76px]' : 'px-1 min-w-[60px]',
                        isCurrent && 'bg-primary/10 border-x-2 border-primary/50',
                        isNext && 'bg-accent/30',
                        isPast && 'bg-secondary/20',
                        isFirstInPeriod && !isCurrent && 'border-l-2 border-border',
                      )}
                      {...(isCurrent ? { 'data-current-rotation': '' } : {})}
                    >
                      <div className="flex items-center justify-center">
                        <span
                          className={cn(
                            'text-ios-caption1 text-foreground',
                            isCurrent && 'font-semibold text-primary',
                            isPast && 'text-muted-foreground',
                          )}
                        >
                          R{r.index + 1}
                        </span>
                      </div>
                      {(isCurrent || isNext) && (
                        <span
                          className={cn(
                            'mt-0.5 block text-ios-caption1 font-semibold uppercase tracking-wide',
                            isCurrent && 'text-primary',
                            isNext && 'text-muted-foreground',
                          )}
                        >
                          {isCurrent ? t('live.now') : t('live.next')}
                        </span>
                      )}
                      <div className="mt-1 min-h-11 text-ios-caption1 text-muted-foreground font-normal flex items-center justify-center">
                        {i === 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            {isLive ? (
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-0.5 min-h-11 min-w-11 rounded-md transition-colors hover:bg-accent/80 active:bg-accent/80 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                onClick={() => togglePeriod(group.periodIndex)}
                              >
                                <span className="text-ios-caption1 font-semibold text-muted-foreground">
                                  P{r.periodIndex + 1}
                                </span>
                                <ChevronDownIcon className="size-3" />
                              </button>
                            ) : (
                              <span className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center">
                                P{r.periodIndex + 1}
                              </span>
                            )}
                            {showPeriodActions && (
                              <PeriodActionButton
                                periodIndex={group.periodIndex}
                                disabled={!canEditPeriodDivision(group.periodIndex)}
                                onClick={() => onPeriodActionsClick(group.periodIndex)}
                              />
                            )}
                          </div>
                        ) : (
                          <>
                            {isLive ? (
                              <span aria-hidden="true" className="opacity-0 select-none">
                                P{r.periodIndex + 1}
                              </span>
                            ) : (
                              <>P{r.periodIndex + 1}</>
                            )}
                          </>
                        )}
                      </div>
                    </th>
                  );
                });
              })}
              <th className="text-center py-2 px-2 font-medium text-ios-caption1 text-muted-foreground">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {allDisplayPlayers.map((player) => {
              const stats = playerStats[player.id];
              const isRemoved = gameRemovedPlayerIds.includes(player.id);
              const belowMinimum = stats != null && stats.playPercentage < config.minPlayPercentage;
              const highDeviation = stats != null && highPlayOutlierIds.has(player.id);
              const playerNameEl = (
                <span
                  className={cn(
                    'whitespace-nowrap text-ios-subheadline',
                    isRemoved && 'line-through opacity-50',
                  )}
                >
                  {player.name}
                </span>
              );
              return (
                <tr
                  key={player.id}
                  className={cn(
                    'border-b border-border/30 min-h-[44px]',
                    isRemoved && 'opacity-60',
                  )}
                >
                  <td
                    className={cn(
                      'pr-3 pl-1 sticky left-0 bg-background z-10',
                      isLive ? 'py-3' : 'py-2',
                    )}
                  >
                    {isLive ? (
                      <PlayerPopover
                        playerName={player.name}
                        stats={stats}
                        belowMinimum={belowMinimum}
                        highDeviation={highDeviation}
                        isRemoved={isRemoved}
                        onRemove={() => onRemovePlayer(player.id)}
                        onAddBack={() => onAddPlayerBack(player.id)}
                      >
                        <button className="text-left min-h-11 flex items-center hover:text-primary active:opacity-60 transition-colors">
                          {playerNameEl}
                        </button>
                      </PlayerPopover>
                    ) : (
                      playerNameEl
                    )}
                  </td>
                  {periodGroups.map((group) => {
                    if (collapsedPeriods.has(group.periodIndex)) {
                      return (
                        <td
                          key={`collapsed-${group.periodIndex}`}
                          className="py-1 px-0.5 min-w-12 w-12"
                        />
                      );
                    }
                    return group.rotations.map((rotation, rotIdx) => {
                      const assignment = rotation.assignments[player.id];
                      if (!assignment) return <td key={rotation.index} />;
                      const fieldPosition = rotation.fieldPositions?.[player.id];
                      const display = getAssignmentDisplay(
                        assignment,
                        fieldPosition,
                        config.usePositions,
                      );
                      const isCurrent = isLive && rotation.index === currentRotationIndex;
                      const isPast = isLive && rotation.index < currentRotationIndex;
                      const isNext = isLive && rotation.index === currentRotationIndex + 1;
                      const isChanging = isNext && changingPlayerIds.has(player.id);
                      const isSelected =
                        swapSource?.rotationIndex === rotation.index &&
                        swapSource?.playerId === player.id;
                      const isValidTarget =
                        swapSource &&
                        !isSelected &&
                        swapSource.rotationIndex === rotation.index &&
                        !isPast &&
                        !isCompleted;
                      const previewCellChange = previewCellChanges?.get(
                        `${rotation.index}:${player.id}`,
                      );
                      const isPreviewChanged = previewCellChange != null;
                      const previewChangeDetail = previewCellChange
                        ? t('live.regenerate_preview_cell_changed_detail', {
                            from: previewCellChange.fromLabel,
                            to: previewCellChange.toLabel,
                          })
                        : null;
                      const subTip = isChanging ? subTooltipMap.get(player.id) : undefined;
                      const baseCellTitle =
                        subTip ?? (fieldPosition ? SUB_POSITION_LABELS[fieldPosition] : undefined);
                      const cellTitle = isPreviewChanged
                        ? [
                            t('live.regenerate_preview_cell_changed'),
                            previewChangeDetail,
                            baseCellTitle,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : baseCellTitle;
                      const isInteractive = interactiveCells && !isPast && !isCompleted;
                      const isFirstInPeriod = rotIdx === 0 && group.periodIndex > 0;
                      return (
                        <td
                          key={rotation.index}
                          className={cn(
                            'text-center',
                            isLive ? 'py-3 px-2' : 'py-2 px-1',
                            isCurrent && 'bg-primary/10 border-x-2 border-primary/50',
                            isNext && 'bg-accent/30',
                            (isPast || isCompleted) && 'opacity-40 pointer-events-none',
                            isFirstInPeriod && !isCurrent && 'border-l-2 border-border',
                          )}
                          {...(isPreviewChanged
                            ? ({ 'data-preview-change': 'changed' } as const)
                            : {})}
                          {...(isCurrent ? { 'data-current-rotation': '' } : {})}
                          {...(isInteractive
                            ? {
                                role: 'button' as const,
                                tabIndex: 0,
                                'aria-label': `${player.name}: ${display.label}, rotation ${rotation.index + 1}${
                                  isPreviewChanged
                                    ? `, ${t('live.regenerate_preview_cell_changed_aria', {
                                        detail: previewChangeDetail,
                                      })}`
                                    : ''
                                }`,
                                onKeyDown: (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onCellClick(rotation.index, player.id);
                                  }
                                },
                              }
                            : {})}
                          onClick={() => onCellClick(rotation.index, player.id)}
                        >
                          <span
                            className={cn(
                              'inline-flex items-center justify-center rounded-md text-ios-footnote font-medium transition-all relative',
                              !isPreviewChanged && 'w-8 h-7',
                              !isPreviewChanged && display.className,
                              isPreviewChanged && 'h-8 min-w-12 gap-0.5 px-1 whitespace-nowrap',
                              isSelected && 'ring-2 ring-primary ring-offset-1 animate-pulse',
                              isValidTarget &&
                                'ring-1 ring-primary/50 hover:ring-2 hover:ring-primary',
                              isChanging && 'ring-2 ring-dashed ring-accent-foreground/40',
                              isPreviewChanged &&
                                'ring-2 ring-primary/45 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]',
                              !isPast && !isCompleted && 'cursor-pointer',
                              swapSource &&
                                !isSelected &&
                                !isValidTarget &&
                                !isPast &&
                                !isCompleted &&
                                'opacity-70 hover:opacity-100',
                            )}
                            title={cellTitle}
                          >
                            {previewCellChange ? (
                              <>
                                <span className="text-[10px] leading-none text-muted-foreground/80 line-through">
                                  {previewCellChange.fromLabel}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="text-[10px] leading-none text-muted-foreground/80"
                                >
                                  →
                                </span>
                                <span className={cn('text-[10px] leading-none', display.className)}>
                                  {previewCellChange.toLabel}
                                </span>
                              </>
                            ) : (
                              display.label
                            )}
                            {isPreviewChanged && (
                              <span
                                aria-hidden="true"
                                className="absolute -right-1 -top-1 size-1.5 rounded-full bg-primary animate-pulse"
                              />
                            )}
                          </span>
                        </td>
                      );
                    });
                  })}
                  <td className="text-center py-1.5 px-2">
                    <PlayPercentageCell
                      percentage={stats?.playPercentage ?? 0}
                      belowMinimum={belowMinimum}
                      highDeviation={highDeviation && !belowMinimum}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border/50 font-medium">
              <td className="py-2.5 pr-3 pl-1 sticky left-0 bg-background text-ios-footnote text-muted-foreground z-10">
                {t('live.team_strength')}
              </td>
              {periodGroups.map((group) => {
                if (collapsedPeriods.has(group.periodIndex)) {
                  return <td key={`collapsed-${group.periodIndex}`} className="min-w-12 w-12" />;
                }
                return group.rotations.map((rotation, rotIdx) => {
                  const isCurrent = isLive && rotation.index === currentRotationIndex;
                  const isPast = isLive && rotation.index < currentRotationIndex;
                  const isFirstInPeriod = rotIdx === 0 && group.periodIndex > 0;
                  return (
                    <td
                      key={rotation.index}
                      className={cn(
                        'text-center py-2 px-1 text-ios-footnote',
                        isCurrent && 'bg-primary/10 border-x-2 border-primary/50',
                        isPast && 'opacity-40',
                        isFirstInPeriod && !isCurrent && 'border-l-2 border-border',
                      )}
                    >
                      {rotation.teamStrength}
                    </td>
                  );
                });
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    );
  },
);

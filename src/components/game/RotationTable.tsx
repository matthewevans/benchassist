import { forwardRef, useMemo } from 'react';
import { ChevronRightIcon, ChevronDownIcon, EllipsisIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils.ts';
import { PlayerPopover } from '@/components/game/PlayerPopover.tsx';
import { SUB_POSITION_LABELS } from '@/types/domain.ts';
import type { Player, PlayerId, Rotation, PlayerStats, GameConfig } from '@/types/domain.ts';
import { getAssignmentDisplay } from '@/utils/positions.ts';
import { getHighPlayPercentageOutlierIds } from '@/utils/playPercentageOutliers.ts';

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
  canEditPeriodDivision: (periodIndex: number) => boolean;
  onPeriodActionsClick: (periodIndex: number) => void;
  swapSource: { rotationIndex: number; playerId: PlayerId } | null;
  onCellClick: (rotationIndex: number, playerId: PlayerId) => void;
  onRemovePlayer: (playerId: PlayerId) => void;
  onAddPlayerBack: (playerId: PlayerId) => void;
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
      canEditPeriodDivision,
      onPeriodActionsClick,
      swapSource,
      onCellClick,
      onRemovePlayer,
      onAddPlayerBack,
    } = props;

    const { t } = useTranslation('game');
    const highPlayOutlierIds = useMemo(
      () =>
        getHighPlayPercentageOutlierIds(
          allDisplayPlayers
            .filter((player) => !gameRemovedPlayerIds.includes(player.id))
            .map((player) => ({
              playerId: player.id,
              playPercentage: playerStats[player.id]?.playPercentage ?? 0,
            })),
        ),
      [allDisplayPlayers, gameRemovedPlayerIds, playerStats],
    );

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
                      className="text-center py-2 px-1 font-medium min-w-[44px] hover:bg-accent/50 transition-colors"
                    >
                      <div className="mx-auto flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-0.5 rounded-md transition-colors hover:bg-accent/80 active:bg-accent/80"
                          aria-label={t('rotation_table.expand_period', {
                            number: group.periodIndex + 1,
                          })}
                          onClick={() => togglePeriod(group.periodIndex)}
                        >
                          <span className="text-ios-caption1 text-muted-foreground bg-secondary/50 rounded px-2 py-0.5">
                            P{group.periodIndex + 1}
                          </span>
                          <ChevronRightIcon className="size-3 text-muted-foreground" />
                        </button>
                        <button
                          type="button"
                          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent/80 active:bg-accent/80 disabled:opacity-40"
                          aria-label={t('rotation_table.period_actions', {
                            number: group.periodIndex + 1,
                          })}
                          disabled={!canEditPeriodDivision(group.periodIndex)}
                          onClick={() => onPeriodActionsClick(group.periodIndex)}
                        >
                          <EllipsisIcon className="size-4 text-muted-foreground" />
                        </button>
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
                        'text-center py-2 font-medium',
                        isLive ? 'px-2 min-w-[76px]' : 'px-1 min-w-[60px]',
                        isCurrent && 'bg-primary/10 border-x-2 border-primary/50',
                        isNext && 'bg-accent/30',
                        isPast && 'opacity-40',
                        isFirstInPeriod && !isCurrent && 'border-l-2 border-border',
                      )}
                      {...(isCurrent ? { 'data-current-rotation': '' } : {})}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={cn('text-ios-caption1', isCurrent && 'font-bold')}>
                          R{r.index + 1}
                        </span>
                      </div>
                      {(isCurrent || isNext) && (
                        <span
                          className={cn(
                            'text-xs font-semibold uppercase tracking-wide',
                            isCurrent && 'text-primary font-bold',
                            isNext && 'text-muted-foreground',
                          )}
                        >
                          {isCurrent ? t('live.now') : t('live.next')}
                        </span>
                      )}
                      <div className="text-xs text-muted-foreground font-normal">
                        {i === 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            {isLive ? (
                              <button
                                className="flex items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] hover:text-foreground active:opacity-60 transition-colors"
                                onClick={() => togglePeriod(group.periodIndex)}
                              >
                                P{r.periodIndex + 1}
                                <ChevronDownIcon className="size-3" />
                              </button>
                            ) : (
                              <span className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center">
                                P{r.periodIndex + 1}
                              </span>
                            )}
                            <button
                              type="button"
                              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent/80 active:bg-accent/80 disabled:opacity-40"
                              aria-label={t('rotation_table.period_actions', {
                                number: group.periodIndex + 1,
                              })}
                              disabled={!canEditPeriodDivision(group.periodIndex)}
                              onClick={() => onPeriodActionsClick(group.periodIndex)}
                            >
                              <EllipsisIcon className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <>P{r.periodIndex + 1}</>
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
                          className="text-center py-1.5 px-1 hover:bg-accent/50 min-w-[44px]"
                        >
                          <button
                            type="button"
                            className="mx-auto min-h-11 min-w-11 rounded-md transition-colors hover:bg-accent/80 active:bg-accent/80"
                            aria-label={t('rotation_table.expand_period', {
                              number: group.periodIndex + 1,
                            })}
                            onClick={() => togglePeriod(group.periodIndex)}
                          />
                        </td>
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
                      const subTip = isChanging ? subTooltipMap.get(player.id) : undefined;
                      const cellTitle =
                        subTip ?? (fieldPosition ? SUB_POSITION_LABELS[fieldPosition] : undefined);
                      const isInteractive = !isPast && !isCompleted;
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
                          {...(isCurrent ? { 'data-current-rotation': '' } : {})}
                          {...(isInteractive
                            ? {
                                role: 'button' as const,
                                tabIndex: 0,
                                'aria-label': `${player.name}: ${display.label}, rotation ${rotation.index + 1}`,
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
                              'inline-flex items-center justify-center w-8 h-7 rounded-md text-ios-footnote font-medium transition-all',
                              display.className,
                              isSelected && 'ring-2 ring-primary ring-offset-1 animate-pulse',
                              isValidTarget &&
                                'ring-1 ring-primary/50 hover:ring-2 hover:ring-primary',
                              isChanging && 'ring-2 ring-dashed ring-accent-foreground/40',
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
                            {display.label}
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
                  return <td key={`collapsed-${group.periodIndex}`} />;
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

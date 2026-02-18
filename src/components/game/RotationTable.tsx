import { forwardRef } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { PlayerPopover } from '@/components/game/PlayerPopover.tsx';
import { SUB_POSITION_LABELS } from '@/types/domain.ts';
import type { Player, PlayerId, Rotation, PlayerStats, GameConfig } from '@/types/domain.ts';
import { getAssignmentDisplay } from '@/utils/positions.ts';

interface PeriodGroup {
  periodIndex: number;
  rotations: Rotation[];
}

interface RotationTableProps {
  periodGroups: PeriodGroup[];
  allDisplayPlayers: Player[];
  playerStats: Record<string, PlayerStats>;
  config: GameConfig;
  gameRemovedPlayerIds: PlayerId[];
  isLive: boolean;
  isCompleted: boolean;
  currentRotationIndex: number;
  changingPlayerIds: Set<PlayerId>;
  subTooltipMap: Map<PlayerId, string>;
  collapsedPeriods: Set<number>;
  togglePeriod: (periodIndex: number) => void;
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
      swapSource,
      onCellClick,
      onRemovePlayer,
      onAddPlayerBack,
    } = props;

    return (
      <div className="overflow-x-auto" ref={ref}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-3 sticky left-0 bg-background font-medium z-10">
                Player
              </th>
              {periodGroups.map((group) => {
                if (collapsedPeriods.has(group.periodIndex)) {
                  return (
                    <th
                      key={`collapsed-${group.periodIndex}`}
                      className="text-center py-2 px-1 font-medium min-w-[36px] cursor-pointer hover:bg-accent/50 transition-colors"
                      role="button"
                      tabIndex={0}
                      aria-label={`Expand period ${group.periodIndex + 1}`}
                      onClick={() => togglePeriod(group.periodIndex)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          togglePeriod(group.periodIndex);
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-0.5 text-muted-foreground">
                        <span className="text-xs">P{group.periodIndex + 1}</span>
                        <ChevronRightIcon className="size-3" />
                      </div>
                    </th>
                  );
                }
                return group.rotations.map((r, i) => {
                  const isCurrent = isLive && r.index === currentRotationIndex;
                  const isPast = isLive && r.index < currentRotationIndex;
                  const isNext = isLive && r.index === currentRotationIndex + 1;
                  return (
                    <th
                      key={r.index}
                      className={cn(
                        'text-center py-2 font-medium',
                        isLive ? 'px-2 min-w-[76px]' : 'px-1 min-w-[60px]',
                        isCurrent && 'bg-primary/10 border-l-2 border-r-2 border-primary/30',
                        isNext && 'bg-accent/30',
                        isPast && 'opacity-40',
                      )}
                      {...(isCurrent ? { 'data-current-rotation': '' } : {})}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>R{r.index + 1}</span>
                      </div>
                      {(isCurrent || isNext) && (
                        <span
                          className={cn(
                            'text-xs font-semibold uppercase tracking-wide',
                            isCurrent && 'text-primary',
                            isNext && 'text-muted-foreground',
                          )}
                        >
                          {isCurrent ? 'Now' : 'Next'}
                        </span>
                      )}
                      <div className="text-xs text-muted-foreground font-normal">
                        {i === 0 && isLive ? (
                          <button
                            className="hover:text-foreground transition-colors"
                            onClick={() => togglePeriod(group.periodIndex)}
                          >
                            P{r.periodIndex + 1}
                          </button>
                        ) : (
                          <>P{r.periodIndex + 1}</>
                        )}
                      </div>
                    </th>
                  );
                });
              })}
              <th className="text-center py-2 px-2 font-medium">Play%</th>
            </tr>
          </thead>
          <tbody>
            {allDisplayPlayers.map((player) => {
              const stats = playerStats[player.id];
              const isRemoved = gameRemovedPlayerIds.includes(player.id);
              const playerNameEl = (
                <span className={cn('whitespace-nowrap', isRemoved && 'line-through opacity-50')}>
                  {player.name}
                </span>
              );
              return (
                <tr key={player.id} className={cn('border-b', isRemoved && 'opacity-60')}>
                  <td
                    className={cn(
                      'pr-3 sticky left-0 bg-background z-10',
                      isLive ? 'py-2.5' : 'py-1.5',
                    )}
                  >
                    {isLive ? (
                      <PlayerPopover
                        playerName={player.name}
                        stats={stats}
                        isRemoved={isRemoved}
                        onRemove={() => onRemovePlayer(player.id)}
                        onAddBack={() => onAddPlayerBack(player.id)}
                      >
                        <button className="text-left hover:text-primary transition-colors">
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
                          className="text-center py-1.5 px-1 cursor-pointer hover:bg-accent/50"
                          role="button"
                          tabIndex={0}
                          aria-label={`Expand period ${group.periodIndex + 1}`}
                          onClick={() => togglePeriod(group.periodIndex)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              togglePeriod(group.periodIndex);
                            }
                          }}
                        />
                      );
                    }
                    return group.rotations.map((rotation) => {
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
                      return (
                        <td
                          key={rotation.index}
                          className={cn(
                            'text-center',
                            isLive ? 'py-2.5 px-2' : 'py-1.5 px-1',
                            isCurrent && 'bg-primary/10 border-l-2 border-r-2 border-primary/30',
                            isNext && 'bg-accent/30',
                            (isPast || isCompleted) && 'opacity-40 pointer-events-none',
                          )}
                          {...(isCurrent ? { 'data-current-rotation': '' } : {})}
                          {...(isInteractive
                            ? {
                                role: 'button' as const,
                                tabIndex: 0,
                                'aria-label': `${player.name}: ${display.label}, rotation ${rotation.index + 1}`,
                                onKeyDown: (e: React.KeyboardEvent) => {
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
                              'inline-block rounded font-medium transition-all',
                              isLive ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs',
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
                    <span
                      className={`text-xs font-medium ${
                        stats && stats.playPercentage < config.minPlayPercentage
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {stats?.playPercentage ?? 0}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="py-2 pr-3 sticky left-0 bg-background text-sm z-10">Team Strength</td>
              {periodGroups.map((group) => {
                if (collapsedPeriods.has(group.periodIndex)) {
                  return <td key={`collapsed-${group.periodIndex}`} />;
                }
                return group.rotations.map((rotation) => {
                  const isCurrent = isLive && rotation.index === currentRotationIndex;
                  const isPast = isLive && rotation.index < currentRotationIndex;
                  return (
                    <td
                      key={rotation.index}
                      className={cn(
                        'text-center py-2 px-1 text-sm',
                        isCurrent && 'bg-primary/10 border-l-2 border-r-2 border-primary/30',
                        isPast && 'opacity-40',
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

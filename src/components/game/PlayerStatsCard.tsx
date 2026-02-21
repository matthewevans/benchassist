import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { RotationSchedule, Player } from '@/types/domain.ts';
import { getHighPlayPercentageOutlierIds } from '@/utils/playPercentageOutliers.ts';

interface PlayerStatsCardProps {
  players: Player[];
  playerStats: RotationSchedule['playerStats'];
  minPlayPercentage: number;
}

export function PlayerStatsCard({ players, playerStats, minPlayPercentage }: PlayerStatsCardProps) {
  const { t } = useTranslation('game');
  const highPlayOutlierIds = useMemo(
    () =>
      getHighPlayPercentageOutlierIds(
        players
          .filter((player) => playerStats[player.id] != null)
          .map((player) => ({
            playerId: player.id,
            playPercentage: playerStats[player.id]!.playPercentage,
          })),
      ),
    [players, playerStats],
  );

  return (
    <section>
      <h3 className="text-ios-footnote font-normal text-muted-foreground uppercase pb-1.5">
        {t('player.stats_title')}
      </h3>
      <div className="bg-card rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
        {players.map((player, i) => {
          const stats = playerStats[player.id];
          if (!stats) return null;
          const belowMinimum = stats.playPercentage < minPlayPercentage;
          const highDeviation = highPlayOutlierIds.has(player.id);
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between min-h-[44px] px-4 text-ios-subheadline ${
                i < players.length - 1 ? 'border-b border-border/50' : ''
              }`}
            >
              <span>{player.name}</span>
              <div className="flex items-center gap-3 text-ios-caption1 text-muted-foreground">
                <span>
                  {stats.rotationsPlayed} {t('player.played')}
                </span>
                <span>
                  {stats.rotationsBenched} {t('player.bench')}
                </span>
                {stats.rotationsGoalie > 0 && <span>{stats.rotationsGoalie} GK</span>}
                <span
                  className={`font-medium ${
                    belowMinimum
                      ? 'text-destructive'
                      : highDeviation
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-foreground'
                  }`}
                >
                  {stats.playPercentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

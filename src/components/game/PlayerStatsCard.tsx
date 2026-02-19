import type { RotationSchedule, Player } from '@/types/domain.ts';

interface PlayerStatsCardProps {
  players: Player[];
  playerStats: RotationSchedule['playerStats'];
  minPlayPercentage: number;
}

export function PlayerStatsCard({ players, playerStats, minPlayPercentage }: PlayerStatsCardProps) {
  return (
    <section>
      <h3 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
        Player Statistics
      </h3>
      <div className="bg-card rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
        {players.map((player, i) => {
          const stats = playerStats[player.id];
          if (!stats) return null;
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between min-h-[44px] px-4 text-ios-subheadline ${
                i < players.length - 1 ? 'border-b border-border/50' : ''
              }`}
            >
              <span>{player.name}</span>
              <div className="flex items-center gap-3 text-ios-caption1 text-muted-foreground">
                <span>{stats.rotationsPlayed} played</span>
                <span>{stats.rotationsBenched} bench</span>
                {stats.rotationsGoalie > 0 && <span>{stats.rotationsGoalie} GK</span>}
                <span
                  className={`font-medium ${
                    stats.playPercentage < minPlayPercentage
                      ? 'text-destructive'
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

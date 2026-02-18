import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import type { RotationSchedule, Player } from '@/types/domain.ts';

interface PlayerStatsCardProps {
  players: Player[];
  playerStats: RotationSchedule['playerStats'];
  minPlayPercentage: number;
}

export function PlayerStatsCard({ players, playerStats, minPlayPercentage }: PlayerStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Player Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {players.map((player) => {
            const stats = playerStats[player.id];
            if (!stats) return null;
            return (
              <div key={player.id} className="flex items-center justify-between text-sm">
                <span>{player.name}</span>
                <div className="flex items-center gap-3 text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}

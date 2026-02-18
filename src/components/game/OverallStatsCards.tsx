import { Card, CardContent } from '@/components/ui/card.tsx';
import type { RotationSchedule } from '@/types/domain.ts';

interface OverallStatsCardsProps {
  stats: RotationSchedule['overallStats'];
}

export function OverallStatsCards({ stats }: OverallStatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">{stats.avgStrength}</p>
          <p className="text-xs text-muted-foreground">Avg Strength</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">
            {stats.minStrength}-{stats.maxStrength}
          </p>
          <p className="text-xs text-muted-foreground">Strength Range</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">{stats.strengthVariance.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Variance</p>
        </CardContent>
      </Card>
    </div>
  );
}

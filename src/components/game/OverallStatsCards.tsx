import { useTranslation } from 'react-i18next';
import type { RotationSchedule } from '@/types/domain.ts';

interface OverallStatsCardsProps {
  stats: RotationSchedule['overallStats'];
}

export function OverallStatsCards({ stats }: OverallStatsCardsProps) {
  const { t } = useTranslation('game');

  return (
    <section>
      <h3 className="text-ios-footnote font-normal text-muted-foreground uppercase pb-1.5">
        {t('schedule.overview')}
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-[10px] py-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
          <p className="text-ios-title2 font-bold">{stats.avgStrength}</p>
          <p className="text-ios-caption1 text-muted-foreground">{t('schedule.avg_strength')}</p>
        </div>
        <div className="bg-card rounded-[10px] py-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
          <p className="text-ios-title2 font-bold">
            {stats.minStrength}-{stats.maxStrength}
          </p>
          <p className="text-ios-caption1 text-muted-foreground">{t('schedule.strength_range')}</p>
        </div>
        <div className="bg-card rounded-[10px] py-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
          <p className="text-ios-title2 font-bold">{stats.strengthVariance.toFixed(1)}</p>
          <p className="text-ios-caption1 text-muted-foreground">{t('schedule.variance')}</p>
        </div>
      </div>
    </section>
  );
}

import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { PlayerStats } from '@/types/domain.ts';

interface PlayerPopoverProps {
  playerName: string;
  stats: PlayerStats | undefined;
  isRemoved: boolean;
  onRemove: () => void;
  onAddBack: () => void;
  children: React.ReactNode;
}

export function PlayerPopover({
  playerName,
  stats,
  isRemoved,
  onRemove,
  onAddBack,
  children,
}: PlayerPopoverProps) {
  const { t } = useTranslation('game');

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-2">
          <p className="text-ios-subheadline font-medium">{playerName}</p>
          {stats && (
            <div className="text-ios-caption1 text-muted-foreground space-y-0.5">
              <p>
                {stats.rotationsPlayed} {t('player.played')} &middot; {stats.rotationsBenched}{' '}
                {t('player.bench')}
                {stats.rotationsGoalie > 0 ? ` \u00b7 ${stats.rotationsGoalie} GK` : ''}
              </p>
              <p className="text-ios-subheadline font-medium text-foreground">
                {stats.playPercentage}%
              </p>
            </div>
          )}
          {isRemoved ? (
            <Button variant="outline" size="sm" className="w-full" onClick={onAddBack}>
              {t('player.add_back')}
            </Button>
          ) : (
            <Button variant="destructive" size="sm" className="w-full" onClick={onRemove}>
              {t('player.remove_from_game')}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

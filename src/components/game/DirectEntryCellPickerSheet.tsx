import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Button } from '@/components/ui/button.tsx';
import type { Player, PlayerId } from '@/types/domain.ts';

interface DirectEntryCellPickerSheetProps {
  open: boolean;
  title: string;
  players: Player[];
  selectedPlayerId: PlayerId | null;
  onOpenChange: (open: boolean) => void;
  onSelectPlayer: (playerId: PlayerId) => void;
  onClear: () => void;
}

export function DirectEntryCellPickerSheet({
  open,
  title,
  players,
  selectedPlayerId,
  onOpenChange,
  onSelectPlayer,
  onClear,
}: DirectEntryCellPickerSheetProps) {
  const { t } = useTranslation('game');
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" aria-modal role="dialog" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[10px] bg-card pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-[5px] w-9 rounded-full bg-[#C7C7CC] dark:bg-[#48484A]" />
        </div>
        <h2 className="px-4 pb-3 text-center text-ios-headline">{title}</h2>
        <div className="space-y-4 px-4 pb-4">
          <Button variant="secondary" className="w-full" onClick={onClear}>
            {t('direct_entry.clear_slot')}
          </Button>

          <GroupedList>
            {players.map((player, index) => (
              <GroupedListRow
                key={player.id}
                onClick={() => onSelectPlayer(player.id)}
                last={index === players.length - 1}
                trailing={
                  selectedPlayerId === player.id ? (
                    <Check className="size-5 text-primary" aria-hidden />
                  ) : undefined
                }
              >
                <div className="flex min-h-11 w-full items-center justify-between gap-3 pr-2">
                  <span className="text-ios-body">{player.name}</span>
                  <span className="text-ios-caption1 text-muted-foreground">
                    {player.skillRanking}
                  </span>
                </div>
              </GroupedListRow>
            ))}
          </GroupedList>
        </div>
      </div>
    </div>
  );
}

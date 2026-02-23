import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Button } from '@/components/ui/button.tsx';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
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

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="space-y-4">
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
    </BottomSheet>
  );
}

import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import type { Player, PlayerId } from '@/types/domain.ts';

interface AttendanceListProps {
  players: Player[];
  absentIds: Set<PlayerId>;
  onToggle: (playerId: PlayerId) => void;
}

export function AttendanceList({ players, absentIds, onToggle }: AttendanceListProps) {
  return (
    <div className="grid gap-1.5">
      {players.map((player) => {
        const isAbsent = absentIds.has(player.id);
        const isPresent = !isAbsent;

        return (
          <button
            type="button"
            key={player.id}
            role="checkbox"
            aria-checked={isPresent}
            aria-label={`${player.name} is ${isPresent ? 'present' : 'absent'}`}
            className={cn(
              'flex w-full min-h-11 items-center gap-3 rounded-[10px] px-3 py-2 transition-colors text-left',
              'active:bg-[#D1D1D6] dark:active:bg-[#3A3A3C]',
              isAbsent ? 'bg-destructive/10 opacity-75' : 'bg-transparent',
            )}
            onClick={() => onToggle(player.id)}
          >
            <span
              aria-hidden
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                isPresent ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
              )}
            >
              {isPresent ? <Check className="size-3.5" /> : null}
            </span>
            <span className={cn('text-ios-body flex-1', isAbsent && 'line-through')}>
              {player.name}
            </span>
            <Badge variant="secondary" className="text-ios-caption2 tabular-nums">
              {player.skillRanking}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

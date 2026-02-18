import { Checkbox } from '@/components/ui/checkbox.tsx';
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
        return (
          <div
            key={player.id}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
              isAbsent ? 'bg-destructive/10 opacity-60' : 'hover:bg-accent',
            )}
            onClick={() => onToggle(player.id)}
          >
            <Checkbox checked={!isAbsent} onCheckedChange={() => onToggle(player.id)} />
            <span className={cn('text-sm flex-1', isAbsent && 'line-through')}>{player.name}</span>
            <Badge variant="secondary" className="text-xs">
              {player.skillRanking}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

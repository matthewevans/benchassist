import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import type { Player, GoalieAssignment } from '@/types/domain.ts';

interface GoalieAssignmentSelectorProps {
  periods: number;
  goalieAssignments: GoalieAssignment[];
  eligiblePlayers: Player[];
  onChange: (periodIndex: number, playerId: string) => void;
}

export function GoalieAssignmentSelector({
  periods,
  goalieAssignments,
  eligiblePlayers,
  onChange,
}: GoalieAssignmentSelectorProps) {
  const { t } = useTranslation('game');

  return (
    <div className="space-y-2">
      {Array.from({ length: periods }, (_, i) => (
        <div key={i} className="flex min-h-11 items-center gap-3">
          <Label className="w-20 text-ios-body">{t('setup.period_label', { number: i + 1 })}</Label>
          <Select
            value={goalieAssignments.find((a) => a.periodIndex === i)?.playerId ?? 'auto'}
            onValueChange={(v) => onChange(i, v)}
          >
            <SelectTrigger className="h-11 flex-1 text-ios-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t('setup.auto_assign')}</SelectItem>
              {eligiblePlayers.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

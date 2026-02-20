import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.tsx';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { AttendanceList } from '@/components/game/AttendanceList.tsx';
import { GoalieAssignmentSelector } from '@/components/game/GoalieAssignmentSelector.tsx';
import type { Player, PlayerId, GoalieAssignment } from '@/types/domain.ts';

interface GameSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  initialAbsentIds: PlayerId[];
  initialGoalieAssignments: GoalieAssignment[];
  periods: number;
  useGoalie: boolean;
  onRegenerate: (absentIds: PlayerId[], goalieAssignments: GoalieAssignment[]) => void;
}

export function GameSettingsSheet({
  open,
  onOpenChange,
  players,
  initialAbsentIds,
  initialGoalieAssignments,
  periods,
  useGoalie,
  onRegenerate,
}: GameSettingsSheetProps) {
  const { t } = useTranslation('game');
  const [editAbsent, setEditAbsent] = useState<Set<PlayerId>>(new Set());
  const [editGoalies, setEditGoalies] = useState<GoalieAssignment[]>([]);

  // Sync local state from props when sheet opens
  useEffect(() => {
    if (open) {
      setEditAbsent(new Set(initialAbsentIds));
      setEditGoalies([...initialGoalieAssignments]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleToggleAbsent(playerId: PlayerId) {
    setEditAbsent((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function handleGoalieChange(periodIndex: number, playerId: string) {
    setEditGoalies((prev) => {
      const filtered = prev.filter((a) => a.periodIndex !== periodIndex);
      return [...filtered, { periodIndex, playerId: playerId as PlayerId | 'auto' }];
    });
  }

  function handleRegenerate() {
    onRegenerate([...editAbsent], useGoalie ? editGoalies : []);
    onOpenChange(false);
  }

  const present = players.filter((p) => !editAbsent.has(p.id)).length;
  const eligibleGoalies = players.filter((p) => p.canPlayGoalie && !editAbsent.has(p.id));

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t('game_settings.title')}>
      <p className="text-ios-footnote text-muted-foreground text-center pb-4">
        {t('game_settings.instruction')}
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-ios-footnote text-muted-foreground uppercase tracking-wide">
            {t('game_settings.attendance', { present, total: players.length })}
          </p>
          <AttendanceList players={players} absentIds={editAbsent} onToggle={handleToggleAbsent} />
        </div>

        {useGoalie && (
          <div className="space-y-2">
            <p className="text-ios-footnote text-muted-foreground uppercase tracking-wide">
              {t('game_settings.goalie_assignment')}
            </p>
            <GoalieAssignmentSelector
              periods={periods}
              goalieAssignments={editGoalies}
              eligiblePlayers={eligibleGoalies}
              onChange={handleGoalieChange}
            />
          </div>
        )}

        <Button className="w-full" onClick={handleRegenerate}>
          {t('game_settings.regenerate')}
        </Button>
      </div>
    </BottomSheet>
  );
}

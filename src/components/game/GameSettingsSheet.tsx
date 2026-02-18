import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet.tsx';
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

  const eligibleGoalies = players.filter((p) => p.canPlayGoalie && !editAbsent.has(p.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Game Settings</SheetTitle>
          <SheetDescription>
            Edit attendance and goalie assignments, then regenerate.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Attendance ({players.filter((p) => !editAbsent.has(p.id)).length} / {players.length})
            </Label>
            <AttendanceList
              players={players}
              absentIds={editAbsent}
              onToggle={handleToggleAbsent}
            />
          </div>

          {useGoalie && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Goalie Assignment</Label>
              <GoalieAssignmentSelector
                periods={periods}
                goalieAssignments={editGoalies}
                eligiblePlayers={eligibleGoalies}
                onChange={handleGoalieChange}
              />
            </div>
          )}
        </div>

        <SheetFooter>
          <Button className="w-full" onClick={handleRegenerate}>
            Regenerate with Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

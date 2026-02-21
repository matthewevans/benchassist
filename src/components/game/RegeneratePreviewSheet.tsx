import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Button } from '@/components/ui/button.tsx';
import { RotationTable } from '@/components/game/RotationTable.tsx';
import { cn } from '@/lib/utils.ts';
import type { GameConfig, Player, PlayerId, RotationSchedule, Rotation } from '@/types/domain.ts';

interface RegeneratePreviewSheetProps {
  open: boolean;
  previewSchedule: RotationSchedule | null;
  currentSchedule: RotationSchedule | null;
  players: Player[];
  config: GameConfig;
  gameRemovedPlayerIds: PlayerId[];
  currentRotationIndex: number;
  highPlayOutlierIds: Set<PlayerId>;
  onApply: () => void;
  onCancel: () => void;
}

export function RegeneratePreviewSheet({
  open,
  previewSchedule,
  currentSchedule,
  players,
  config,
  gameRemovedPlayerIds,
  currentRotationIndex,
  highPlayOutlierIds,
  onApply,
  onCancel,
}: RegeneratePreviewSheetProps) {
  const { t } = useTranslation('game');
  const { t: tCommon } = useTranslation('common');

  const periodGroups = useMemo(() => {
    if (!previewSchedule) return [];
    const groups: { periodIndex: number; rotations: Rotation[] }[] = [];
    for (const rotation of previewSchedule.rotations) {
      const existing = groups.find((g) => g.periodIndex === rotation.periodIndex);
      if (existing) existing.rotations.push(rotation);
      else groups.push({ periodIndex: rotation.periodIndex, rotations: [rotation] });
    }
    return groups;
  }, [previewSchedule]);

  const percentRows = useMemo(() => {
    if (!previewSchedule || !currentSchedule) return [];
    return players.map((player) => {
      const current = currentSchedule.playerStats[player.id]?.playPercentage ?? 0;
      const next = previewSchedule.playerStats[player.id]?.playPercentage ?? 0;
      const delta = next - current;
      return { playerId: player.id, playerName: player.name, current, next, delta };
    });
  }, [currentSchedule, previewSchedule, players]);

  const changedCount = useMemo(
    () => percentRows.filter((row) => row.delta !== 0).length,
    [percentRows],
  );

  if (!previewSchedule || !currentSchedule) return null;

  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
      title={t('live.regenerate_preview_title')}
      description={t('live.regenerate_preview_instruction', { rotation: currentRotationIndex + 1 })}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onCancel}>
            {tCommon('actions.cancel')}
          </Button>
          <Button onClick={onApply}>{t('live.regenerate_preview_apply')}</Button>
        </div>
      }
    >
      <p className="text-ios-footnote text-muted-foreground text-center pb-4">
        {t('live.regenerate_preview_instruction', { rotation: currentRotationIndex + 1 })}
      </p>

      <div className="space-y-6">
        <GroupedList
          header={t('live.regenerate_preview_players_header')}
          footer={t('live.regenerate_preview_players_footer', { count: changedCount })}
        >
          {percentRows.map((row, idx) => (
            <GroupedListRow
              key={row.playerId}
              last={idx === percentRows.length - 1}
              trailing={
                <div className="ml-2 text-right tabular-nums leading-tight">
                  <span
                    className={cn(
                      'block text-ios-caption1',
                      row.delta === 0 ? 'text-muted-foreground' : 'text-foreground',
                    )}
                  >
                    {row.current}% → {row.next}%
                  </span>
                  <span
                    className={cn(
                      'block text-ios-caption1',
                      row.delta === 0 ? 'text-muted-foreground' : 'text-foreground',
                    )}
                  >
                    ({row.delta > 0 ? '+' : ''}
                    {row.delta}%)
                  </span>
                </div>
              }
            >
              <span className="truncate">{row.playerName}</span>
            </GroupedListRow>
          ))}
        </GroupedList>

        <section>
          <h3 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            {t('live.regenerate_preview_grid_header')}
          </h3>
          <div className="rounded-[10px] border border-border/50 bg-card overflow-hidden">
            <RotationTable
              periodGroups={periodGroups}
              allDisplayPlayers={players}
              playerStats={previewSchedule.playerStats}
              config={config}
              gameRemovedPlayerIds={gameRemovedPlayerIds}
              isLive={false}
              isCompleted={false}
              currentRotationIndex={currentRotationIndex}
              changingPlayerIds={new Set()}
              subTooltipMap={new Map()}
              collapsedPeriods={new Set()}
              togglePeriod={() => {}}
              highPlayOutlierIds={highPlayOutlierIds}
              canEditPeriodDivision={() => false}
              onPeriodActionsClick={() => {}}
              swapSource={null}
              onCellClick={() => {}}
              onRemovePlayer={() => {}}
              onAddPlayerBack={() => {}}
              showPeriodActions={false}
              interactiveCells={false}
            />
          </div>
        </section>
      </div>
    </BottomSheet>
  );
}

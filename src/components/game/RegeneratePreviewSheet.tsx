import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/bottom-sheet.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Button } from '@/components/ui/button.tsx';
import { RotationTable } from '@/components/game/RotationTable.tsx';
import { cn } from '@/lib/utils.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type { GameConfig, Player, PlayerId, RotationSchedule, Rotation } from '@/types/domain.ts';
import { getAssignmentDisplay } from '@/utils/positions.ts';

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

function buildRotationSlotMaps(rotations: Rotation[]) {
  const slotByIndex = new Map<number, string>();
  const rotationBySlot = new Map<string, Rotation>();
  const rotationsByPeriod = new Map<number, Rotation[]>();
  const periodOrdinals = new Map<number, number>();

  for (const rotation of rotations) {
    const ordinal = periodOrdinals.get(rotation.periodIndex) ?? 0;
    const slotKey = `${rotation.periodIndex}:${ordinal}`;
    periodOrdinals.set(rotation.periodIndex, ordinal + 1);
    slotByIndex.set(rotation.index, slotKey);
    rotationBySlot.set(slotKey, rotation);
    const periodRotations = rotationsByPeriod.get(rotation.periodIndex) ?? [];
    periodRotations.push(rotation);
    rotationsByPeriod.set(rotation.periodIndex, periodRotations);
  }

  return { slotByIndex, rotationBySlot, rotationsByPeriod };
}

function parseSlotKey(slotKey: string): { periodIndex: number; ordinal: number } | null {
  const [periodText, ordinalText] = slotKey.split(':');
  const periodIndex = Number(periodText);
  const ordinal = Number(ordinalText);
  if (!Number.isInteger(periodIndex) || !Number.isInteger(ordinal) || ordinal < 0) return null;
  return { periodIndex, ordinal };
}

function mapOrdinal(previewOrdinal: number, previewCount: number, currentCount: number): number {
  if (currentCount <= 1 || previewCount <= 1) return 0;
  const ratio = (previewOrdinal * (currentCount - 1)) / (previewCount - 1);
  const mapped = Math.round(ratio);
  return Math.max(0, Math.min(currentCount - 1, mapped));
}

function resolveComparableCurrentRotation(
  slotKey: string,
  current: {
    rotationBySlot: Map<string, Rotation>;
    rotationsByPeriod: Map<number, Rotation[]>;
  },
  preview: { rotationsByPeriod: Map<number, Rotation[]> },
): Rotation | null {
  const direct = current.rotationBySlot.get(slotKey);
  if (direct) return direct;

  const parsed = parseSlotKey(slotKey);
  if (!parsed) return null;
  const currentPeriodRotations = current.rotationsByPeriod.get(parsed.periodIndex);
  const previewPeriodRotations = preview.rotationsByPeriod.get(parsed.periodIndex);
  if (!currentPeriodRotations || currentPeriodRotations.length === 0) return null;
  if (!previewPeriodRotations || previewPeriodRotations.length === 0) return null;

  const mappedOrdinal = mapOrdinal(
    parsed.ordinal,
    previewPeriodRotations.length,
    currentPeriodRotations.length,
  );
  return currentPeriodRotations[mappedOrdinal] ?? null;
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
  const { previewCellChanges, changedCellCount, changedRotationCount } = useMemo(() => {
    if (!previewSchedule || !currentSchedule) {
      return {
        previewCellChanges: new Map<string, { fromLabel: string; toLabel: string }>(),
        changedCellCount: 0,
        changedRotationCount: 0,
      };
    }

    const currentMaps = buildRotationSlotMaps(currentSchedule.rotations);
    const previewMaps = buildRotationSlotMaps(previewSchedule.rotations);
    const changes = new Map<string, { fromLabel: string; toLabel: string }>();
    const changedRotations = new Set<number>();

    for (const previewRotation of previewSchedule.rotations) {
      if (previewRotation.index < currentRotationIndex) continue;
      const slotKey = previewMaps.slotByIndex.get(previewRotation.index);
      if (!slotKey) continue;
      const currentRotation = resolveComparableCurrentRotation(slotKey, currentMaps, previewMaps);
      for (const player of players) {
        const nextAssignment = previewRotation.assignments[player.id] ?? RotationAssignment.Bench;
        if (!currentRotation) {
          const key = `${previewRotation.index}:${player.id}`;
          const toDisplay = getAssignmentDisplay(
            nextAssignment,
            previewRotation.fieldPositions?.[player.id],
            config.usePositions,
          );
          changes.set(key, { fromLabel: '-', toLabel: toDisplay.label });
          changedRotations.add(previewRotation.index);
          continue;
        }
        const currentAssignment =
          currentRotation.assignments[player.id] ?? RotationAssignment.Bench;
        const nextFieldPosition = previewRotation.fieldPositions?.[player.id];
        const currentFieldPosition = currentRotation.fieldPositions?.[player.id];
        const compareFieldPosition =
          config.usePositions &&
          nextAssignment === RotationAssignment.Field &&
          currentAssignment === RotationAssignment.Field;
        if (
          nextAssignment !== currentAssignment ||
          (compareFieldPosition && nextFieldPosition !== currentFieldPosition)
        ) {
          const key = `${previewRotation.index}:${player.id}`;
          const fromDisplay = getAssignmentDisplay(
            currentAssignment,
            currentFieldPosition,
            config.usePositions,
          );
          const toDisplay = getAssignmentDisplay(
            nextAssignment,
            nextFieldPosition,
            config.usePositions,
          );
          changes.set(key, { fromLabel: fromDisplay.label, toLabel: toDisplay.label });
          changedRotations.add(previewRotation.index);
        }
      }
    }

    return {
      previewCellChanges: changes,
      changedCellCount: changes.size,
      changedRotationCount: changedRotations.size,
    };
  }, [config.usePositions, currentRotationIndex, currentSchedule, players, previewSchedule]);

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
          <div className="px-4 pb-2">
            <div className="rounded-[10px] border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="flex items-center gap-2 text-ios-caption1 text-foreground">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-primary animate-pulse shrink-0"
                />
                {t('live.regenerate_preview_grid_legend')}
              </p>
              <p className="mt-1 text-ios-caption2 tabular-nums text-muted-foreground">
                {t('live.regenerate_preview_grid_count', {
                  cells: changedCellCount,
                  rotations: changedRotationCount,
                })}
              </p>
            </div>
          </div>
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
              previewCellChanges={previewCellChanges}
            />
          </div>
        </section>
      </div>
    </BottomSheet>
  );
}

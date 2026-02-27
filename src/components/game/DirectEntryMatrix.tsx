import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.tsx';
import {
  PeriodRotationIndicator,
  type PeriodRotationGroup,
} from '@/components/game/PeriodRotationIndicator.tsx';
import { cn } from '@/lib/utils.ts';
import type { DirectEntryCell, DirectEntryDraft, DirectEntrySlot } from '@/utils/directEntry.ts';
import { makeDirectEntryCellKey } from '@/utils/directEntry.ts';

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

function getIsDesktopViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

interface DirectEntryMatrixProps {
  slots: DirectEntrySlot[];
  totalRotations: number;
  periodGroups: PeriodRotationGroup[];
  draft: DirectEntryDraft;
  playerNameById: Map<string, string>;
  currentRotationIndex: number;
  onChangeRotation: (rotationIndex: number) => void;
  onSelectCell: (rotationIndex: number, slot: DirectEntrySlot) => void;
  onToggleCellLock: (rotationIndex: number, slotId: string) => void;
}

const CellValue = memo(function CellValue({
  name,
  lockMode,
  hardLockLabel,
  softLockLabel,
  onPick,
  onToggleLock,
}: {
  name: string;
  lockMode: 'hard' | 'soft' | null;
  hardLockLabel: string;
  softLockLabel: string;
  onPick: () => void;
  onToggleLock: () => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-1">
      <button
        type="button"
        className="flex-1 min-h-11 rounded-md border border-border/60 px-2 text-left text-ios-caption1 active:bg-accent"
        onClick={onPick}
      >
        <span className={name === '—' ? 'text-muted-foreground' : 'text-foreground'}>{name}</span>
      </button>
      {lockMode && (
        <button
          type="button"
          className="min-h-11 min-w-11 rounded-md border border-border/60 text-ios-caption1 font-semibold active:bg-accent"
          aria-label={lockMode === 'hard' ? hardLockLabel : softLockLabel}
          onClick={onToggleLock}
        >
          {lockMode === 'hard' ? 'H' : 'S'}
        </button>
      )}
    </div>
  );
});

interface MatrixCellProps {
  slot: DirectEntrySlot;
  rotationIndex: number;
  cell: DirectEntryCell | undefined;
  playerNameById: Map<string, string>;
  onSelectCell: (rotationIndex: number, slot: DirectEntrySlot) => void;
  onToggleCellLock: (rotationIndex: number, slotId: string) => void;
  hardLockLabel: string;
  softLockLabel: string;
}

const MatrixCell = memo(function MatrixCell({
  slot,
  rotationIndex,
  cell,
  playerNameById,
  onSelectCell,
  onToggleCellLock,
  hardLockLabel,
  softLockLabel,
}: MatrixCellProps) {
  const handlePick = useCallback(() => {
    onSelectCell(rotationIndex, slot);
  }, [onSelectCell, rotationIndex, slot]);

  const handleToggleLock = useCallback(() => {
    onToggleCellLock(rotationIndex, slot.id);
  }, [onToggleCellLock, rotationIndex, slot.id]);

  return (
    <CellValue
      name={cell?.playerId ? (playerNameById.get(cell.playerId) ?? '—') : '—'}
      lockMode={cell?.playerId ? cell.lockMode : null}
      hardLockLabel={hardLockLabel}
      softLockLabel={softLockLabel}
      onPick={handlePick}
      onToggleLock={handleToggleLock}
    />
  );
});

export function DirectEntryMatrix({
  slots,
  totalRotations,
  periodGroups,
  draft,
  playerNameById,
  currentRotationIndex,
  onChangeRotation,
  onSelectCell,
  onToggleCellLock,
}: DirectEntryMatrixProps) {
  const { t } = useTranslation('game');
  const [isDesktop, setIsDesktop] = useState(getIsDesktopViewport);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const hardLockLabel = t('direct_entry.lock_state_hard');
  const softLockLabel = t('direct_entry.lock_state_soft');
  const periodStartRotationIndexes = useMemo(() => {
    const starts = new Set<number>();
    for (const group of periodGroups) {
      const firstRotation = group.rotations[0];
      if (firstRotation) starts.add(firstRotation.index);
    }
    return starts;
  }, [periodGroups]);

  return (
    <div className="space-y-4">
      {isDesktop ? (
        <div className="overflow-x-auto rounded-[10px] border border-border/60 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th
                  rowSpan={2}
                  className="text-left px-3 py-2 text-ios-footnote uppercase tracking-wide text-muted-foreground sticky left-0 bg-card z-10"
                >
                  {t('direct_entry.slot')}
                </th>
                {periodGroups.map((group) => {
                  const periodRotationCount = Math.max(group.rotations.length, 1);
                  return (
                    <th
                      key={`period-${group.periodIndex}`}
                      colSpan={periodRotationCount}
                      className={cn(
                        'px-2 py-1.5 text-center text-ios-caption2 font-semibold tracking-wide text-muted-foreground',
                        group.periodIndex % 2 === 0 ? 'bg-secondary/20' : 'bg-secondary/30',
                        group.periodIndex > 0 && 'border-l border-border/55',
                      )}
                    >
                      {t('field.period_label', { period: group.periodIndex + 1 })}
                    </th>
                  );
                })}
              </tr>
              <tr className="border-b border-border/40">
                {Array.from({ length: totalRotations }, (_, rotationIndex) => (
                  <th
                    key={rotationIndex}
                    className={cn(
                      'text-center px-2 py-2 text-ios-footnote uppercase tracking-wide text-muted-foreground min-w-44',
                      periodStartRotationIndexes.has(rotationIndex) &&
                        rotationIndex > 0 &&
                        'border-l border-border/55',
                    )}
                  >
                    {t('live.rotation', { index: rotationIndex + 1 })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, slotIdx) => (
                <tr
                  key={slot.id}
                  className={slotIdx === slots.length - 1 ? '' : 'border-b border-border/30'}
                >
                  <th className="px-3 py-2 text-left text-ios-caption1 text-muted-foreground sticky left-0 bg-card z-10">
                    {slot.label}
                  </th>
                  {Array.from({ length: totalRotations }, (_, rotationIndex) => {
                    const key = makeDirectEntryCellKey(rotationIndex, slot.id);
                    const cell = draft[key];
                    return (
                      <td
                        key={rotationIndex}
                        className={cn(
                          'px-2 py-2 align-top',
                          periodStartRotationIndexes.has(rotationIndex) &&
                            rotationIndex > 0 &&
                            'border-l border-border/45',
                        )}
                      >
                        <MatrixCell
                          slot={slot}
                          rotationIndex={rotationIndex}
                          cell={cell}
                          playerNameById={playerNameById}
                          onSelectCell={onSelectCell}
                          onToggleCellLock={onToggleCellLock}
                          hardLockLabel={hardLockLabel}
                          softLockLabel={softLockLabel}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {periodGroups.length > 0 && (
            <PeriodRotationIndicator
              periodGroups={periodGroups}
              currentRotationIndex={currentRotationIndex}
              className="justify-center"
            />
          )}

          <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              aria-label={t('live.previous_rotation')}
              onClick={() => onChangeRotation(Math.max(0, currentRotationIndex - 1))}
              disabled={currentRotationIndex <= 0}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="text-ios-footnote text-muted-foreground text-center whitespace-nowrap">
              {t('live.rotation', { index: currentRotationIndex + 1 })}
            </p>
            <Button
              variant="secondary"
              size="icon"
              aria-label={t('live.next_rotation')}
              onClick={() =>
                onChangeRotation(Math.min(totalRotations - 1, currentRotationIndex + 1))
              }
              disabled={currentRotationIndex >= totalRotations - 1}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="rounded-[10px] border border-border/60 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {slots.map((slot, idx) => {
                  const key = makeDirectEntryCellKey(currentRotationIndex, slot.id);
                  const cell = draft[key];
                  return (
                    <tr
                      key={slot.id}
                      className={idx === slots.length - 1 ? '' : 'border-b border-border/40'}
                    >
                      <th className="w-28 px-3 py-2 text-left text-ios-footnote text-muted-foreground uppercase tracking-wide">
                        {slot.label}
                      </th>
                      <td className="px-2 py-2">
                        <MatrixCell
                          slot={slot}
                          rotationIndex={currentRotationIndex}
                          cell={cell}
                          playerNameById={playerNameById}
                          onSelectCell={onSelectCell}
                          onToggleCellLock={onToggleCellLock}
                          hardLockLabel={hardLockLabel}
                          softLockLabel={softLockLabel}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

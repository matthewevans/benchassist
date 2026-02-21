import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.tsx';
import type { DirectEntryDraft, DirectEntrySlot } from '@/utils/directEntry.ts';
import { makeDirectEntryCellKey } from '@/utils/directEntry.ts';

interface DirectEntryMatrixProps {
  slots: DirectEntrySlot[];
  totalRotations: number;
  draft: DirectEntryDraft;
  playerNameById: Map<string, string>;
  currentRotationIndex: number;
  onChangeRotation: (rotationIndex: number) => void;
  onSelectCell: (rotationIndex: number, slot: DirectEntrySlot) => void;
  onToggleCellLock: (rotationIndex: number, slotId: string) => void;
}

function CellValue({
  name,
  lockMode,
  onPick,
  onToggleLock,
}: {
  name: string;
  lockMode: 'hard' | 'soft' | null;
  onPick: () => void;
  onToggleLock: () => void;
}) {
  const { t } = useTranslation('game');

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
          aria-label={
            lockMode === 'hard'
              ? t('direct_entry.lock_state_hard')
              : t('direct_entry.lock_state_soft')
          }
          onClick={onToggleLock}
        >
          {lockMode === 'hard' ? 'H' : 'S'}
        </button>
      )}
    </div>
  );
}

export function DirectEntryMatrix({
  slots,
  totalRotations,
  draft,
  playerNameById,
  currentRotationIndex,
  onChangeRotation,
  onSelectCell,
  onToggleCellLock,
}: DirectEntryMatrixProps) {
  const { t } = useTranslation('game');

  return (
    <div className="space-y-4">
      <div className="lg:hidden flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChangeRotation(Math.max(0, currentRotationIndex - 1))}
          disabled={currentRotationIndex <= 0}
        >
          <ChevronLeft className="size-4" />
          {t('live.previous_rotation')}
        </Button>
        <p className="text-ios-footnote text-muted-foreground">
          {t('live.rotation', { index: currentRotationIndex + 1 })}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChangeRotation(Math.min(totalRotations - 1, currentRotationIndex + 1))}
          disabled={currentRotationIndex >= totalRotations - 1}
        >
          {t('live.next_rotation')}
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="lg:hidden rounded-[10px] border border-border/60 bg-card overflow-hidden">
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
                    <CellValue
                      name={cell?.playerId ? (playerNameById.get(cell.playerId) ?? '—') : '—'}
                      lockMode={cell?.playerId ? cell.lockMode : null}
                      onPick={() => onSelectCell(currentRotationIndex, slot)}
                      onToggleLock={() => onToggleCellLock(currentRotationIndex, slot.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="hidden lg:block overflow-x-auto rounded-[10px] border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left px-3 py-2 text-ios-footnote uppercase tracking-wide text-muted-foreground sticky left-0 bg-card z-10">
                {t('direct_entry.slot')}
              </th>
              {Array.from({ length: totalRotations }, (_, rotationIndex) => (
                <th
                  key={rotationIndex}
                  className="text-center px-2 py-2 text-ios-footnote uppercase tracking-wide text-muted-foreground min-w-44"
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
                    <td key={rotationIndex} className="px-2 py-2 align-top">
                      <CellValue
                        name={cell?.playerId ? (playerNameById.get(cell.playerId) ?? '—') : '—'}
                        lockMode={cell?.playerId ? cell.lockMode : null}
                        onPick={() => onSelectCell(rotationIndex, slot)}
                        onToggleLock={() => onToggleCellLock(rotationIndex, slot.id)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

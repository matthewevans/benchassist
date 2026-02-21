import { ArrowDownIcon, ArrowRightLeftIcon, ArrowUpIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { cn } from '@/lib/utils.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type { Player, PlayerId, Rotation, SubPosition } from '@/types/domain.ts';
import { getAssignmentDisplay } from '@/utils/positions.ts';

// Display order for pitch positions: forwards at top -> mids -> defenders -> GK
const POSITION_GROUP_ORDER: Record<string, number> = { FWD: 0, MID: 1, DEF: 2, GK: 3 };

const SUB_POSITION_ORDER: Partial<Record<SubPosition, number>> = {
  // FWD
  ST: 0,
  CF: 1,
  LW: 2,
  RW: 3,
  // MID
  LM: 0,
  LCM: 1,
  CM: 2,
  RCM: 3,
  RM: 4,
  // DEF
  LB: 0,
  LCB: 1,
  CB: 2,
  RCB: 3,
  RB: 4,
};

const SUB_POSITION_GROUP: Partial<Record<SubPosition, string>> = {
  LB: 'DEF',
  CB: 'DEF',
  RB: 'DEF',
  LCB: 'DEF',
  RCB: 'DEF',
  LM: 'MID',
  CM: 'MID',
  RM: 'MID',
  LCM: 'MID',
  RCM: 'MID',
  LW: 'FWD',
  RW: 'FWD',
  ST: 'FWD',
  CF: 'FWD',
};

function positionSortKey(
  assignment: RotationAssignment,
  fieldPos: SubPosition | undefined,
  skillRanking: number,
): [number, number, number] {
  if (assignment === RotationAssignment.Goalie) return [3, 0, -skillRanking];
  if (assignment === RotationAssignment.Bench) return [4, 0, -skillRanking];
  if (fieldPos) {
    const group = POSITION_GROUP_ORDER[SUB_POSITION_GROUP[fieldPos] ?? 'MID'] ?? 1;
    const within = SUB_POSITION_ORDER[fieldPos] ?? 0;
    return [group, within, -skillRanking];
  }
  return [2, 0, -skillRanking];
}

function sortPlayers(
  rotation: Rotation,
  playerMap: Map<PlayerId, Player>,
): { field: Player[]; bench: Player[] } {
  const field: Player[] = [];
  const bench: Player[] = [];

  for (const [playerId, assignment] of Object.entries(rotation.assignments)) {
    const player = playerMap.get(playerId as PlayerId);
    if (!player) continue;
    if (assignment === RotationAssignment.Bench) {
      bench.push(player);
    } else {
      field.push(player);
    }
  }

  field.sort((a, b) => {
    const aAssign = rotation.assignments[a.id as PlayerId];
    const bAssign = rotation.assignments[b.id as PlayerId];
    const aPos = rotation.fieldPositions?.[a.id as PlayerId];
    const bPos = rotation.fieldPositions?.[b.id as PlayerId];
    const [ag, aw, as_] = positionSortKey(aAssign, aPos, a.skillRanking);
    const [bg, bw, bs] = positionSortKey(bAssign, bPos, b.skillRanking);
    return ag - bg || aw - bw || as_ - bs;
  });
  bench.sort((a, b) => b.skillRanking - a.skillRanking);

  return { field, bench };
}

type TransitionKind = 'in' | 'out' | 'position' | 'role';

interface PlayerTransition {
  playerId: PlayerId;
  playerName: string;
  kind: TransitionKind;
  fromLabel: string;
  toLabel: string;
}

function getTransitionTone(kind: TransitionKind) {
  if (kind === 'in') {
    return {
      icon: ArrowUpIcon,
      iconTone: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-500/12 dark:bg-green-500/18',
      chipTone: 'text-green-700 dark:text-green-300 bg-green-500/12 dark:bg-green-500/18',
    };
  }
  if (kind === 'out') {
    return {
      icon: ArrowDownIcon,
      iconTone: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-500/12 dark:bg-orange-500/18',
      chipTone: 'text-orange-700 dark:text-orange-300 bg-orange-500/12 dark:bg-orange-500/18',
    };
  }
  if (kind === 'position') {
    return {
      icon: ArrowRightLeftIcon,
      iconTone: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/12 dark:bg-blue-500/18',
      chipTone: 'text-blue-700 dark:text-blue-300 bg-blue-500/12 dark:bg-blue-500/18',
    };
  }
  return {
    icon: ArrowRightLeftIcon,
    iconTone: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-500/12 dark:bg-indigo-500/18',
    chipTone: 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/12 dark:bg-indigo-500/18',
  };
}

function transitionLabelKey(kind: TransitionKind) {
  if (kind === 'in') return 'live.sub_in' as const;
  if (kind === 'out') return 'live.sub_out' as const;
  if (kind === 'position') return 'live.position_change' as const;
  return 'live.role_change' as const;
}

interface PlayerRowProps {
  player: Player;
  assignment: RotationAssignment;
  fieldPos: SubPosition | undefined;
  usePositions: boolean;
  transition?: PlayerTransition;
  isLast: boolean;
}

function PlayerRow({
  player,
  assignment,
  fieldPos,
  usePositions,
  transition,
  isLast,
}: PlayerRowProps) {
  const { t } = useTranslation('game');
  const display = getAssignmentDisplay(assignment, fieldPos, usePositions);
  const isBench = assignment === RotationAssignment.Bench;
  const tone = transition ? getTransitionTone(transition.kind) : null;
  const ToneIcon = tone?.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 min-h-11',
        !isLast && 'border-b border-border/30',
        transition && 'bg-secondary/35',
      )}
    >
      <span
        className={cn(
          'shrink-0 w-9 text-center text-xs rounded-md px-1 py-0.5 font-semibold tabular-nums',
          isBench ? 'bg-muted text-muted-foreground' : display.className,
        )}
      >
        {isBench ? 'B' : display.label}
      </span>

      <div className="flex-1 min-w-0 py-2">
        <p
          className={cn(
            'text-ios-subheadline truncate',
            isBench && !transition && 'text-muted-foreground',
            transition && tone?.iconTone,
          )}
        >
          {player.name}
        </p>
      </div>

      {transition && tone && ToneIcon && (
        <span
          className={cn(
            'shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
            tone.chipTone,
          )}
        >
          <ToneIcon className="size-3.5" />
          {t(transitionLabelKey(transition.kind))}
        </span>
      )}
    </div>
  );
}

interface RotationSectionProps {
  rotation: Rotation;
  label: string;
  sublabel: string;
  isCurrent: boolean;
  playerMap: Map<PlayerId, Player>;
  transitionByPlayerId: Map<PlayerId, PlayerTransition>;
  usePositions: boolean;
}

function RotationSection({
  rotation,
  label,
  sublabel,
  isCurrent,
  playerMap,
  transitionByPlayerId,
  usePositions,
}: RotationSectionProps) {
  const { field, bench } = sortPlayers(rotation, playerMap);
  const allPlayers = [...field, ...bench];

  return (
    <section>
      <div className="flex items-baseline gap-2 px-4 pb-1.5">
        <h3
          className={cn(
            'text-ios-footnote uppercase tracking-wide',
            isCurrent ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {label}
        </h3>
        <span className="text-ios-caption1 text-muted-foreground">{sublabel}</span>
      </div>
      <div className="bg-card rounded-[10px] mx-4 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
        {allPlayers.map((player, i) => {
          const assignment = rotation.assignments[player.id as PlayerId];
          const fieldPos = rotation.fieldPositions?.[player.id as PlayerId];
          const transition = transitionByPlayerId.get(player.id as PlayerId);

          return (
            <PlayerRow
              key={player.id}
              player={player}
              assignment={assignment}
              fieldPos={fieldPos}
              usePositions={usePositions}
              transition={transition}
              isLast={i === allPlayers.length - 1}
            />
          );
        })}
      </div>
    </section>
  );
}

interface Props {
  currentRotation: Rotation;
  nextRotation: Rotation | undefined;
  playerMap: Map<PlayerId, Player>;
  usePositions: boolean;
}

export function LiveFocusView({ currentRotation, nextRotation, playerMap, usePositions }: Props) {
  const { t } = useTranslation('game');

  const transitions: PlayerTransition[] = [];

  if (nextRotation) {
    const playerIds = new Set<PlayerId>([
      ...(Object.keys(currentRotation.assignments) as PlayerId[]),
      ...(Object.keys(nextRotation.assignments) as PlayerId[]),
    ]);

    function displayLabel(
      assignment: RotationAssignment | undefined,
      fieldPos: SubPosition | undefined,
    ): string {
      if (assignment === RotationAssignment.Bench) return t('live.role_bench');
      if (assignment === RotationAssignment.Goalie) return 'GK';
      if (assignment === RotationAssignment.Field) {
        if (usePositions && fieldPos) return fieldPos;
        return t('live.role_field');
      }
      return t('live.role_bench');
    }

    for (const playerId of playerIds) {
      const player = playerMap.get(playerId);
      if (!player) continue;

      const fromAssignment = currentRotation.assignments[playerId];
      const toAssignment = nextRotation.assignments[playerId];
      const fromPos = currentRotation.fieldPositions?.[playerId];
      const toPos = nextRotation.fieldPositions?.[playerId];

      const assignmentChanged = fromAssignment !== toAssignment;
      const positionChanged = fromPos !== toPos;
      if (!assignmentChanged && !positionChanged) continue;

      let kind: TransitionKind;
      if (
        fromAssignment === RotationAssignment.Bench &&
        toAssignment !== RotationAssignment.Bench
      ) {
        kind = 'in';
      } else if (
        fromAssignment !== RotationAssignment.Bench &&
        toAssignment === RotationAssignment.Bench
      ) {
        kind = 'out';
      } else if (assignmentChanged) {
        kind = 'role';
      } else {
        kind = 'position';
      }

      transitions.push({
        playerId,
        playerName: player.name,
        kind,
        fromLabel: displayLabel(fromAssignment, fromPos),
        toLabel: displayLabel(toAssignment, toPos),
      });
    }

    transitions.sort((a, b) => a.playerName.localeCompare(b.playerName));
  }

  const nextTransitionsByPlayerId = new Map(
    transitions.map((transition) => [transition.playerId, transition]),
  );

  return (
    <div className="space-y-5">
      <RotationSection
        rotation={currentRotation}
        label={t('live.now')}
        sublabel={t('live.rotation', { index: currentRotation.index + 1 })}
        isCurrent={true}
        playerMap={playerMap}
        transitionByPlayerId={new Map()}
        usePositions={usePositions}
      />

      {nextRotation && transitions.length > 0 && (
        <GroupedList header={t('live.upcoming_changes')} className="mx-4">
          {transitions.map((transition, i) => {
            const tone = getTransitionTone(transition.kind);
            const ToneIcon = tone.icon;
            return (
              <GroupedListRow
                key={transition.playerId}
                last={i === transitions.length - 1}
                trailing={
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                      tone.chipTone,
                    )}
                  >
                    <ToneIcon className="size-3.5" />
                    {t(transitionLabelKey(transition.kind))}
                  </span>
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      'inline-flex size-7 items-center justify-center rounded-full shrink-0',
                      tone.iconBg,
                    )}
                  >
                    <ToneIcon className={cn('size-3.5', tone.iconTone)} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-ios-subheadline truncate">{transition.playerName}</p>
                    <p className="text-ios-caption1 text-muted-foreground truncate tabular-nums">
                      {transition.fromLabel} -&gt; {transition.toLabel}
                    </p>
                  </div>
                </div>
              </GroupedListRow>
            );
          })}
        </GroupedList>
      )}

      {nextRotation ? (
        <RotationSection
          rotation={nextRotation}
          label={t('live.next')}
          sublabel={t('live.rotation', { index: nextRotation.index + 1 })}
          isCurrent={false}
          playerMap={playerMap}
          transitionByPlayerId={nextTransitionsByPlayerId}
          usePositions={usePositions}
        />
      ) : (
        <div className="mx-4 rounded-[10px] bg-card px-4 py-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
          <p className="text-ios-footnote text-muted-foreground">{t('live.last_rotation')}</p>
        </div>
      )}
    </div>
  );
}

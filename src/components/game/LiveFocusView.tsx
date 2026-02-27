import { ArrowDownIcon, ArrowRightLeftIcon, ArrowUpIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type { Player, PlayerId, Rotation, SubPosition } from '@/types/domain.ts';
import { getAssignmentDisplay, SUB_POSITION_GROUP } from '@/utils/positions.ts';
import {
  getRotationTransitions,
  type RotationTransitionKind,
} from '@/utils/rotationTransitions.ts';

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

interface PlayerTransition {
  playerId: PlayerId;
  playerName: string;
  kind: RotationTransitionKind;
  fromLabel: string;
  toLabel: string;
}

const TRANSITION_TONE: Record<
  RotationTransitionKind,
  {
    icon: typeof ArrowUpIcon;
    iconTone: string;
    chipTone: string;
  }
> = {
  in: {
    icon: ArrowUpIcon,
    iconTone: 'text-green-600 dark:text-green-400',
    chipTone: 'text-green-700 dark:text-green-300 bg-green-500/12 dark:bg-green-500/18',
  },
  out: {
    icon: ArrowDownIcon,
    iconTone: 'text-orange-600 dark:text-orange-400',
    chipTone: 'text-orange-700 dark:text-orange-300 bg-orange-500/12 dark:bg-orange-500/18',
  },
  position: {
    icon: ArrowRightLeftIcon,
    iconTone: 'text-blue-600 dark:text-blue-400',
    chipTone: 'text-blue-700 dark:text-blue-300 bg-blue-500/12 dark:bg-blue-500/18',
  },
  role: {
    icon: ArrowRightLeftIcon,
    iconTone: 'text-violet-600 dark:text-violet-400',
    chipTone: 'text-violet-700 dark:text-violet-300 bg-violet-500/12 dark:bg-violet-500/18',
  },
};

const TRANSITION_LABEL_KEY = {
  in: 'live.sub_in',
  out: 'live.sub_out',
  position: 'live.position_change',
  role: 'live.role_change',
} as const satisfies Record<RotationTransitionKind, string>;

function TransitionSummary({ transitions }: { transitions: PlayerTransition[] }) {
  const { t } = useTranslation('game');
  const counts: Record<RotationTransitionKind, number> = { in: 0, out: 0, position: 0, role: 0 };
  for (const transition of transitions) {
    counts[transition.kind]++;
  }

  if (transitions.length === 0) {
    return <p className="mx-4 text-ios-footnote text-muted-foreground">{t('field.no_changes')}</p>;
  }

  const orderedKinds: RotationTransitionKind[] = ['in', 'out', 'position', 'role'];
  return (
    <div className="mx-4 flex flex-wrap gap-2">
      {orderedKinds.map((kind) => {
        const count = counts[kind];
        if (count === 0) return null;
        const tone = TRANSITION_TONE[kind];
        const ToneIcon = tone.icon;
        return (
          <span
            key={kind}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
              tone.chipTone,
            )}
          >
            <ToneIcon className="size-3.5" />
            {count} {t(TRANSITION_LABEL_KEY[kind])}
          </span>
        );
      })}
    </div>
  );
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
  const tone = transition ? TRANSITION_TONE[transition.kind] : null;
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
          {t(TRANSITION_LABEL_KEY[transition.kind])}
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

    for (const transition of getRotationTransitions(currentRotation, nextRotation)) {
      const player = playerMap.get(transition.playerId);
      if (!player) continue;

      transitions.push({
        playerId: transition.playerId,
        playerName: player.name,
        kind: transition.kind,
        fromLabel: displayLabel(transition.fromAssignment, transition.fromPos),
        toLabel: displayLabel(transition.toAssignment, transition.toPos),
      });
    }

    transitions.sort((a, b) => a.playerName.localeCompare(b.playerName));
  }

  const nextTransitionsByPlayerId = new Map(
    transitions.map((transition) => [transition.playerId, transition]),
  );

  return (
    <div className="space-y-5">
      {nextRotation && <TransitionSummary transitions={transitions} />}

      <RotationSection
        rotation={currentRotation}
        label={t('live.now')}
        sublabel={t('live.rotation', { index: currentRotation.index + 1 })}
        isCurrent={true}
        playerMap={playerMap}
        transitionByPlayerId={new Map()}
        usePositions={usePositions}
      />

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

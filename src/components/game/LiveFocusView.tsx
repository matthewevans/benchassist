import { ArrowUpIcon, ArrowDownIcon, ArrowRightLeftIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type { PlayerId, Player, Rotation, SubPosition } from '@/types/domain.ts';
import { getAssignmentDisplay } from '@/utils/positions.ts';

// Display order for pitch positions: forwards at top → mids → defenders → GK
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
  const isComingIn = transition?.kind === 'in';
  const isGoingOut = transition?.kind === 'out';
  const isPositionChange = transition?.kind === 'position';
  const isRoleChange = transition?.kind === 'role';

  function transitionLabel(): string {
    if (!transition) return '';
    if (transition.kind === 'in') return t('live.sub_in');
    if (transition.kind === 'out') return t('live.sub_out');
    if (transition.kind === 'position') return t('live.position_change');
    return t('live.role_change');
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 min-h-[44px]',
        !isLast && 'border-b border-border/30',
        isComingIn && 'bg-green-500/10 dark:bg-green-500/8',
        isGoingOut && 'bg-orange-500/10 dark:bg-orange-500/8',
        isPositionChange && 'bg-blue-500/10 dark:bg-blue-500/8',
        isRoleChange && 'bg-indigo-500/10 dark:bg-indigo-500/8',
      )}
    >
      <span
        className={cn(
          'shrink-0 w-9 text-center text-xs rounded-md px-1 py-0.5 font-semibold',
          isBench ? 'bg-muted text-muted-foreground' : display.className,
        )}
      >
        {isBench ? 'B' : display.label}
      </span>
      <span
        className={cn(
          'flex-1 text-ios-body',
          isBench && !isGoingOut && 'text-muted-foreground',
          isComingIn && 'font-semibold text-green-600 dark:text-green-400',
          isGoingOut && 'font-semibold text-orange-600 dark:text-orange-400',
          isPositionChange && 'font-semibold text-blue-600 dark:text-blue-400',
          isRoleChange && 'font-semibold text-indigo-600 dark:text-indigo-400',
        )}
      >
        {player.name}
      </span>
      {transition && (
        <div className="shrink-0 text-right leading-tight">
          <div
            className={cn(
              'flex items-center justify-end gap-1 text-xs font-semibold',
              isComingIn && 'text-green-600 dark:text-green-400',
              isGoingOut && 'text-orange-600 dark:text-orange-400',
              isPositionChange && 'text-blue-600 dark:text-blue-400',
              isRoleChange && 'text-indigo-600 dark:text-indigo-400',
            )}
          >
            {isComingIn ? (
              <ArrowUpIcon className="size-3.5" />
            ) : isGoingOut ? (
              <ArrowDownIcon className="size-3.5" />
            ) : (
              <ArrowRightLeftIcon className="size-3.5" />
            )}
            {transitionLabel()}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {transition.fromLabel} -&gt; {transition.toLabel}
          </div>
        </div>
      )}
    </div>
  );
}

type TransitionKind = 'in' | 'out' | 'position' | 'role';

interface PlayerTransition {
  playerId: PlayerId;
  playerName: string;
  kind: TransitionKind;
  fromLabel: string;
  toLabel: string;
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
      <div className="bg-card rounded-[10px] mx-4 overflow-hidden">
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

  function transitionTag(kind: TransitionKind): string {
    if (kind === 'in') return t('live.sub_in');
    if (kind === 'out') return t('live.sub_out');
    if (kind === 'position') return t('live.position_change');
    return t('live.role_change');
  }

  return (
    <div className="space-y-5">
      {/* Current rotation */}
      <RotationSection
        rotation={currentRotation}
        label={t('live.now')}
        sublabel={t('live.rotation', { index: currentRotation.index + 1 })}
        isCurrent={true}
        playerMap={playerMap}
        transitionByPlayerId={new Map()}
        usePositions={usePositions}
      />

      {/* Upcoming changes banner */}
      {nextRotation && transitions.length > 0 && (
        <div className="mx-4 rounded-[10px] bg-muted/50 px-4 py-3 space-y-1.5">
          <p className="text-ios-caption1 uppercase tracking-wide text-muted-foreground">
            {t('live.upcoming_changes')}
          </p>
          {transitions.map((transition) => {
            const isIn = transition.kind === 'in';
            const isOut = transition.kind === 'out';
            const isPosition = transition.kind === 'position';
            const isRole = transition.kind === 'role';
            return (
              <div key={transition.playerId} className="flex items-start gap-2">
                {isIn ? (
                  <ArrowUpIcon className="size-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                ) : isOut ? (
                  <ArrowDownIcon className="size-3.5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                ) : (
                  <ArrowRightLeftIcon className="size-3.5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                )}
                <p
                  className={cn(
                    'text-ios-footnote font-medium',
                    isIn && 'text-green-600 dark:text-green-400',
                    isOut && 'text-orange-600 dark:text-orange-400',
                    isPosition && 'text-blue-600 dark:text-blue-400',
                    isRole && 'text-indigo-600 dark:text-indigo-400',
                  )}
                >
                  {transition.playerName}:{' '}
                  <span className="uppercase tracking-wide">{transitionTag(transition.kind)}</span>{' '}
                  {transition.fromLabel} -&gt; {transition.toLabel}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Next rotation */}
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
        <div className="mx-4 rounded-[10px] bg-card px-4 py-6 text-center">
          <p className="text-ios-footnote text-muted-foreground">{t('live.last_rotation')}</p>
        </div>
      )}
    </div>
  );
}

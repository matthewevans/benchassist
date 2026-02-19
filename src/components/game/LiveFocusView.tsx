import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
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
  isComingIn?: boolean;
  isGoingOut?: boolean;
  isLast: boolean;
}

function PlayerRow({
  player,
  assignment,
  fieldPos,
  usePositions,
  isComingIn,
  isGoingOut,
  isLast,
}: PlayerRowProps) {
  const display = getAssignmentDisplay(assignment, fieldPos, usePositions);
  const isBench = assignment === RotationAssignment.Bench;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 min-h-[44px]',
        !isLast && 'border-b border-border/30',
        isComingIn && 'bg-green-500/10 dark:bg-green-500/8',
        isGoingOut && 'bg-orange-500/10 dark:bg-orange-500/8',
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
        )}
      >
        {player.name}
      </span>
      {isComingIn && (
        <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">
          <ArrowUpIcon className="size-3.5" />
          IN
        </span>
      )}
      {isGoingOut && (
        <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 shrink-0">
          <ArrowDownIcon className="size-3.5" />
          OUT
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
  changingPlayerIds: Set<PlayerId>;
  usePositions: boolean;
}

function RotationSection({
  rotation,
  label,
  sublabel,
  isCurrent,
  playerMap,
  changingPlayerIds,
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
          const isChanging = changingPlayerIds.has(player.id as PlayerId);
          const isComingIn = isChanging && assignment !== RotationAssignment.Bench;
          const isGoingOut = isChanging && assignment === RotationAssignment.Bench;

          return (
            <PlayerRow
              key={player.id}
              player={player}
              assignment={assignment}
              fieldPos={fieldPos}
              usePositions={usePositions}
              isComingIn={isComingIn}
              isGoingOut={isGoingOut}
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
  changingPlayerIds: Set<PlayerId>;
  usePositions: boolean;
}

export function LiveFocusView({
  currentRotation,
  nextRotation,
  playerMap,
  changingPlayerIds,
  usePositions,
}: Props) {
  // Compute substitution summary for the transition
  const comingIn: string[] = [];
  const goingOut: string[] = [];
  if (nextRotation) {
    for (const playerId of changingPlayerIds) {
      const nextAssign = nextRotation.assignments[playerId];
      const player = playerMap.get(playerId);
      if (!player) continue;
      if (nextAssign === RotationAssignment.Bench) {
        goingOut.push(player.name);
      } else {
        comingIn.push(player.name);
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Current rotation */}
      <RotationSection
        rotation={currentRotation}
        label="Now"
        sublabel={`Rotation ${currentRotation.index + 1}`}
        isCurrent={true}
        playerMap={playerMap}
        changingPlayerIds={new Set()}
        usePositions={usePositions}
      />

      {/* Substitution changes banner */}
      {nextRotation && (comingIn.length > 0 || goingOut.length > 0) && (
        <div className="mx-4 rounded-[10px] bg-muted/50 px-4 py-3 space-y-1.5">
          <p className="text-ios-caption1 uppercase tracking-wide text-muted-foreground">
            Substitutions
          </p>
          {comingIn.length > 0 && (
            <div className="flex items-start gap-2">
              <ArrowUpIcon className="size-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
              <p className="text-ios-footnote text-green-600 dark:text-green-400 font-medium">
                {comingIn.join(', ')}
              </p>
            </div>
          )}
          {goingOut.length > 0 && (
            <div className="flex items-start gap-2">
              <ArrowDownIcon className="size-3.5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
              <p className="text-ios-footnote text-orange-600 dark:text-orange-400 font-medium">
                {goingOut.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Next rotation */}
      {nextRotation ? (
        <RotationSection
          rotation={nextRotation}
          label="Next"
          sublabel={`Rotation ${nextRotation.index + 1}`}
          isCurrent={false}
          playerMap={playerMap}
          changingPlayerIds={changingPlayerIds}
          usePositions={usePositions}
        />
      ) : (
        <div className="mx-4 rounded-[10px] bg-card px-4 py-6 text-center">
          <p className="text-ios-footnote text-muted-foreground">Last rotation</p>
        </div>
      )}
    </div>
  );
}

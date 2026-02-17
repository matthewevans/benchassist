import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
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

interface Props {
  currentRotation: Rotation;
  nextRotation: Rotation | undefined;
  playerMap: Map<PlayerId, Player>;
  changingPlayerIds: Set<PlayerId>;
  usePositions: boolean;
}

interface RotationCardProps {
  rotation: Rotation;
  label: string;
  isCurrent: boolean;
  playerMap: Map<PlayerId, Player>;
  changingPlayerIds: Set<PlayerId>;
  usePositions: boolean;
}

function RotationCard({
  rotation,
  label,
  isCurrent,
  playerMap,
  changingPlayerIds,
  usePositions,
}: RotationCardProps) {
  const fieldPlayers: Player[] = [];
  const benchPlayers: Player[] = [];

  for (const [playerId, assignment] of Object.entries(rotation.assignments)) {
    const player = playerMap.get(playerId as PlayerId);
    if (!player) continue;
    if (assignment === RotationAssignment.Bench) {
      benchPlayers.push(player);
    } else {
      fieldPlayers.push(player);
    }
  }

  // Sort field players by pitch position: FWD → MID → DEF → GK, then by skill within group
  fieldPlayers.sort((a, b) => {
    const aAssign = rotation.assignments[a.id as PlayerId];
    const bAssign = rotation.assignments[b.id as PlayerId];
    const aPos = rotation.fieldPositions?.[a.id as PlayerId];
    const bPos = rotation.fieldPositions?.[b.id as PlayerId];
    const [ag, aw, as_] = positionSortKey(aAssign, aPos, a.skillRanking);
    const [bg, bw, bs] = positionSortKey(bAssign, bPos, b.skillRanking);
    return ag - bg || aw - bw || as_ - bs;
  });
  benchPlayers.sort((a, b) => b.skillRanking - a.skillRanking);

  return (
    <Card className={cn('flex-1', isCurrent && 'border-primary/60 shadow-sm')}>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle
          className={cn(
            'text-sm font-semibold flex items-center gap-1.5',
            isCurrent ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {label}
          <span className="font-normal text-xs">· R{rotation.index + 1}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-0.5">
        {fieldPlayers.map((player) => {
          const assignment = rotation.assignments[player.id as PlayerId];
          const fieldPos = rotation.fieldPositions?.[player.id as PlayerId];
          const display = getAssignmentDisplay(assignment, fieldPos, usePositions);
          const isChanging = changingPlayerIds.has(player.id as PlayerId);
          // Coming IN: on field and changing (was on bench in previous rotation)
          const isComingIn = isChanging && assignment !== RotationAssignment.Bench;

          return (
            <div key={player.id} className="flex items-center gap-2 py-0.5 text-sm">
              <span
                className={cn(
                  'shrink-0 w-8 text-center text-xs rounded px-1 py-0.5 font-medium',
                  display.className,
                )}
              >
                {display.label}
              </span>
              <span
                className={cn('flex-1 font-medium', isComingIn && 'text-primary font-semibold')}
              >
                {player.name}
              </span>
              {isComingIn && <ArrowUpIcon className="shrink-0 size-3.5 text-primary" />}
            </div>
          );
        })}

        {benchPlayers.length > 0 && (
          <div className="pt-2 mt-1 border-t space-y-0.5">
            <p className="text-xs text-muted-foreground font-medium pb-0.5">Bench</p>
            {benchPlayers.map((player) => {
              const assignment = rotation.assignments[player.id as PlayerId];
              const isChanging = changingPlayerIds.has(player.id as PlayerId);
              // Going OUT: on bench and changing (was on field in previous rotation)
              const isGoingOut = isChanging && assignment === RotationAssignment.Bench;

              return (
                <div
                  key={player.id}
                  className={cn(
                    'flex items-center gap-2 py-0.5 text-sm',
                    isGoingOut ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <span className="shrink-0 w-8 text-center text-xs rounded px-1 py-0.5 bg-muted font-medium">
                    B
                  </span>
                  <span className={cn('flex-1', isGoingOut && 'font-medium')}>{player.name}</span>
                  {isGoingOut && (
                    <ArrowDownIcon className="shrink-0 size-3.5 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LiveFocusView({
  currentRotation,
  nextRotation,
  playerMap,
  changingPlayerIds,
  usePositions,
}: Props) {
  return (
    <div className="flex gap-3">
      <RotationCard
        rotation={currentRotation}
        label="Now"
        isCurrent={true}
        playerMap={playerMap}
        changingPlayerIds={new Set()}
        usePositions={usePositions}
      />
      {nextRotation ? (
        <RotationCard
          rotation={nextRotation}
          label="Next"
          isCurrent={false}
          playerMap={playerMap}
          changingPlayerIds={changingPlayerIds}
          usePositions={usePositions}
        />
      ) : (
        <Card className="flex-1 flex items-center justify-center text-muted-foreground text-sm border-dashed">
          <CardContent className="py-6 text-center">Last rotation</CardContent>
        </Card>
      )}
    </div>
  );
}

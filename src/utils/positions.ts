import { RotationAssignment } from '@/types/domain.ts';
import { POSITION_VALUES, PositionCode } from '@/types/domain.ts';
import type {
  FormationSlot,
  Position,
  FieldPosition,
  SubPosition,
  Player,
  PlayerId,
} from '@/types/domain.ts';

/** Which broad position each sub-position belongs to */
const SUB_POSITION_GROUP: Record<SubPosition, Position> = {
  LB: PositionCode.DEF,
  CB: PositionCode.DEF,
  RB: PositionCode.DEF,
  LCB: PositionCode.DEF,
  RCB: PositionCode.DEF,
  LM: PositionCode.MID,
  CM: PositionCode.MID,
  RM: PositionCode.MID,
  LCM: PositionCode.MID,
  RCM: PositionCode.MID,
  LW: PositionCode.FWD,
  RW: PositionCode.FWD,
  ST: PositionCode.FWD,
  CF: PositionCode.FWD,
};

const SUB_POSITION_REPEAT_WEIGHT = 2;
const NO_PREFERENCE_GROUP_REPEAT_WEIGHT = 1;

function getPreferredGroups(player: Player | undefined): Set<Position> {
  const preferred = new Set<Position>();
  if (!player) return preferred;

  if (player.primaryPosition && player.primaryPosition !== PositionCode.GK) {
    preferred.add(player.primaryPosition);
  }
  for (const secondary of player.secondaryPositions) {
    if (secondary !== PositionCode.GK) preferred.add(secondary);
  }

  return preferred;
}

function getGroupCounts(history: Map<SubPosition, number> | undefined): Record<Position, number> {
  const counts = Object.fromEntries(POSITION_VALUES.map((position) => [position, 0])) as Record<
    Position,
    number
  >;
  if (!history) return counts;

  for (const [subPos, timesPlayed] of history.entries()) {
    counts[SUB_POSITION_GROUP[subPos]] += timesPlayed;
  }

  return counts;
}

/**
 * Derive sub-position labels from a single position line and count.
 * e.g. ('DEF', 2) → ['LB', 'RB'], ('MID', 3) → ['LM', 'CM', 'RM']
 */
function getSubPositionsForCount(position: Position, count: number): SubPosition[] {
  if (position === PositionCode.GK || count <= 0) return [];

  const mappings: Record<FieldPosition, Record<number, SubPosition[]>> = {
    [PositionCode.DEF]: {
      1: ['CB'],
      2: ['LB', 'RB'],
      3: ['LB', 'CB', 'RB'],
      4: ['LB', 'LCB', 'RCB', 'RB'],
      5: ['LB', 'LCB', 'CB', 'RCB', 'RB'],
    },
    [PositionCode.MID]: {
      1: ['CM'],
      2: ['LM', 'RM'],
      3: ['LM', 'CM', 'RM'],
      4: ['LM', 'LCM', 'RCM', 'RM'],
      5: ['LM', 'LCM', 'CM', 'RCM', 'RM'],
    },
    [PositionCode.FWD]: {
      1: ['ST'],
      2: ['LW', 'RW'],
      3: ['LW', 'ST', 'RW'],
      4: ['LW', 'CF', 'ST', 'RW'],
    },
  };

  const fieldPosition = position as FieldPosition;
  return (
    mappings[fieldPosition]?.[count] ??
    (Array(count).fill(
      fieldPosition === PositionCode.DEF ? 'CB' : fieldPosition === PositionCode.MID ? 'CM' : 'ST',
    ) as SubPosition[])
  );
}

/**
 * Derive all sub-position slots from a formation definition.
 * e.g. [{ DEF: 2 }, { MID: 3 }, { FWD: 1 }] → ['LB', 'RB', 'LM', 'CM', 'RM', 'ST']
 */
export function deriveSubPositions(formation: FormationSlot[]): SubPosition[] {
  return formation.flatMap((slot) => getSubPositionsForCount(slot.position, slot.count));
}

/**
 * Auto-assign field players to sub-position slots.
 * Finds the minimum-cost assignment where cost is:
 * - repeated sub-position usage (always),
 * - repeated position-group usage when the player has no preferences,
 * - mismatch against declared preferred groups.
 * The first rotation (empty history) naturally respects preferences; later
 * rotations prioritize diversity.
 *
 * Uses exhaustive search with pruning, matching the pattern used by
 * generateBenchPatterns. Costs are pre-computed and slots are tried in
 * cheapest-first order so optimal solutions are found early.
 */
export function autoAssignPositions(
  fieldPlayerIds: PlayerId[],
  formation: FormationSlot[],
  playerMap: Map<PlayerId, Player>,
  positionHistory?: Map<PlayerId, Map<SubPosition, number>>,
): Record<PlayerId, SubPosition> {
  const slots = deriveSubPositions(formation);
  const count = Math.min(fieldPlayerIds.length, slots.length);
  if (count === 0) return {};

  // Pre-compute cost matrix and per-player slot order (cheapest first)
  const costs: number[][] = [];
  const slotOrder: number[][] = [];
  let lowerBound = 0;

  for (let p = 0; p < count; p++) {
    const id = fieldPlayerIds[p];
    const player = playerMap.get(id);
    const playerHist = positionHistory?.get(id);
    const preferredGroups = getPreferredGroups(player);
    const hasPreferences = preferredGroups.size > 0;
    const groupCounts = getGroupCounts(playerHist);

    const playerCosts = slots.map((subPos) => {
      const group = SUB_POSITION_GROUP[subPos];
      const timesPlayedSubPosition = playerHist?.get(subPos) ?? 0;
      const timesPlayedGroup = groupCounts[group];
      const groupRepeatPenalty = hasPreferences
        ? 0
        : timesPlayedGroup * NO_PREFERENCE_GROUP_REPEAT_WEIGHT;
      const preferencePenalty = hasPreferences && !preferredGroups.has(group) ? 1 : 0;

      return (
        timesPlayedSubPosition * SUB_POSITION_REPEAT_WEIGHT + groupRepeatPenalty + preferencePenalty
      );
    });

    costs.push(playerCosts);
    slotOrder.push(
      Array.from({ length: slots.length }, (_, s) => s).sort(
        (a, b) => playerCosts[a] - playerCosts[b],
      ),
    );
    lowerBound += Math.min(...playerCosts);
  }

  let best: Record<PlayerId, SubPosition> = {};
  let bestCost = Infinity;
  const picked = new Array<number>(count);

  function search(depth: number, usedSlots: Set<number>, cost: number) {
    if (cost >= bestCost) return;
    if (depth === count) {
      bestCost = cost;
      best = {};
      for (let i = 0; i < count; i++) best[fieldPlayerIds[i]] = slots[picked[i]];
      return;
    }
    for (const s of slotOrder[depth]) {
      if (usedSlots.has(s)) continue;
      picked[depth] = s;
      usedSlots.add(s);
      search(depth + 1, usedSlots, cost + costs[depth][s]);
      usedSlots.delete(s);
      if (bestCost <= lowerBound) return;
    }
  }

  search(0, new Set(), 0);
  return best;
}

/** Badge display info for a rotation cell */
export interface AssignmentDisplay {
  label: string;
  className: string;
}

const FIELD_CLASS = 'text-green-600 dark:text-green-400';
const BENCH_CLASS = 'text-muted-foreground/60';
const GOALIE_CLASS = 'text-blue-600 dark:text-blue-400 font-semibold';
const DEF_CLASS = 'text-purple-600 dark:text-purple-400';
const MID_CLASS = 'text-green-600 dark:text-green-400';
const FWD_CLASS = 'text-orange-600 dark:text-orange-400';

/**
 * Get display label and CSS class for a player's assignment in a rotation.
 * When usePositions is true and a fieldPosition exists, shows the sub-position
 * with color-coding by position group (DEF=purple, MID=green, FWD=orange).
 */
export function getAssignmentDisplay(
  assignment: RotationAssignment,
  fieldPosition: SubPosition | undefined,
  usePositions: boolean,
): AssignmentDisplay {
  if (assignment === RotationAssignment.Bench) return { label: '○', className: BENCH_CLASS };
  if (assignment === RotationAssignment.Goalie) {
    return { label: PositionCode.GK, className: GOALIE_CLASS };
  }

  // Field assignment
  if (usePositions && fieldPosition) {
    const group = SUB_POSITION_GROUP[fieldPosition];
    const className =
      group === PositionCode.DEF ? DEF_CLASS : group === PositionCode.FWD ? FWD_CLASS : MID_CLASS;
    return { label: fieldPosition, className };
  }

  return { label: '●', className: FIELD_CLASS };
}

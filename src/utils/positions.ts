import { RotationAssignment } from '@/types/domain.ts';
import type { FormationSlot, Position, SubPosition, Player, PlayerId } from '@/types/domain.ts';

/** Which broad position each sub-position belongs to */
const SUB_POSITION_GROUP: Record<SubPosition, Position> = {
  LB: 'DEF', CB: 'DEF', RB: 'DEF', LCB: 'DEF', RCB: 'DEF',
  LM: 'MID', CM: 'MID', RM: 'MID', LCM: 'MID', RCM: 'MID',
  LW: 'FWD', RW: 'FWD', ST: 'FWD', CF: 'FWD',
};

/**
 * Derive sub-position labels from a single position line and count.
 * e.g. ('DEF', 2) → ['LB', 'RB'], ('MID', 3) → ['LM', 'CM', 'RM']
 */
function getSubPositionsForCount(position: Position, count: number): SubPosition[] {
  if (position === 'GK' || count <= 0) return [];

  const mappings: Record<Exclude<Position, 'GK'>, Record<number, SubPosition[]>> = {
    DEF: {
      1: ['CB'],
      2: ['LB', 'RB'],
      3: ['LB', 'CB', 'RB'],
      4: ['LB', 'LCB', 'RCB', 'RB'],
      5: ['LB', 'LCB', 'CB', 'RCB', 'RB'],
    },
    MID: {
      1: ['CM'],
      2: ['LM', 'RM'],
      3: ['LM', 'CM', 'RM'],
      4: ['LM', 'LCM', 'RCM', 'RM'],
      5: ['LM', 'LCM', 'CM', 'RCM', 'RM'],
    },
    FWD: {
      1: ['ST'],
      2: ['LW', 'RW'],
      3: ['LW', 'ST', 'RW'],
      4: ['LW', 'CF', 'ST', 'RW'],
    },
  };

  return mappings[position]?.[count] ?? Array(count).fill(position === 'DEF' ? 'CB' : position === 'MID' ? 'CM' : 'ST') as SubPosition[];
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
 * Finds the minimum-cost assignment where cost = times a player has already
 * played that sub-position (from positionHistory), with primary position match
 * as a tiebreaker. The first rotation (empty history) naturally respects
 * player preferences; subsequent rotations prioritize diversity.
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

    const playerCosts = slots.map((subPos) => {
      const timesPlayed = playerHist?.get(subPos) ?? 0;
      const matchesPrimary = !!player?.primaryPosition
        && player.primaryPosition !== 'GK'
        && SUB_POSITION_GROUP[subPos] === player.primaryPosition;
      return timesPlayed * 2 + (matchesPrimary ? 0 : 1);
    });

    costs.push(playerCosts);
    slotOrder.push(
      Array.from({ length: slots.length }, (_, s) => s)
        .sort((a, b) => playerCosts[a] - playerCosts[b]),
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

const FIELD_CLASS = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
const BENCH_CLASS = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
const GOALIE_CLASS = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
const DEF_CLASS = 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
const MID_CLASS = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
const FWD_CLASS = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';

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
  if (assignment === RotationAssignment.Bench) return { label: 'Bench', className: BENCH_CLASS };
  if (assignment === RotationAssignment.Goalie) return { label: 'GK', className: GOALIE_CLASS };

  // Field assignment
  if (usePositions && fieldPosition) {
    const group = SUB_POSITION_GROUP[fieldPosition];
    const className = group === 'DEF' ? DEF_CLASS : group === 'FWD' ? FWD_CLASS : MID_CLASS;
    return { label: fieldPosition, className };
  }

  return { label: 'Field', className: FIELD_CLASS };
}

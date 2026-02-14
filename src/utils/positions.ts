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
 * Auto-assign field players to sub-position slots based on their primaryPosition.
 * Pass 1: match players to slots in their preferred position group.
 * Pass 2: assign remaining players to remaining slots.
 */
export function autoAssignPositions(
  fieldPlayerIds: PlayerId[],
  formation: FormationSlot[],
  playerMap: Map<PlayerId, Player>,
): Record<PlayerId, SubPosition> {
  const availableSlots = deriveSubPositions(formation);
  const result: Record<PlayerId, SubPosition> = {};
  const assignedPlayers = new Set<PlayerId>();
  const usedSlots = new Set<number>(); // indices into availableSlots

  // Pass 1: match primaryPosition to compatible slots
  for (const playerId of fieldPlayerIds) {
    const player = playerMap.get(playerId);
    if (!player?.primaryPosition || player.primaryPosition === 'GK') continue;

    for (let i = 0; i < availableSlots.length; i++) {
      if (usedSlots.has(i)) continue;
      if (SUB_POSITION_GROUP[availableSlots[i]] === player.primaryPosition) {
        result[playerId] = availableSlots[i];
        assignedPlayers.add(playerId);
        usedSlots.add(i);
        break;
      }
    }
  }

  // Pass 2: fill remaining slots with unassigned players
  const remainingPlayers = fieldPlayerIds.filter((id) => !assignedPlayers.has(id));
  const remainingSlotIndices = availableSlots
    .map((_, i) => i)
    .filter((i) => !usedSlots.has(i));

  for (let i = 0; i < Math.min(remainingPlayers.length, remainingSlotIndices.length); i++) {
    result[remainingPlayers[i]] = availableSlots[remainingSlotIndices[i]];
  }

  return result;
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

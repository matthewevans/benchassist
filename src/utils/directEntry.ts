import { RotationAssignment } from '@/types/domain.ts';
import type {
  GameConfig,
  ManualOverride,
  OverrideLockMode,
  Player,
  PlayerId,
  SubPosition,
} from '@/types/domain.ts';
import { deriveSubPositions } from '@/utils/positions.ts';

export interface DirectEntrySlot {
  id: string;
  label: string;
  assignment: RotationAssignment;
  fieldPosition?: SubPosition;
}

export interface DirectEntryCell {
  playerId: PlayerId | null;
  lockMode: OverrideLockMode;
}

export type DirectEntryDraft = Record<string, DirectEntryCell>;

export interface CompileDirectEntryResult {
  overrides: ManualOverride[];
  errors: string[];
}

export function makeDirectEntryCellKey(rotationIndex: number, slotId: string): string {
  return `${rotationIndex}:${slotId}`;
}

export function buildDirectEntrySlots(config: GameConfig): DirectEntrySlot[] {
  const slots: DirectEntrySlot[] = [];
  if (config.useGoalie) {
    slots.push({
      id: 'goalie:0',
      label: 'GK',
      assignment: RotationAssignment.Goalie,
    });
  }

  if (config.usePositions && config.formation.length > 0) {
    const subPositions = deriveSubPositions(config.formation);
    subPositions.forEach((subPosition, idx) => {
      slots.push({
        id: `field:${subPosition}:${idx}`,
        label: subPosition,
        assignment: RotationAssignment.Field,
        fieldPosition: subPosition,
      });
    });
  } else {
    const fieldPlayerSlots = Math.max(0, config.fieldSize - (config.useGoalie ? 1 : 0));
    for (let i = 0; i < fieldPlayerSlots; i++) {
      slots.push({
        id: `field:${i}`,
        label: `Field ${i + 1}`,
        assignment: RotationAssignment.Field,
      });
    }
  }

  return slots;
}

export function compileDirectEntryOverrides(params: {
  slots: DirectEntrySlot[];
  totalRotations: number;
  draft: DirectEntryDraft;
  players: Player[];
}): CompileDirectEntryResult {
  const { slots, totalRotations, draft, players } = params;
  const overrides: ManualOverride[] = [];
  const errors: string[] = [];

  const playerNameById = new Map(players.map((player) => [player.id, player.name]));

  for (let rotationIndex = 0; rotationIndex < totalRotations; rotationIndex++) {
    const seenPlayers = new Set<PlayerId>();

    for (const slot of slots) {
      const key = makeDirectEntryCellKey(rotationIndex, slot.id);
      const cell = draft[key];
      if (!cell?.playerId) continue;

      if (seenPlayers.has(cell.playerId)) {
        const name = playerNameById.get(cell.playerId) ?? 'Player';
        errors.push(`R${rotationIndex + 1}: ${name} is assigned more than once.`);
        continue;
      }
      seenPlayers.add(cell.playerId);

      overrides.push({
        playerId: cell.playerId,
        rotationIndex,
        assignment: slot.assignment,
        lockMode: cell.lockMode,
        ...(slot.fieldPosition ? { fieldPosition: slot.fieldPosition } : {}),
      });
    }
  }

  return { overrides, errors };
}

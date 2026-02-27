import { RotationAssignment } from '@/types/domain.ts';
import type { PlayerId, Rotation, SubPosition } from '@/types/domain.ts';

export type RotationTransitionKind = 'in' | 'out' | 'position' | 'role';

export interface RotationTransition {
  playerId: PlayerId;
  kind: RotationTransitionKind;
  fromAssignment: RotationAssignment | undefined;
  toAssignment: RotationAssignment | undefined;
  fromPos: SubPosition | undefined;
  toPos: SubPosition | undefined;
}

export function getRotationTransitions(
  currentRotation: Rotation,
  nextRotation: Rotation | undefined,
): RotationTransition[] {
  if (!nextRotation) return [];

  const transitions: RotationTransition[] = [];
  const playerIds = new Set<PlayerId>([
    ...(Object.keys(currentRotation.assignments) as PlayerId[]),
    ...(Object.keys(nextRotation.assignments) as PlayerId[]),
  ]);

  for (const playerId of playerIds) {
    const fromAssignment = currentRotation.assignments[playerId];
    const toAssignment = nextRotation.assignments[playerId];
    const fromPos = currentRotation.fieldPositions?.[playerId];
    const toPos = nextRotation.fieldPositions?.[playerId];

    const assignmentChanged = fromAssignment !== toAssignment;
    const positionChanged = fromPos !== toPos;
    if (!assignmentChanged && !positionChanged) continue;

    let kind: RotationTransitionKind;
    if (fromAssignment === RotationAssignment.Bench && toAssignment !== RotationAssignment.Bench) {
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
      kind,
      fromAssignment,
      toAssignment,
      fromPos,
      toPos,
    });
  }

  return transitions;
}

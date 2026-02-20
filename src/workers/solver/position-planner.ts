import { RotationAssignment, PositionCode } from '@/types/domain.ts';
import type { Player, PlayerId, Rotation, SubPosition, Position } from '@/types/domain.ts';

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

const SCORE_WEIGHTS = {
  preferredGroupMismatch: 8,
  noPreferenceGroupRepeat: 2,
  consecutiveSameGroup: 3,
  repeatedSubPosition: 1,
} as const;

type PositionPlan = Array<Record<PlayerId, SubPosition> | undefined>;

interface ScoreEntry {
  group: Position;
  subPos: SubPosition;
}

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

function scorePlan(
  rotations: Rotation[],
  plan: PositionPlan,
  playerMap: Map<PlayerId, Player>,
): number {
  const timeline = new Map<PlayerId, ScoreEntry[]>();

  for (let r = 0; r < rotations.length; r++) {
    const positions = plan[r];
    if (!positions) continue;

    const assignments = rotations[r].assignments;
    for (const [playerId, assignment] of Object.entries(assignments) as Array<
      [PlayerId, RotationAssignment]
    >) {
      if (assignment !== RotationAssignment.Field) continue;
      const subPos = positions[playerId];
      if (!subPos) continue;
      if (!timeline.has(playerId)) timeline.set(playerId, []);
      timeline.get(playerId)!.push({ group: SUB_POSITION_GROUP[subPos], subPos });
    }
  }

  let score = 0;

  for (const [playerId, entries] of timeline.entries()) {
    const preferredGroups = getPreferredGroups(playerMap.get(playerId));
    const hasPreferences = preferredGroups.size > 0;
    const groupCounts = new Map<Position, number>();
    const subPositionCounts = new Map<SubPosition, number>();

    let prevGroup: Position | null = null;
    for (const { group, subPos } of entries) {
      if (hasPreferences && !preferredGroups.has(group)) {
        score += SCORE_WEIGHTS.preferredGroupMismatch;
      }
      if (prevGroup === group) {
        score += SCORE_WEIGHTS.consecutiveSameGroup;
      }
      groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
      subPositionCounts.set(subPos, (subPositionCounts.get(subPos) ?? 0) + 1);
      prevGroup = group;
    }

    if (!hasPreferences) {
      for (const count of groupCounts.values()) {
        score += count * (count - 1) * SCORE_WEIGHTS.noPreferenceGroupRepeat;
      }
    }

    for (const count of subPositionCounts.values()) {
      score += count * (count - 1) * SCORE_WEIGHTS.repeatedSubPosition;
    }
  }

  return score;
}

function clonePlan(rotations: Rotation[]): PositionPlan {
  return rotations.map((rotation) =>
    rotation.fieldPositions ? { ...rotation.fieldPositions } : undefined,
  );
}

interface OptimizeOptions {
  timeoutMs?: number;
}

/**
 * Improves field-position diversity across the full schedule while preserving:
 * - exact field slots used per rotation
 * - one position per field player per rotation
 * - strong preference matching when provided
 *
 * Starts from seeded per-rotation assignments and applies improving swaps
 * between field players within each rotation until timeout.
 */
export function optimizePositionAssignments(
  rotations: Rotation[],
  playerMap: Map<PlayerId, Player>,
  options?: OptimizeOptions,
): void {
  if (rotations.length === 0) return;

  const timeoutMs = options?.timeoutMs ?? 20;
  const deadline = Date.now() + timeoutMs;
  const plan = clonePlan(rotations);

  let bestScore = scorePlan(rotations, plan, playerMap);
  let improved = true;

  while (improved && Date.now() < deadline) {
    improved = false;

    for (let r = 0; r < plan.length; r++) {
      const positions = plan[r];
      if (!positions) continue;

      const playerIds = Object.keys(positions) as PlayerId[];
      if (playerIds.length < 2) continue;

      for (let i = 0; i < playerIds.length - 1; i++) {
        if (Date.now() >= deadline) break;
        for (let j = i + 1; j < playerIds.length; j++) {
          if (Date.now() >= deadline) break;

          const a = playerIds[i];
          const b = playerIds[j];
          const posA = positions[a];
          const posB = positions[b];
          if (!posA || !posB || posA === posB) continue;

          positions[a] = posB;
          positions[b] = posA;

          const nextScore = scorePlan(rotations, plan, playerMap);
          if (nextScore < bestScore) {
            bestScore = nextScore;
            improved = true;
            break;
          }

          positions[a] = posA;
          positions[b] = posB;
        }
        if (improved) break;
      }
      if (improved) break;
    }
  }

  for (let r = 0; r < rotations.length; r++) {
    if (plan[r]) {
      rotations[r].fieldPositions = plan[r];
    }
  }
}

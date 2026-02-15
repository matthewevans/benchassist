import { RotationAssignment } from '@/types/domain.ts';
import type { RotationSchedule, PlayerStats, Rotation, Player, PlayerId } from '@/types/domain.ts';

export function calculatePlayerStats(
  rotations: Rotation[],
  players: Player[],
): Record<PlayerId, PlayerStats> {
  const stats: Record<PlayerId, PlayerStats> = {};

  for (const player of players) {
    let played = 0;
    let benched = 0;
    let goalie = 0;
    let currentBenchStreak = 0;
    let maxBenchStreak = 0;

    for (const rotation of rotations) {
      const assignment = rotation.assignments[player.id];
      if (!assignment) continue;

      if (assignment === RotationAssignment.Bench) {
        benched++;
        currentBenchStreak++;
        maxBenchStreak = Math.max(maxBenchStreak, currentBenchStreak);
      } else {
        currentBenchStreak = 0;
        if (assignment === RotationAssignment.Goalie) {
          goalie++;
          played++;
        } else {
          played++;
        }
      }
    }

    const totalRotations = rotations.length;
    stats[player.id] = {
      playerId: player.id,
      playerName: player.name,
      rotationsPlayed: played,
      rotationsBenched: benched,
      rotationsGoalie: goalie,
      totalRotations,
      playPercentage: totalRotations > 0 ? Math.round((played / totalRotations) * 100) : 0,
      maxConsecutiveBench: maxBenchStreak,
    };
  }

  return stats;
}

export function computeStrengthStats(strengths: number[]) {
  if (strengths.length === 0) return { avg: 0, variance: 0, min: 0, max: 0 };
  const avg = strengths.reduce((s, v) => s + v, 0) / strengths.length;
  const variance = strengths.reduce((s, v) => s + (v - avg) ** 2, 0) / strengths.length;
  return { avg, variance, min: Math.min(...strengths), max: Math.max(...strengths) };
}

export function calculateRotationStrength(rotation: Rotation, players: Player[]): number {
  const playerMap = new Map(players.map((p) => [p.id, p]));
  let strength = 0;

  for (const [playerId, assignment] of Object.entries(rotation.assignments)) {
    if (assignment === RotationAssignment.Field || assignment === RotationAssignment.Goalie) {
      const player = playerMap.get(playerId);
      if (player) {
        strength += player.skillRanking;
      }
    }
  }

  return strength;
}

function swapRotation(r: Rotation, playerAId: PlayerId, playerBId: PlayerId): Rotation {
  const newAssignments = { ...r.assignments };
  const temp = newAssignments[playerAId];
  newAssignments[playerAId] = newAssignments[playerBId];
  newAssignments[playerBId] = temp;

  // Also swap field positions (handles field↔field and field↔bench)
  let newFieldPositions = r.fieldPositions;
  if (newFieldPositions) {
    newFieldPositions = { ...newFieldPositions };
    const posA = newFieldPositions[playerAId];
    const posB = newFieldPositions[playerBId];
    if (posA && posB) {
      newFieldPositions[playerAId] = posB;
      newFieldPositions[playerBId] = posA;
    } else if (posA) {
      newFieldPositions[playerBId] = posA;
      delete newFieldPositions[playerAId];
    } else if (posB) {
      newFieldPositions[playerAId] = posB;
      delete newFieldPositions[playerBId];
    }
  }

  return { ...r, assignments: newAssignments, fieldPositions: newFieldPositions };
}

function rebuildSchedule(
  schedule: RotationSchedule,
  newRotations: Rotation[],
  players: Player[],
): RotationSchedule {
  const recalculated = newRotations.map((r) => ({
    ...r,
    teamStrength: calculateRotationStrength(r, players),
  }));

  const newStats = calculatePlayerStats(recalculated, players);
  const strengths = recalculated.map((r) => r.teamStrength);
  const { avg, variance, min, max } = computeStrengthStats(strengths);

  return {
    rotations: recalculated,
    playerStats: newStats,
    overallStats: {
      ...schedule.overallStats,
      strengthVariance: variance,
      minStrength: min,
      maxStrength: max,
      avgStrength: Math.round(avg * 10) / 10,
      violations: [],
    },
    generatedAt: schedule.generatedAt,
  };
}

export function previewSwap(
  schedule: RotationSchedule,
  rotationIndex: number,
  playerAId: PlayerId,
  playerBId: PlayerId,
  players: Player[],
): RotationSchedule {
  const newRotations = schedule.rotations.map((r, i) =>
    i === rotationIndex ? swapRotation(r, playerAId, playerBId) : r,
  );
  return rebuildSchedule(schedule, newRotations, players);
}

export function previewSwapRange(
  schedule: RotationSchedule,
  fromRotationIndex: number,
  playerAId: PlayerId,
  playerBId: PlayerId,
  players: Player[],
): RotationSchedule {
  const newRotations = schedule.rotations.map((r, i) =>
    i >= fromRotationIndex ? swapRotation(r, playerAId, playerBId) : r,
  );
  return rebuildSchedule(schedule, newRotations, players);
}

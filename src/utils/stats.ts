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

export function calculateRotationStrength(
  rotation: Rotation,
  players: Player[],
): number {
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

export function previewSwap(
  schedule: RotationSchedule,
  rotationIndex: number,
  playerAId: PlayerId,
  playerBId: PlayerId,
  players: Player[],
): RotationSchedule {
  const newRotations = schedule.rotations.map((r, i) => {
    if (i !== rotationIndex) return r;
    const newAssignments = { ...r.assignments };
    const temp = newAssignments[playerAId];
    newAssignments[playerAId] = newAssignments[playerBId];
    newAssignments[playerBId] = temp;
    return { ...r, assignments: newAssignments };
  });

  const recalculated = newRotations.map((r) => ({
    ...r,
    teamStrength: calculateRotationStrength(r, players),
  }));

  const newStats = calculatePlayerStats(recalculated, players);
  const strengths = recalculated.map((r) => r.teamStrength);
  const avg = strengths.reduce((sum, s) => sum + s, 0) / strengths.length;
  const variance =
    strengths.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / strengths.length;

  return {
    rotations: recalculated,
    playerStats: newStats,
    overallStats: {
      ...schedule.overallStats,
      strengthVariance: variance,
      minStrength: Math.min(...strengths),
      maxStrength: Math.max(...strengths),
      avgStrength: avg,
      violations: [],
    },
    generatedAt: schedule.generatedAt,
  };
}

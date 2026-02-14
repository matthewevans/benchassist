import { RotationAssignment } from '@/types/domain.ts';
import type { RotationSchedule, GameConfig, Player, PlayerId } from '@/types/domain.ts';

export function validateSchedule(
  schedule: RotationSchedule,
  config: GameConfig,
  players: Player[],
): string[] {
  const violations: string[] = [];
  const fieldSize = config.fieldSize;

  for (const rotation of schedule.rotations) {
    const onField = Object.values(rotation.assignments).filter(
      (a) => a === RotationAssignment.Field || a === RotationAssignment.Goalie,
    );
    if (onField.length !== fieldSize) {
      violations.push(
        `Rotation ${rotation.index + 1}: Expected ${fieldSize} on field, got ${onField.length}`,
      );
    }

    if (config.useGoalie) {
      const goalies = Object.values(rotation.assignments).filter(
        (a) => a === RotationAssignment.Goalie,
      );
      if (goalies.length !== 1) {
        violations.push(
          `Rotation ${rotation.index + 1}: Expected 1 goalie, got ${goalies.length}`,
        );
      }
    }
  }

  if (config.noConsecutiveBench) {
    for (const player of players) {
      let consecutiveBench = 0;
      for (const rotation of schedule.rotations) {
        const assignment = rotation.assignments[player.id];
        if (assignment === RotationAssignment.Bench) {
          consecutiveBench++;
          if (consecutiveBench > config.maxConsecutiveBench) {
            violations.push(
              `${player.name}: benched ${consecutiveBench} consecutive rotations (max: ${config.maxConsecutiveBench})`,
            );
          }
        } else {
          consecutiveBench = 0;
        }
      }
    }
  }

  if (config.enforceMinPlayTime) {
    for (const player of players) {
      const stats = schedule.playerStats[player.id];
      if (stats && stats.playPercentage < config.minPlayPercentage) {
        violations.push(
          `${player.name}: play time ${stats.playPercentage}% (minimum: ${config.minPlayPercentage}%)`,
        );
      }
    }
  }

  if (config.useGoalie && config.goalieRestAfterPeriod) {
    const rotationsPerPeriod = config.rotationsPerPeriod;
    for (const player of players) {
      const checkedPeriods = new Set<number>();
      for (const rotation of schedule.rotations) {
        if (
          rotation.assignments[player.id] === RotationAssignment.Goalie &&
          !checkedPeriods.has(rotation.periodIndex)
        ) {
          checkedPeriods.add(rotation.periodIndex);
          const periodEnd = (rotation.periodIndex + 1) * rotationsPerPeriod;
          if (periodEnd < schedule.rotations.length) {
            const nextPeriodFirst = schedule.rotations[periodEnd];
            if (nextPeriodFirst.assignments[player.id] !== RotationAssignment.Bench) {
              violations.push(
                `${player.name}: must rest first rotation after goalkeeping period ${rotation.periodIndex + 1}`,
              );
            }
          }
        }
      }
    }
  }

  return violations;
}

export function validateRosterForGame(
  players: Player[],
  config: GameConfig,
  absentPlayerIds: PlayerId[],
): string[] {
  const errors: string[] = [];
  const activePlayers = players.filter((p) => !absentPlayerIds.includes(p.id));

  if (activePlayers.length < config.fieldSize) {
    errors.push(
      `Not enough players: ${activePlayers.length} available, ${config.fieldSize} needed on field`,
    );
  }

  if (activePlayers.length === config.fieldSize) {
    errors.push(
      `All ${activePlayers.length} players will be on field every rotation (no substitutions possible)`,
    );
  }

  if (config.useGoalie) {
    const goalieEligible = activePlayers.filter((p) => p.canPlayGoalie);
    if (goalieEligible.length === 0) {
      errors.push('No players are marked as goalie-eligible');
    }

    if (goalieEligible.length < config.periods && config.goalieRestAfterPeriod) {
      errors.push(
        `Need at least ${config.periods} goalie-eligible players for goalie rest rotation (have ${goalieEligible.length})`,
      );
    }
  }

  return errors;
}

import { RotationAssignment } from '@/types/domain.ts';
import type {
  Player,
  PlayerId,
  GoalieAssignment,
  ManualOverride,
  SubPosition,
} from '@/types/domain.ts';
import { normalizePeriodDivisions, getPeriodOffsets } from '@/utils/rotationLayout.ts';
import type { SolverContext } from './types.ts';

/**
 * Pre-processed constraint data extracted from SolverContext.
 * Separates domain logic from solver-specific formulation.
 */
export interface PreparedConstraints {
  goalieMap: Map<number, string>;
  cannotBench: Map<string, Set<number>>;
  mustBench: Map<string, Set<number>>;
  hardFieldPositionLocksByRotation: Map<number, Map<PlayerId, SubPosition>>;
  softFieldPositionPrefsByRotation: Map<number, Map<PlayerId, SubPosition>>;
  softOverrides: ManualOverride[];
  maxBenchWeightByPlayer: Map<string, number>;
  rotationWeights: number[];
  totalRotationWeight: number;
  normalizedPeriodDivisions: number[];
}

export function resolveGoalieAssignments(
  players: Player[],
  periods: number,
  assignments: GoalieAssignment[],
  disallowedGoaliesByPeriod: Map<number, Set<PlayerId>>,
): string[] {
  const goalieEligible = players.filter((p) => p.canPlayGoalie);
  const playerNameById = new Map(players.map((p) => [p.id, p.name]));
  const result: string[] = [];

  for (let period = 0; period < periods; period++) {
    const disallowedGoalies = disallowedGoaliesByPeriod.get(period) ?? new Set<PlayerId>();
    const periodGoalieEligible = goalieEligible.filter((p) => !disallowedGoalies.has(p.id));
    const assignment = assignments.find((a) => a.periodIndex === period);
    if (assignment && assignment.playerId !== 'auto') {
      if (disallowedGoalies.has(assignment.playerId)) {
        const playerName = playerNameById.get(assignment.playerId) ?? 'Player';
        throw new Error(
          `${playerName} cannot be goalie in period ${period + 1} because they have a hard non-goalie lock in a goalie rotation.`,
        );
      }
      result.push(assignment.playerId);
    } else {
      const counts = new Map<string, number>();
      for (const id of result) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }

      const sorted = [...periodGoalieEligible].sort(
        (a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0),
      );

      const prevGoalie = result[result.length - 1];
      const candidate = sorted.find((p) => p.id !== prevGoalie) ?? sorted[0];

      if (!candidate) {
        if (disallowedGoalies.size > 0) {
          const lockedNames = [...disallowedGoalies]
            .map((id) => playerNameById.get(id) ?? 'Player')
            .join(', ');
          throw new Error(
            `No goalie-eligible player available for period ${period + 1} after applying hard locks (${lockedNames}).`,
          );
        }
        throw new Error(`No goalie-eligible player available for period ${period + 1}`);
      }
      result.push(candidate.id);
    }
  }

  return result;
}

/**
 * Prepare constraint maps from the SolverContext and goalie resolution.
 * Extracts cannotBench/mustBench sets, override handling, and weight limits.
 * Shared by both the MIP solver and the exhaustive backtracking solver.
 */
export function prepareConstraints(ctx: SolverContext): PreparedConstraints {
  const { players, config, goalieAssignments, manualOverrides, periodDivisions, totalRotations } =
    ctx;

  const normalizedPeriodDivisions = normalizePeriodDivisions(
    periodDivisions,
    config.periods,
    config.rotationsPerPeriod,
  );
  const periodOffsets = getPeriodOffsets(normalizedPeriodDivisions);
  const defaultRotationWeights = normalizedPeriodDivisions.flatMap((division) =>
    Array.from({ length: division }, () => 1 / division),
  );
  const rotationWeights = ctx.rotationWeights ?? defaultRotationWeights;

  if (rotationWeights.length !== totalRotations) {
    throw new Error('Period divisions do not match total rotations.');
  }

  const totalRotationWeight = rotationWeights.reduce((sum, w) => sum + w, 0);
  const defaultMaxBenchWeight = totalRotationWeight * (1 - config.minPlayPercentage / 100);

  const playerNameById = new Map(players.map((p) => [p.id, p.name]));
  const playerById = new Map(players.map((p) => [p.id, p]));
  const activePlayerIds = new Set(players.map((p) => p.id));

  // --- Normalize manual overrides ---
  const overrideByKey = new Map<string, ManualOverride>();
  for (const manualOverride of manualOverrides) {
    if (!activePlayerIds.has(manualOverride.playerId)) continue;
    if (manualOverride.rotationIndex < 0 || manualOverride.rotationIndex >= totalRotations)
      continue;

    const normalized: ManualOverride = {
      ...manualOverride,
      lockMode: manualOverride.lockMode === 'soft' ? 'soft' : 'hard',
    };
    const key = `${normalized.playerId}:${normalized.rotationIndex}`;
    const existing = overrideByKey.get(key);
    if (!existing) {
      overrideByKey.set(key, normalized);
      continue;
    }
    if (existing.lockMode === 'hard' && normalized.lockMode === 'soft') continue;
    if (existing.lockMode === 'soft' && normalized.lockMode === 'hard') {
      overrideByKey.set(key, normalized);
      continue;
    }
    if (
      existing.lockMode === 'hard' &&
      normalized.lockMode === 'hard' &&
      existing.assignment !== normalized.assignment
    ) {
      const name = playerNameById.get(normalized.playerId) ?? 'Player';
      throw new Error(
        `${name} has conflicting hard assignments on R${normalized.rotationIndex + 1}.`,
      );
    }
    overrideByKey.set(key, normalized);
  }

  const normalizedOverrides = [...overrideByKey.values()];
  const hardOverrides = normalizedOverrides.filter((o) => o.lockMode === 'hard');
  const softOverrides = normalizedOverrides.filter((o) => o.lockMode === 'soft');

  // --- Goalie disallowed sets from hard overrides ---
  const hardOverridesByRotation = new Map<number, ManualOverride[]>();
  for (const override of hardOverrides) {
    const list = hardOverridesByRotation.get(override.rotationIndex) ?? [];
    list.push(override);
    hardOverridesByRotation.set(override.rotationIndex, list);
  }

  const disallowedGoaliesByPeriod = new Map<number, Set<PlayerId>>();
  if (config.useGoalie) {
    for (let period = 0; period < config.periods; period++) {
      const periodStart = periodOffsets[period] ?? 0;
      const periodDivision = normalizedPeriodDivisions[period] ?? 1;
      const goalieDutyRotations = config.goaliePlayFullPeriod
        ? Array.from({ length: periodDivision }, (_, rot) => periodStart + rot)
        : [periodStart];

      const disallowed = new Set<PlayerId>();
      for (const rotIndex of goalieDutyRotations) {
        const overrides = hardOverridesByRotation.get(rotIndex);
        if (!overrides) continue;
        for (const override of overrides) {
          const blocksGoalie =
            override.assignment === RotationAssignment.Bench ||
            (override.assignment === RotationAssignment.Field && !!override.fieldPosition);
          if (blocksGoalie) disallowed.add(override.playerId);
        }
      }
      if (disallowed.size > 0) disallowedGoaliesByPeriod.set(period, disallowed);
    }
  }

  // --- Resolve goalies ---
  const goalieMap = new Map<number, string>();
  const forcedBench = new Map<string, Set<number>>();

  if (config.useGoalie) {
    ctx.onProgress(3, 'game:solver.calculating_goalie');

    const goaliePerPeriod = resolveGoalieAssignments(
      players,
      config.periods,
      goalieAssignments,
      disallowedGoaliesByPeriod,
    );

    if (config.goalieRestAfterPeriod) {
      for (let period = 0; period < config.periods - 1; period++) {
        if (goaliePerPeriod[period] === goaliePerPeriod[period + 1]) {
          const name = playerNameById.get(goaliePerPeriod[period]) ?? 'Player';
          throw new Error(
            `${name} is assigned goalie in periods ${period + 1} and ${period + 2}. ` +
              `Goalie rest requires them to bench first rotation of period ${period + 2}.`,
          );
        }
      }
    }

    for (let period = 0; period < config.periods; period++) {
      const goalieId = goaliePerPeriod[period];
      const periodStart = periodOffsets[period] ?? 0;
      const periodDivision = normalizedPeriodDivisions[period] ?? 1;
      for (let rot = 0; rot < periodDivision; rot++) {
        const rotIndex = periodStart + rot;
        if (config.goaliePlayFullPeriod || rot === 0) {
          goalieMap.set(rotIndex, goalieId);
        }
      }
    }

    if (config.goalieRestAfterPeriod) {
      for (let period = 0; period < config.periods; period++) {
        const goalieId = goaliePerPeriod[period];
        const nextFirst = periodOffsets[period + 1];
        if (nextFirst < totalRotations) {
          if (!forcedBench.has(goalieId)) forcedBench.set(goalieId, new Set());
          forcedBench.get(goalieId)!.add(nextFirst);
        }
      }
    }
  }

  // --- Apply hard goalie overrides ---
  const hardGoalieOverrides = hardOverrides.filter(
    (o) => o.assignment === RotationAssignment.Goalie,
  );
  if (!config.useGoalie && hardGoalieOverrides.length > 0) {
    throw new Error('Hard goalie locks are not allowed when goalie usage is disabled.');
  }

  const hardGoalieByRotation = new Map<number, PlayerId>();
  for (const override of hardGoalieOverrides) {
    const existing = hardGoalieByRotation.get(override.rotationIndex);
    if (existing && existing !== override.playerId) {
      throw new Error(
        `R${override.rotationIndex + 1} has multiple hard goalie locks. Only one goalie is allowed.`,
      );
    }
    const player = playerById.get(override.playerId);
    if (!player?.canPlayGoalie) {
      throw new Error(`${player?.name ?? 'Player'} cannot be hard-locked as goalie.`);
    }
    hardGoalieByRotation.set(override.rotationIndex, override.playerId);
  }

  for (const [rotIndex, playerId] of hardGoalieByRotation.entries()) {
    goalieMap.set(rotIndex, playerId);
  }

  // --- Build cannotBench / mustBench ---
  const cannotBench = new Map<string, Set<number>>();
  const mustBench = new Map<string, Set<number>>();

  const forcedAssignments = new Map<string, Map<number, RotationAssignment>>();
  for (const override of hardOverrides) {
    if (!forcedAssignments.has(override.playerId)) {
      forcedAssignments.set(override.playerId, new Map());
    }
    forcedAssignments.get(override.playerId)!.set(override.rotationIndex, override.assignment);
  }

  for (const player of players) {
    const cannot = new Set<number>();
    const must = new Set<number>();

    for (const [rotIndex, goalieId] of goalieMap.entries()) {
      if (goalieId === player.id) cannot.add(rotIndex);
    }

    const forced = forcedAssignments.get(player.id);
    if (forced) {
      for (const [rotIndex, assignment] of forced.entries()) {
        if (assignment === RotationAssignment.Field || assignment === RotationAssignment.Goalie) {
          cannot.add(rotIndex);
        }
        if (assignment === RotationAssignment.Bench) {
          must.add(rotIndex);
        }
      }
    }

    const fb = forcedBench.get(player.id);
    if (fb) {
      for (const idx of fb) must.add(idx);
    }

    cannotBench.set(player.id, cannot);
    mustBench.set(player.id, must);
  }

  // Validate goalie vs bench conflicts
  for (const override of hardOverrides) {
    const goalieId = goalieMap.get(override.rotationIndex);
    if (goalieId === override.playerId && override.assignment === RotationAssignment.Bench) {
      const name = playerNameById.get(override.playerId) ?? 'Player';
      throw new Error(
        `${name} is hard-locked as bench on R${override.rotationIndex + 1}, ` +
          `but goalie assignment requires GOALIE.`,
      );
    }
  }

  // --- Hard field position locks ---
  const hardFieldPositionLocksByRotation = new Map<number, Map<PlayerId, SubPosition>>();
  for (const override of hardOverrides) {
    if (!override.fieldPosition) continue;
    if (override.assignment !== RotationAssignment.Field) {
      const name = playerNameById.get(override.playerId) ?? 'Player';
      throw new Error(
        `${name} has a hard position lock on R${override.rotationIndex + 1} but is not set to FIELD.`,
      );
    }
    const rotLocks =
      hardFieldPositionLocksByRotation.get(override.rotationIndex) ??
      new Map<PlayerId, SubPosition>();
    const collision = [...rotLocks.entries()].find(
      ([pid, pos]) => pos === override.fieldPosition && pid !== override.playerId,
    );
    if (collision) {
      const name = playerNameById.get(override.playerId) ?? 'Player';
      const colName = playerNameById.get(collision[0]) ?? 'Player';
      throw new Error(
        `R${override.rotationIndex + 1}: ${name} and ${colName} are hard-locked to ${override.fieldPosition}.`,
      );
    }
    rotLocks.set(override.playerId, override.fieldPosition);
    hardFieldPositionLocksByRotation.set(override.rotationIndex, rotLocks);
  }

  // --- Soft field position prefs ---
  const softFieldPositionPrefsByRotation = new Map<number, Map<PlayerId, SubPosition>>();
  for (const override of softOverrides) {
    if (!override.fieldPosition || override.assignment !== RotationAssignment.Field) continue;
    const prefs =
      softFieldPositionPrefsByRotation.get(override.rotationIndex) ??
      new Map<PlayerId, SubPosition>();
    prefs.set(override.playerId, override.fieldPosition);
    softFieldPositionPrefsByRotation.set(override.rotationIndex, prefs);
  }

  // --- Bench weight limits per player ---
  const maxBenchWeightByPlayer = new Map<string, number>();
  for (const player of players) {
    maxBenchWeightByPlayer.set(
      player.id,
      ctx.maxBenchWeightByPlayer?.[player.id] ?? defaultMaxBenchWeight,
    );
  }

  return {
    goalieMap,
    cannotBench,
    mustBench,
    hardFieldPositionLocksByRotation,
    softFieldPositionPrefsByRotation,
    softOverrides,
    maxBenchWeightByPlayer,
    rotationWeights,
    totalRotationWeight,
    normalizedPeriodDivisions,
  };
}

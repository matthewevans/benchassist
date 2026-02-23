import { Model } from 'lp-model';
import type { Var, ExpressionTerm } from 'lp-model';
import { RotationAssignment } from '@/types/domain.ts';
import type { Player, ManualOverride } from '@/types/domain.ts';
import type { SolverContext } from './types.ts';
import type { PreparedConstraints } from './constraintPreparation.ts';

/**
 * A built LP model with references to decision variables for solution extraction.
 */
export interface BuiltModel {
  lpString: string;
  /** b[playerIndex][rotationIndex] variable names */
  benchVarNames: string[][];
  playerOrder: Player[];
}

/** Shared core variables created by buildCoreModel. */
interface CoreModelVars {
  model: Model;
  b: Var[][];
  benchVarNames: string[][];
  playMax: Var;
  playMin: Var;
  scaledRotationWeights: number[];
  scaledTotalRotationWeight: number;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}

function lcm(a: number, b: number): number {
  return Math.abs((a / gcd(a, b)) * b);
}

/**
 * Determine an integer scaling factor so all rotation weights become integers.
 * This avoids fractional coefficients in core bench-weight constraints, which
 * trigger instability in highs WASM for larger MIP models.
 */
function getWeightScale(rotationWeights: number[]): number {
  const EPSILON = 1e-9;
  const MAX_DENOMINATOR = 64;
  let scale = 1;

  for (const weight of rotationWeights) {
    if (!Number.isFinite(weight)) continue;
    let denominator = 1;
    for (let candidate = 1; candidate <= MAX_DENOMINATOR; candidate++) {
      const scaled = weight * candidate;
      if (Math.abs(scaled - Math.round(scaled)) < EPSILON) {
        denominator = candidate;
        break;
      }
    }
    scale = lcm(scale, denominator);
  }

  return Math.max(1, scale);
}

function scaleValue(value: number, scale: number): number {
  const EPSILON = 1e-9;
  const scaled = value * scale;
  const rounded = Math.round(scaled);
  return Math.abs(scaled - rounded) < EPSILON ? rounded : scaled;
}

/**
 * Create decision variables and add all core constraints:
 * bench capacity, fixed assignments, consecutive bench, min play time, playMax/playMin linkage.
 */
function buildCoreModel(ctx: SolverContext, constraints: PreparedConstraints): CoreModelVars {
  const { players, config, totalRotations, benchSlotsPerRotation } = ctx;
  const { rotationWeights, totalRotationWeight, cannotBench, mustBench } = constraints;
  const weightScale = getWeightScale(rotationWeights);
  const scaledRotationWeights = rotationWeights.map((weight) => scaleValue(weight, weightScale));
  const scaledTotalRotationWeight = scaleValue(totalRotationWeight, weightScale);
  const model = new Model();

  // Binary variables: b[i][r] = 1 if player i is benched in rotation r
  const b: Var[][] = [];
  const benchVarNames: string[][] = [];
  for (let i = 0; i < players.length; i++) {
    const row: Var[] = [];
    const nameRow: string[] = [];
    for (let r = 0; r < totalRotations; r++) {
      const name = `b_${i}_${r}`;
      row.push(model.addVar({ vtype: 'BINARY', name }));
      nameRow.push(name);
    }
    b.push(row);
    benchVarNames.push(nameRow);
  }

  // Auxiliary continuous variables for gap linearization
  const playMax = model.addVar({ lb: 0, ub: scaledTotalRotationWeight, name: 'playMax' });
  const playMin = model.addVar({ lb: 0, ub: scaledTotalRotationWeight, name: 'playMin' });

  // Constraint 1: Bench capacity per rotation
  // Σ_i b[i][r] = benchSlotsPerRotation for each r
  for (let r = 0; r < totalRotations; r++) {
    const terms: ExpressionTerm[] = players.map((_, i) => b[i][r]);
    model.addConstr(terms, '=', benchSlotsPerRotation);
  }

  // Constraint 2: Fixed assignments (cannotBench / mustBench)
  for (let i = 0; i < players.length; i++) {
    const playerId = players[i].id;
    const cannot = cannotBench.get(playerId);
    if (cannot) {
      for (const r of cannot) {
        model.addConstr([b[i][r]], '=', 0);
      }
    }
    const must = mustBench.get(playerId);
    if (must) {
      for (const r of must) {
        model.addConstr([b[i][r]], '=', 1);
      }
    }
  }

  // Constraint 3: No consecutive bench
  // When a period is split into multiple sub-rotations, the consecutive bench
  // constraint is relaxed within that period: for each consecutive pair in the
  // window that shares a period, add 1 slack. This lets players sit out
  // multiple sub-rotations within a split period without penalty.
  if (config.noConsecutiveBench) {
    const K = config.maxConsecutiveBench;
    const rotationPeriod: number[] = [];
    for (let p = 0; p < constraints.normalizedPeriodDivisions.length; p++) {
      for (let d = 0; d < constraints.normalizedPeriodDivisions[p]; d++) {
        rotationPeriod.push(p);
      }
    }
    for (let i = 0; i < players.length; i++) {
      for (let r = 0; r <= totalRotations - K - 1; r++) {
        let slack = 0;
        for (let k = 0; k < K; k++) {
          if (rotationPeriod[r + k] === rotationPeriod[r + k + 1]) slack++;
        }
        const window: ExpressionTerm[] = Array.from({ length: K + 1 }, (_, k) => b[i][r + k]);
        model.addConstr(window, '<=', K + slack);
      }
    }
  }

  // Constraint 4: Min play time (weighted bench limit per player)
  if (config.enforceMinPlayTime) {
    for (let i = 0; i < players.length; i++) {
      const maxBW =
        constraints.maxBenchWeightByPlayer.get(players[i].id) ??
        totalRotationWeight * (1 - config.minPlayPercentage / 100);
      const scaledMaxBenchWeight = scaleValue(maxBW, weightScale);
      const terms: ExpressionTerm[] = scaledRotationWeights.map(
        (w, r) => [w, b[i][r]] as [number, Var],
      );
      model.addConstr(terms, '<=', scaledMaxBenchWeight);
    }
  }

  // Constraint 5: playMax >= benchWeight[i] for each player
  for (let i = 0; i < players.length; i++) {
    const terms: ExpressionTerm[] = [
      playMax,
      ...scaledRotationWeights.map((w, r) => [-w, b[i][r]] as [number, Var]),
    ];
    model.addConstr(terms, '>=', 0);
  }

  // Constraint 6: playMin <= benchWeight[i] for each player
  for (let i = 0; i < players.length; i++) {
    const terms: ExpressionTerm[] = [
      playMin,
      ...scaledRotationWeights.map((w, r) => [-w, b[i][r]] as [number, Var]),
    ];
    model.addConstr(terms, '<=', 0);
  }

  return {
    model,
    b,
    benchVarNames,
    playMax,
    playMin,
    scaledRotationWeights,
    scaledTotalRotationWeight,
  };
}

// Soft override weight — small tiebreaker for bench/field preferences.
const SOFT_OVERRIDE_WEIGHT = 1e-4;

/**
 * Append soft-override penalty terms to an objective expression.
 */
function addSoftOverridePenalties(
  objectiveTerms: ExpressionTerm[],
  softOverrides: ManualOverride[],
  players: Player[],
  b: Var[][],
  totalRotations: number,
): void {
  for (const override of softOverrides) {
    const i = players.findIndex((p) => p.id === override.playerId);
    if (i < 0 || override.rotationIndex < 0 || override.rotationIndex >= totalRotations) continue;
    if (override.assignment === RotationAssignment.Bench) {
      objectiveTerms.push([-SOFT_OVERRIDE_WEIGHT, b[i][override.rotationIndex]]);
    } else if (
      override.assignment === RotationAssignment.Field ||
      override.assignment === RotationAssignment.Goalie
    ) {
      objectiveTerms.push([SOFT_OVERRIDE_WEIGHT, b[i][override.rotationIndex]]);
    }
  }
}

/**
 * Penalize benching high-skill players as a tiebreaker.
 */
function addSkillBenchPreference(
  objectiveTerms: ExpressionTerm[],
  players: Player[],
  b: Var[][],
  totalRotations: number,
  weightPerSkillUnit: number,
): void {
  for (let i = 0; i < players.length; i++) {
    const coeff = weightPerSkillUnit * players[i].skillRanking;
    for (let r = 0; r < totalRotations; r++) {
      objectiveTerms.push([coeff, b[i][r]]);
    }
  }
}

/**
 * Build a single-phase MIP model with hierarchical weighted objectives:
 *
 *   Primary:   minimize play time gap (playMax - playMin)
 *   Secondary: prefer benching lower-skill players (when skillBalance on)
 *   Tertiary:  minimize team strength deviation across rotations
 *
 * The weighted hierarchy is constructed with explicit upper bounds so each
 * level dominates the next without needing a second solve phase.
 *
 * This avoids a two-phase solve, which triggers a WASM state corruption bug
 * in the highs JS wrapper v1.8.0 (see https://github.com/lovasoa/highs-js/issues/42).
 */
export function buildPhase1Model(ctx: SolverContext, constraints: PreparedConstraints): BuiltModel {
  const { players, totalRotations, benchSlotsPerRotation } = ctx;
  const {
    model,
    b,
    benchVarNames,
    playMax,
    playMin,
    scaledRotationWeights,
    scaledTotalRotationWeight,
  } = buildCoreModel(ctx, constraints);

  const objectiveTerms: ExpressionTerm[] = [];

  // Strength balance and skill preference with weighted hierarchy.
  if (ctx.config.skillBalance) {
    // Upper bounds used to construct strict objective priorities.
    const maxDeviation = benchSlotsPerRotation * 5 * scaledTotalRotationWeight;
    const maxSkillPenalty = totalRotations * benchSlotsPerRotation * 5;
    const SKILL_WEIGHT = maxDeviation + 1;
    const GAP_WEIGHT = maxSkillPenalty * SKILL_WEIGHT + maxDeviation + 1;

    objectiveTerms.push([GAP_WEIGHT, playMax], [-GAP_WEIGHT, playMin]);
    addSkillBenchPreference(objectiveTerms, players, b, totalRotations, SKILL_WEIGHT);

    const totalStrength = players.reduce((s, p) => s + p.skillRanking, 0);
    const targetStrength = totalStrength * (1 - benchSlotsPerRotation / players.length);

    for (let r = 0; r < totalRotations; r++) {
      const dev = model.addVar({ lb: 0, ub: totalStrength, name: `dev_${r}` });

      // dev[r] >= targetStrength - strength[r]
      const termsPos: ExpressionTerm[] = [
        dev,
        ...players.map((p, i) => [-p.skillRanking, b[i][r]] as [number, Var]),
      ];
      model.addConstr(termsPos, '>=', targetStrength - totalStrength);

      // dev[r] >= strength[r] - targetStrength
      const termsNeg: ExpressionTerm[] = [
        dev,
        ...players.map((p, i) => [p.skillRanking, b[i][r]] as [number, Var]),
      ];
      model.addConstr(termsNeg, '>=', totalStrength - targetStrength);

      objectiveTerms.push([scaledRotationWeights[r], dev]);
    }
  } else {
    // No strength balance — just minimize gap
    objectiveTerms.push([1, playMax], [-1, playMin]);
  }

  addSoftOverridePenalties(objectiveTerms, constraints.softOverrides, players, b, totalRotations);
  model.setObjective(objectiveTerms, 'MINIMIZE');

  return {
    lpString: model.toLPFormat(),
    benchVarNames,
    playerOrder: players,
  };
}

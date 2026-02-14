import { describe, it, expect } from 'vitest';
import { validateSchedule, validateRosterForGame } from './validation.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type { Rotation } from '@/types/domain.ts';
import { buildRoster, buildRotation, buildSchedule, playerFactory, gameConfigFactory } from '@/test/factories.ts';

describe('validateSchedule', () => {
  it('returns no violations for a valid schedule', () => {
    const [p1, p2, p3] = [
      playerFactory.build({ name: 'A' }),
      playerFactory.build({ name: 'B' }),
      playerFactory.build({ name: 'C' }),
    ];
    const rotations: Rotation[] = [
      buildRotation(0, {
        [p1.id]: RotationAssignment.Goalie,
        [p2.id]: RotationAssignment.Field,
        [p3.id]: RotationAssignment.Field,
      }),
      buildRotation(1, {
        [p1.id]: RotationAssignment.Goalie,
        [p2.id]: RotationAssignment.Field,
        [p3.id]: RotationAssignment.Field,
      }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 3,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      goalieRestAfterPeriod: false,
    });
    const schedule = buildSchedule(rotations, [p1, p2, p3]);

    const violations = validateSchedule(schedule, config, [p1, p2, p3]);

    expect(violations).toHaveLength(0);
  });

  it('detects wrong number of players on field', () => {
    const [p1, p2] = [
      playerFactory.build({ name: 'A' }),
      playerFactory.build({ name: 'B' }),
    ];
    const rotations: Rotation[] = [
      buildRotation(0, {
        [p1.id]: RotationAssignment.Goalie,
        [p2.id]: RotationAssignment.Field,
      }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 5,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      goalieRestAfterPeriod: false,
    });
    const schedule = buildSchedule(rotations, [p1, p2]);

    const violations = validateSchedule(schedule, config, [p1, p2]);

    expect(violations).toContainEqual(expect.stringContaining('Expected 5 on field, got 2'));
  });

  it('detects missing goalie in a rotation', () => {
    const [p1, p2, p3] = [
      playerFactory.build({ name: 'A' }),
      playerFactory.build({ name: 'B' }),
      playerFactory.build({ name: 'C' }),
    ];
    const rotations: Rotation[] = [
      buildRotation(0, {
        [p1.id]: RotationAssignment.Field,
        [p2.id]: RotationAssignment.Field,
        [p3.id]: RotationAssignment.Field,
      }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 3,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      goalieRestAfterPeriod: false,
    });
    const schedule = buildSchedule(rotations, [p1, p2, p3]);

    const violations = validateSchedule(schedule, config, [p1, p2, p3]);

    expect(violations).toContainEqual(expect.stringContaining('Expected 1 goalie, got 0'));
  });

  it('detects consecutive bench violations', () => {
    const [p1, p2, p3] = [
      playerFactory.build({ name: 'A' }),
      playerFactory.build({ name: 'B' }),
      playerFactory.build({ name: 'C' }),
    ];
    const rotations: Rotation[] = [
      buildRotation(0, {
        [p1.id]: RotationAssignment.Bench,
        [p2.id]: RotationAssignment.Goalie,
        [p3.id]: RotationAssignment.Field,
      }),
      buildRotation(1, {
        [p1.id]: RotationAssignment.Bench,
        [p2.id]: RotationAssignment.Goalie,
        [p3.id]: RotationAssignment.Field,
      }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 2,
      noConsecutiveBench: true,
      maxConsecutiveBench: 1,
      enforceMinPlayTime: false,
      goalieRestAfterPeriod: false,
    });
    const schedule = buildSchedule(rotations, [p1, p2, p3]);

    const violations = validateSchedule(schedule, config, [p1, p2, p3]);

    expect(violations).toContainEqual(expect.stringContaining('A: benched 2 consecutive'));
  });

  it('skips consecutive bench check when rule is disabled', () => {
    const [p1, p2] = [
      playerFactory.build({ name: 'A' }),
      playerFactory.build({ name: 'B' }),
    ];
    const rotations: Rotation[] = [
      buildRotation(0, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(1, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Goalie }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 1,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      goalieRestAfterPeriod: false,
    });
    const schedule = buildSchedule(rotations, [p1, p2]);

    const violations = validateSchedule(schedule, config, [p1, p2]);

    const benchViolations = violations.filter((v) => v.includes('consecutive'));
    expect(benchViolations).toHaveLength(0);
  });

  it('detects minimum play time violations', () => {
    const [p1, p2] = [
      playerFactory.build({ name: 'A' }),
      playerFactory.build({ name: 'B' }),
    ];
    const rotations: Rotation[] = [
      buildRotation(0, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(1, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(2, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(3, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 1,
      noConsecutiveBench: false,
      enforceMinPlayTime: true,
      minPlayPercentage: 50,
      goalieRestAfterPeriod: false,
    });
    const schedule = buildSchedule(rotations, [p1, p2]);

    const violations = validateSchedule(schedule, config, [p1, p2]);

    expect(violations).toContainEqual(expect.stringContaining('A: play time 25%'));
  });

  it('detects goalie rest violation when goalie plays next period', () => {
    const [p1, p2, p3] = [
      playerFactory.build({ name: 'GoalieA' }),
      playerFactory.build({ name: 'B' }),
      playerFactory.build({ name: 'C' }),
    ];
    const rotations: Rotation[] = [
      // Period 0, rotation 0: p1 is goalie
      { index: 0, periodIndex: 0, assignments: { [p1.id]: RotationAssignment.Goalie, [p2.id]: RotationAssignment.Field, [p3.id]: RotationAssignment.Bench }, teamStrength: 0, violations: [] },
      // Period 0, rotation 1: p1 is goalie
      { index: 1, periodIndex: 0, assignments: { [p1.id]: RotationAssignment.Goalie, [p2.id]: RotationAssignment.Field, [p3.id]: RotationAssignment.Bench }, teamStrength: 0, violations: [] },
      // Period 1, rotation 2: p1 should be benched but is on field
      { index: 2, periodIndex: 1, assignments: { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie, [p3.id]: RotationAssignment.Field }, teamStrength: 0, violations: [] },
      // Period 1, rotation 3
      { index: 3, periodIndex: 1, assignments: { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie, [p3.id]: RotationAssignment.Field }, teamStrength: 0, violations: [] },
    ];
    const config = gameConfigFactory.build({
      fieldSize: 2,
      periods: 2,
      rotationsPerPeriod: 2,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      goalieRestAfterPeriod: true,
    });
    const schedule = buildSchedule(rotations, [p1, p2, p3]);

    const violations = validateSchedule(schedule, config, [p1, p2, p3]);

    expect(violations).toContainEqual(
      expect.stringContaining('GoalieA: must rest first rotation after goalkeeping period 1'),
    );
  });

  it('skips goalie count check when useGoalie is false', () => {
    const [p1, p2, p3] = [
      playerFactory.build({ name: 'A' }),
      playerFactory.build({ name: 'B' }),
      playerFactory.build({ name: 'C' }),
    ];
    const rotations: Rotation[] = [
      buildRotation(0, {
        [p1.id]: RotationAssignment.Field,
        [p2.id]: RotationAssignment.Field,
        [p3.id]: RotationAssignment.Field,
      }),
    ];
    const config = gameConfigFactory.build({
      fieldSize: 3,
      useGoalie: false,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      goalieRestAfterPeriod: false,
    });
    const schedule = buildSchedule(rotations, [p1, p2, p3]);

    const violations = validateSchedule(schedule, config, [p1, p2, p3]);

    expect(violations).toHaveLength(0);
  });

  it('passes goalie rest check when goalie is properly benched next period', () => {
    const [p1, p2, p3] = [
      playerFactory.build({ name: 'GoalieA' }),
      playerFactory.build({ name: 'B' }),
      playerFactory.build({ name: 'C' }),
    ];
    const rotations: Rotation[] = [
      { index: 0, periodIndex: 0, assignments: { [p1.id]: RotationAssignment.Goalie, [p2.id]: RotationAssignment.Field, [p3.id]: RotationAssignment.Bench }, teamStrength: 0, violations: [] },
      { index: 1, periodIndex: 0, assignments: { [p1.id]: RotationAssignment.Goalie, [p2.id]: RotationAssignment.Bench, [p3.id]: RotationAssignment.Field }, teamStrength: 0, violations: [] },
      { index: 2, periodIndex: 1, assignments: { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Goalie, [p3.id]: RotationAssignment.Field }, teamStrength: 0, violations: [] },
      { index: 3, periodIndex: 1, assignments: { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie, [p3.id]: RotationAssignment.Bench }, teamStrength: 0, violations: [] },
    ];
    const config = gameConfigFactory.build({
      fieldSize: 2,
      periods: 2,
      rotationsPerPeriod: 2,
      noConsecutiveBench: false,
      enforceMinPlayTime: false,
      goalieRestAfterPeriod: true,
    });
    const schedule = buildSchedule(rotations, [p1, p2, p3]);

    const violations = validateSchedule(schedule, config, [p1, p2, p3]);

    const restViolations = violations.filter((v) => v.includes('must rest'));
    expect(restViolations).toHaveLength(0);
  });
});

describe('validateRosterForGame', () => {
  it('returns error when not enough players for the field size', () => {
    const players = buildRoster(5);
    const config = gameConfigFactory.build({ fieldSize: 7 });

    const errors = validateRosterForGame(players, config, []);

    expect(errors).toContainEqual(
      expect.stringContaining('Not enough players'),
    );
  });

  it('warns when all players must be on field (no subs possible)', () => {
    const players = buildRoster(7, { goalieCount: 2 });
    const config = gameConfigFactory.build({ fieldSize: 7 });

    const errors = validateRosterForGame(players, config, []);

    expect(errors).toContainEqual(
      expect.stringContaining('no substitutions possible'),
    );
  });

  it('returns error when no goalie-eligible players', () => {
    const players = buildRoster(9, { goalieCount: 0 });
    const config = gameConfigFactory.build({ fieldSize: 7 });

    const errors = validateRosterForGame(players, config, []);

    expect(errors).toContainEqual(
      expect.stringContaining('goalie-eligible'),
    );
  });

  it('returns error when not enough goalies for goalie rest rotation', () => {
    const players = buildRoster(9, { goalieCount: 1 });
    const config = gameConfigFactory.build({ fieldSize: 7, periods: 2, goalieRestAfterPeriod: true });

    const errors = validateRosterForGame(players, config, []);

    expect(errors).toContainEqual(
      expect.stringContaining('Need at least 2 goalie-eligible'),
    );
  });

  it('accounts for absent players when checking roster validity', () => {
    const players = buildRoster(9);
    const config = gameConfigFactory.build({ fieldSize: 7 });
    const absentIds = players.slice(0, 3).map((p) => p.id);

    const errors = validateRosterForGame(players, config, absentIds);

    expect(errors).toContainEqual(
      expect.stringContaining('Not enough players'),
    );
  });

  it('returns no errors for a valid roster', () => {
    const players = buildRoster(10, { goalieCount: 3 });
    const config = gameConfigFactory.build({ fieldSize: 7, periods: 2, goalieRestAfterPeriod: true });

    const errors = validateRosterForGame(players, config, []);

    expect(errors).toHaveLength(0);
  });

  it('skips goalie-eligible check when useGoalie is false', () => {
    const players = buildRoster(9, { goalieCount: 0 });
    const config = gameConfigFactory.build({ fieldSize: 7, useGoalie: false });

    const errors = validateRosterForGame(players, config, []);

    const goalieErrors = errors.filter((e) => e.includes('goalie'));
    expect(goalieErrors).toHaveLength(0);
  });
});

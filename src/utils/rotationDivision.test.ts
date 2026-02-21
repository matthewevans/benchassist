import { describe, expect, it } from 'vitest';
import { RotationAssignment } from '@/types/domain.ts';
import { buildSchedule, buildRotation, playerFactory } from '@/test/factories.ts';
import { redivideSchedulePeriod } from './rotationDivision.ts';

describe('redivideSchedulePeriod', () => {
  it('splits a single-rotation period into two rotations', () => {
    const p1 = playerFactory.build({ name: 'A' });
    const p2 = playerFactory.build({ name: 'B' });
    const players = [p1, p2];

    const r0 = buildRotation(0, {
      [p1.id]: RotationAssignment.Field,
      [p2.id]: RotationAssignment.Bench,
    });
    r0.periodIndex = 0;
    const r1 = buildRotation(1, {
      [p1.id]: RotationAssignment.Bench,
      [p2.id]: RotationAssignment.Field,
    });
    r1.periodIndex = 1;

    const schedule = buildSchedule([r0, r1], players);
    const result = redivideSchedulePeriod({
      schedule,
      players,
      periodDivisions: [1, 1],
      periodIndex: 0,
      nextDivision: 2,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.periodDivisions).toEqual([2, 1]);
    expect(result.schedule.rotations).toHaveLength(3);
    expect(result.schedule.rotations[0].periodIndex).toBe(0);
    expect(result.schedule.rotations[1].periodIndex).toBe(0);
    expect(result.schedule.rotations[2].periodIndex).toBe(1);
    expect(result.schedule.rotations[0].assignments).toEqual(
      result.schedule.rotations[1].assignments,
    );
  });

  it('merges a period when grouped rotations are identical', () => {
    const p1 = playerFactory.build({ name: 'A' });
    const p2 = playerFactory.build({ name: 'B' });
    const players = [p1, p2];

    const r0 = buildRotation(0, {
      [p1.id]: RotationAssignment.Field,
      [p2.id]: RotationAssignment.Bench,
    });
    r0.periodIndex = 0;
    const r1 = buildRotation(1, {
      [p1.id]: RotationAssignment.Field,
      [p2.id]: RotationAssignment.Bench,
    });
    r1.periodIndex = 0;
    const r2 = buildRotation(2, {
      [p1.id]: RotationAssignment.Bench,
      [p2.id]: RotationAssignment.Field,
    });
    r2.periodIndex = 1;

    const schedule = buildSchedule([r0, r1, r2], players);
    const result = redivideSchedulePeriod({
      schedule,
      players,
      periodDivisions: [2, 1],
      periodIndex: 0,
      nextDivision: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.periodDivisions).toEqual([1, 1]);
    expect(result.schedule.rotations).toHaveLength(2);
    expect(result.schedule.rotations[0].periodIndex).toBe(0);
    expect(result.schedule.rotations[1].periodIndex).toBe(1);
  });

  it('rejects merge when rotations are not identical', () => {
    const p1 = playerFactory.build({ name: 'A' });
    const p2 = playerFactory.build({ name: 'B' });
    const players = [p1, p2];

    const r0 = buildRotation(0, {
      [p1.id]: RotationAssignment.Field,
      [p2.id]: RotationAssignment.Bench,
    });
    r0.periodIndex = 0;
    const r1 = buildRotation(1, {
      [p1.id]: RotationAssignment.Bench,
      [p2.id]: RotationAssignment.Field,
    });
    r1.periodIndex = 0;

    const schedule = buildSchedule([r0, r1], players);
    const result = redivideSchedulePeriod({
      schedule,
      players,
      periodDivisions: [2],
      periodIndex: 0,
      nextDivision: 1,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Cannot merge period 1/);
  });
});

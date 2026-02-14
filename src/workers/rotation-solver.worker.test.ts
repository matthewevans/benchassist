import { describe, it, expect } from 'vitest';
import { mergeSchedules } from './rotation-solver.worker.ts';
import { RotationAssignment } from '@/types/domain.ts';
import { playerFactory, buildRotation, buildSchedule } from '@/test/factories.ts';

describe('mergeSchedules', () => {
  it('preserves played rotations and replaces future ones', () => {
    const p1 = playerFactory.build({ name: 'A', skillRanking: 3 });
    const p2 = playerFactory.build({ name: 'B', skillRanking: 2 });
    const p3 = playerFactory.build({ name: 'C', skillRanking: 4 });

    // Existing schedule: 4 rotations, all three players
    const existingRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie, [p3.id]: RotationAssignment.Field }),
      buildRotation(1, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie, [p3.id]: RotationAssignment.Bench }),
      buildRotation(2, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Goalie, [p3.id]: RotationAssignment.Field }),
      buildRotation(3, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie, [p3.id]: RotationAssignment.Field }),
    ];

    // New schedule from solver (p3 removed, only p1 and p2)
    const newRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(1, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(2, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie }),
      buildRotation(3, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Goalie }),
    ];
    const newSchedule = buildSchedule(newRotations, [p1, p2]);

    const result = mergeSchedules(existingRotations, newSchedule, 2, [p1, p2]);

    // First two rotations should be from existing (played)
    expect(result.rotations[0]).toBe(existingRotations[0]);
    expect(result.rotations[1]).toBe(existingRotations[1]);

    // Last two rotations should be from new schedule (future)
    expect(result.rotations[2]).toBe(newRotations[2]);
    expect(result.rotations[3]).toBe(newRotations[3]);

    expect(result.rotations).toHaveLength(4);
  });

  it('recalculates player stats across merged rotations', () => {
    const p1 = playerFactory.build({ name: 'A', skillRanking: 3 });
    const p2 = playerFactory.build({ name: 'B', skillRanking: 2 });

    // Played: p1 on field, p2 benched
    const existingRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
      buildRotation(1, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }),
    ];

    // Future: p1 on field, p2 on field (no bench since only 2 players)
    const newRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
      buildRotation(1, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }),
      buildRotation(2, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
      buildRotation(3, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }),
    ];
    const newSchedule = buildSchedule(newRotations, [p1, p2]);

    const result = mergeSchedules(existingRotations, newSchedule, 2, [p1, p2]);

    // Stats should reflect all 4 rotations (2 played + 2 future)
    expect(result.playerStats[p1.id].totalRotations).toBe(4);
    expect(result.playerStats[p2.id].totalRotations).toBe(4);

    // p1: field(0), bench(1), field(2), bench(3) → 2 played, 2 benched
    expect(result.playerStats[p1.id].rotationsPlayed).toBe(2);
    expect(result.playerStats[p1.id].rotationsBenched).toBe(2);
    expect(result.playerStats[p1.id].playPercentage).toBe(50);
  });

  it('recalculates overall stats from merged rotations', () => {
    const p1 = playerFactory.build({ name: 'A', skillRanking: 5 });
    const p2 = playerFactory.build({ name: 'B', skillRanking: 1 });

    const existingRotations = [
      { index: 0, periodIndex: 0, assignments: { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }, teamStrength: 5, violations: [] as string[] },
    ];

    const newRotations = [
      { index: 0, periodIndex: 0, assignments: { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }, teamStrength: 1, violations: [] as string[] },
      { index: 1, periodIndex: 0, assignments: { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }, teamStrength: 5, violations: [] as string[] },
    ];
    const newSchedule = buildSchedule(newRotations, [p1, p2]);

    const result = mergeSchedules(existingRotations, newSchedule, 1, [p1, p2]);

    // Merged: [strength 5, strength 5]
    expect(result.overallStats.minStrength).toBe(5);
    expect(result.overallStats.maxStrength).toBe(5);
    expect(result.overallStats.avgStrength).toBe(5);
    expect(result.overallStats.strengthVariance).toBe(0);
  });

  it('handles startFromRotation at the beginning (returns new schedule as-is)', () => {
    const p1 = playerFactory.build({ name: 'A', skillRanking: 3 });

    const existingRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field }),
      buildRotation(1, { [p1.id]: RotationAssignment.Field }),
    ];

    const newRotations = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field }),
      buildRotation(1, { [p1.id]: RotationAssignment.Field }),
    ];
    const newSchedule = buildSchedule(newRotations, [p1]);

    // startFromRotation=0 shouldn't normally call mergeSchedules (the worker checks),
    // but if it did, it should return only new rotations (0 played sliced)
    const result = mergeSchedules(existingRotations, newSchedule, 0, [p1]);

    expect(result.rotations).toHaveLength(2);
    expect(result.rotations[0]).toBe(newRotations[0]);
    expect(result.rotations[1]).toBe(newRotations[1]);
  });
});

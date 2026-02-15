import { describe, it, expect } from 'vitest';
import {
  calculatePlayerStats,
  computeStrengthStats,
  previewSwap,
  previewSwapRange,
} from './stats.ts';
import { RotationAssignment } from '@/types/domain.ts';
import type { Rotation, Player, RotationSchedule } from '@/types/domain.ts';
import { playerFactory, buildRotation } from '@/test/factories.ts';

describe('calculatePlayerStats', () => {
  it('correctly counts field, bench, and goalie rotations', () => {
    const p1 = playerFactory.build({ name: 'A' });
    const p2 = playerFactory.build({ name: 'B' });
    const rotations: Rotation[] = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
      buildRotation(1, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }),
      buildRotation(2, { [p1.id]: RotationAssignment.Goalie, [p2.id]: RotationAssignment.Field }),
    ];

    const stats = calculatePlayerStats(rotations, [p1, p2]);

    expect(stats[p1.id].rotationsPlayed).toBe(2);
    expect(stats[p1.id].rotationsBenched).toBe(1);
    expect(stats[p1.id].rotationsGoalie).toBe(1);
    expect(stats[p1.id].playPercentage).toBe(67);
    expect(stats[p2.id].rotationsPlayed).toBe(2);
    expect(stats[p2.id].rotationsBenched).toBe(1);
    expect(stats[p2.id].playPercentage).toBe(67);
  });

  it('tracks maximum consecutive bench streak', () => {
    const p1 = playerFactory.build({ name: 'A' });
    const rotations: Rotation[] = [
      buildRotation(0, { [p1.id]: RotationAssignment.Bench }),
      buildRotation(1, { [p1.id]: RotationAssignment.Bench }),
      buildRotation(2, { [p1.id]: RotationAssignment.Field }),
      buildRotation(3, { [p1.id]: RotationAssignment.Bench }),
    ];

    const stats = calculatePlayerStats(rotations, [p1]);

    expect(stats[p1.id].maxConsecutiveBench).toBe(2);
  });
});

describe('computeStrengthStats', () => {
  it('computes avg, variance, min, max for a set of strengths', () => {
    const result = computeStrengthStats([10, 20, 30]);
    expect(result.avg).toBeCloseTo(20);
    expect(result.min).toBe(10);
    expect(result.max).toBe(30);
    expect(result.variance).toBeCloseTo(66.667, 2);
  });

  it('returns zeros for empty array', () => {
    const result = computeStrengthStats([]);
    expect(result.avg).toBe(0);
    expect(result.variance).toBe(0);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
  });

  it('returns zero variance for identical values', () => {
    const result = computeStrengthStats([5, 5, 5]);
    expect(result.avg).toBe(5);
    expect(result.variance).toBe(0);
    expect(result.min).toBe(5);
    expect(result.max).toBe(5);
  });
});

describe('previewSwap', () => {
  it('swaps two players and recalculates stats', () => {
    const p1 = playerFactory.build({ name: 'Strong', skillRanking: 5 });
    const p2 = playerFactory.build({ name: 'Weak', skillRanking: 1 });
    const players: Player[] = [p1, p2];
    const schedule: RotationSchedule = {
      rotations: [
        {
          index: 0,
          periodIndex: 0,
          assignments: {
            [p1.id]: RotationAssignment.Field,
            [p2.id]: RotationAssignment.Bench,
          },
          teamStrength: 5,
          violations: [],
        },
      ],
      playerStats: {
        [p1.id]: {
          playerId: p1.id,
          playerName: 'Strong',
          rotationsPlayed: 1,
          rotationsBenched: 0,
          rotationsGoalie: 0,
          totalRotations: 1,
          playPercentage: 100,
          maxConsecutiveBench: 0,
        },
        [p2.id]: {
          playerId: p2.id,
          playerName: 'Weak',
          rotationsPlayed: 0,
          rotationsBenched: 1,
          rotationsGoalie: 0,
          totalRotations: 1,
          playPercentage: 0,
          maxConsecutiveBench: 1,
        },
      },
      overallStats: {
        strengthVariance: 0,
        minStrength: 5,
        maxStrength: 5,
        avgStrength: 5,
        violations: [],
        isValid: true,
      },
      generatedAt: Date.now(),
    };

    const result = previewSwap(schedule, 0, p1.id, p2.id, players);

    expect(result.rotations[0].assignments[p1.id]).toBe(RotationAssignment.Bench);
    expect(result.rotations[0].assignments[p2.id]).toBe(RotationAssignment.Field);
    expect(result.rotations[0].teamStrength).toBe(1);
  });
});

describe('previewSwapRange', () => {
  it('swaps two players from the given rotation onward', () => {
    const p1 = playerFactory.build({ name: 'A', skillRanking: 5 });
    const p2 = playerFactory.build({ name: 'B', skillRanking: 1 });
    const players = [p1, p2];

    const rotations: Rotation[] = [
      buildRotation(0, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
      buildRotation(1, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
      buildRotation(2, { [p1.id]: RotationAssignment.Bench, [p2.id]: RotationAssignment.Field }),
      buildRotation(3, { [p1.id]: RotationAssignment.Field, [p2.id]: RotationAssignment.Bench }),
    ];

    const schedule: RotationSchedule = {
      rotations,
      playerStats: calculatePlayerStats(rotations, players),
      overallStats: {
        strengthVariance: 0,
        minStrength: 0,
        maxStrength: 0,
        avgStrength: 0,
        violations: [],
        isValid: true,
      },
      generatedAt: Date.now(),
    };

    const result = previewSwapRange(schedule, 1, p1.id, p2.id, players);

    // R0 unchanged
    expect(result.rotations[0].assignments[p1.id]).toBe(RotationAssignment.Field);
    expect(result.rotations[0].assignments[p2.id]).toBe(RotationAssignment.Bench);
    // R1 swapped
    expect(result.rotations[1].assignments[p1.id]).toBe(RotationAssignment.Bench);
    expect(result.rotations[1].assignments[p2.id]).toBe(RotationAssignment.Field);
    // R2 swapped (was B on field, now A on field)
    expect(result.rotations[2].assignments[p1.id]).toBe(RotationAssignment.Field);
    expect(result.rotations[2].assignments[p2.id]).toBe(RotationAssignment.Bench);
    // R3 swapped
    expect(result.rotations[3].assignments[p1.id]).toBe(RotationAssignment.Bench);
    expect(result.rotations[3].assignments[p2.id]).toBe(RotationAssignment.Field);
  });
});

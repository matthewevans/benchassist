import { describe, expect, it } from 'vitest';
import { getHighPlayPercentageOutlierIds } from './playPercentageOutliers.ts';

describe('getHighPlayPercentageOutlierIds', () => {
  it('flags clear high outliers', () => {
    const outliers = getHighPlayPercentageOutlierIds([
      { playerId: 'p1', playPercentage: 50 },
      { playerId: 'p2', playPercentage: 50 },
      { playerId: 'p3', playPercentage: 50 },
      { playerId: 'p4', playPercentage: 50 },
      { playerId: 'p5', playPercentage: 75 },
      { playerId: 'p6', playPercentage: 75 },
    ]);

    expect(outliers).toEqual(new Set(['p5', 'p6']));
  });

  it('does not flag small spread values', () => {
    const outliers = getHighPlayPercentageOutlierIds([
      { playerId: 'p1', playPercentage: 48 },
      { playerId: 'p2', playPercentage: 50 },
      { playerId: 'p3', playPercentage: 52 },
      { playerId: 'p4', playPercentage: 55 },
    ]);

    expect(outliers.size).toBe(0);
  });

  it('requires enough samples', () => {
    const outliers = getHighPlayPercentageOutlierIds([
      { playerId: 'p1', playPercentage: 50 },
      { playerId: 'p2', playPercentage: 80 },
    ]);

    expect(outliers.size).toBe(0);
  });
});

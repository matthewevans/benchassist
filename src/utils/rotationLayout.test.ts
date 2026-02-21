import { describe, expect, it } from 'vitest';
import {
  normalizePeriodDivisions,
  getTotalRotationsFromDivisions,
  getPeriodOffsets,
  getPeriodRange,
  getPeriodForRotation,
  getWithinPeriodRotationIndex,
} from './rotationLayout.ts';

describe('rotation layout utilities', () => {
  it('normalizes period divisions with fallback values', () => {
    expect(normalizePeriodDivisions(undefined, 3, 2)).toEqual([2, 2, 2]);
    expect(normalizePeriodDivisions([1, 0, -2, 4], 3, 2)).toEqual([1, 2, 2]);
  });

  it('computes offsets and period ranges', () => {
    const divisions = [1, 3, 2];
    expect(getTotalRotationsFromDivisions(divisions)).toBe(6);
    expect(getPeriodOffsets(divisions)).toEqual([0, 1, 4]);
    expect(getPeriodRange(divisions, 1)).toEqual({ start: 1, endExclusive: 4 });
  });

  it('maps rotation indices to period and within-period positions', () => {
    const divisions = [2, 1, 3];
    expect(getPeriodForRotation(divisions, 0)).toBe(0);
    expect(getPeriodForRotation(divisions, 1)).toBe(0);
    expect(getPeriodForRotation(divisions, 2)).toBe(1);
    expect(getPeriodForRotation(divisions, 4)).toBe(2);

    expect(getWithinPeriodRotationIndex(divisions, 0)).toBe(0);
    expect(getWithinPeriodRotationIndex(divisions, 1)).toBe(1);
    expect(getWithinPeriodRotationIndex(divisions, 2)).toBe(0);
    expect(getWithinPeriodRotationIndex(divisions, 5)).toBe(2);
  });
});

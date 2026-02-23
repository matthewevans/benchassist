import {
  generateBalancedDivisionCandidates,
  evaluateDivisionCandidate,
  normalizeOptimizationSuggestion,
} from './divisionOptimizer.ts';

describe('generateBalancedDivisionCandidates', () => {
  it('generates candidates for 4 periods starting at [1,1,1,1]', () => {
    const candidates = generateBalancedDivisionCandidates(4, [1, 1, 1, 1]);
    expect(candidates).toEqual([
      [1, 1, 1, 2],
      [1, 1, 2, 1],
      [1, 2, 1, 1],
      [2, 1, 1, 1],
      [1, 1, 2, 2],
      [1, 2, 1, 2],
      [1, 2, 2, 1],
      [2, 1, 1, 2],
      [2, 1, 2, 1],
      [2, 2, 1, 1],
      [1, 2, 2, 2],
      [2, 1, 2, 2],
      [2, 2, 1, 2],
      [2, 2, 2, 1],
      [2, 2, 2, 2],
    ]);
  });

  it('generates candidates for 2 periods starting at [1,1]', () => {
    const candidates = generateBalancedDivisionCandidates(2, [1, 1]);
    expect(candidates).toEqual([
      [1, 2],
      [2, 1],
      [2, 2],
    ]);
  });

  it('returns empty when already at max divisions', () => {
    const candidates = generateBalancedDivisionCandidates(4, [2, 2, 2, 2]);
    expect(candidates).toEqual([]);
  });

  it('respects custom maxPerPeriod', () => {
    const candidates = generateBalancedDivisionCandidates(2, [1, 1], 3);
    expect(candidates).toEqual([
      [1, 2],
      [2, 1],
      [2, 2],
      [2, 3],
      [3, 2],
      [3, 3],
    ]);
  });

  it('handles locked periods for live game — only optimizes future', () => {
    // 4 periods, first 2 locked at [1,1], remaining [1,1]
    const locked = new Set([0, 1]);
    const candidates = generateBalancedDivisionCandidates(4, [1, 1, 1, 1], 2, locked);
    expect(candidates).toEqual([
      [1, 1, 1, 2],
      [1, 1, 2, 1],
      [1, 1, 2, 2],
    ]);
  });

  it('returns empty when locked periods prevent balanced increase', () => {
    // Periods 0,1 locked at 2, periods 2,3 already at 2
    const locked = new Set([0, 1]);
    const candidates = generateBalancedDivisionCandidates(4, [2, 2, 2, 2], 2, locked);
    expect(candidates).toEqual([]);
  });

  it('stops when balanced constraint would be violated', () => {
    // Periods 0,1 locked at 1 — can only go up to 2 on unlocked
    const locked = new Set([0, 1]);
    const candidates = generateBalancedDivisionCandidates(4, [1, 1, 1, 1], 3, locked);
    // [1,1,2,2] is okay (diff=1), [1,1,3,2] is rejected (diff=2)
    expect(candidates).toEqual([
      [1, 1, 1, 2],
      [1, 1, 2, 1],
      [1, 1, 2, 2],
    ]);
  });

  it('handles single period', () => {
    const candidates = generateBalancedDivisionCandidates(1, [1]);
    expect(candidates).toEqual([[2]]);
  });
});

describe('evaluateDivisionCandidate', () => {
  it('evaluates [1,1,1,1] with 13 players, 7v7', () => {
    const result = evaluateDivisionCandidate([1, 1, 1, 1], 13, 7);
    expect(result.maxPlayPercent).toBe(75);
    expect(result.minPlayPercent).toBe(50);
    expect(result.gap).toBe(25);
    expect(result.extraPlayerCount).toBe(2);
  });

  it('evaluates [2,2,2,2] with 13 players, 7v7', () => {
    const result = evaluateDivisionCandidate([2, 2, 2, 2], 13, 7);
    expect(result.maxPlayPercent).toBe(62.5);
    expect(result.minPlayPercent).toBe(50);
    expect(result.gap).toBe(12.5);
    expect(result.extraPlayerCount).toBe(4);
  });

  it('returns zero gap when players exactly fill field (8 players, 8v8)', () => {
    const result = evaluateDivisionCandidate([1, 1, 1, 1], 8, 8);
    expect(result.gap).toBe(0);
    expect(result.maxPlayPercent).toBe(100);
    expect(result.minPlayPercent).toBe(100);
    expect(result.extraPlayerCount).toBe(0);
  });

  it('returns zero gap when bench slots divide evenly', () => {
    // 10 players, 7 field = 3 bench slots. 4 rotations * 3 = 12 bench slots.
    // 12 / 10 = 1.2 → perPlayer=1, remainder=2. Not evenly divisible.
    // Let's use: 9 players, 6 field = 3 bench slots. 3 rotations * 3 = 9 bench slots.
    // 9 / 9 = 1. remainder = 0. Gap = 0.
    const result = evaluateDivisionCandidate([1, 1, 1], 9, 6);
    expect(result.gap).toBe(0);
    expect(result.extraPlayerCount).toBe(0);
  });

  it('evaluates intermediate candidate [2,1,1,1] with 13 players, 7v7', () => {
    const result = evaluateDivisionCandidate([2, 1, 1, 1], 13, 7);
    // 5 rotations, 6 bench per rotation = 30 total bench
    // 30 / 13 = 2 remainder 4 → 4 players bench 3, 9 bench 2
    // max play = (1 - 2/5) * 100 = 60%
    // min play = (1 - 3/5) * 100 = 40%
    expect(result.maxPlayPercent).toBe(60);
    expect(result.minPlayPercent).toBe(40);
    expect(result.gap).toBe(20);
    expect(result.extraPlayerCount).toBe(9);
  });

  it('handles fewer players than field size gracefully', () => {
    const result = evaluateDivisionCandidate([1, 1], 5, 7);
    expect(result.gap).toBe(0);
    expect(result.maxPlayPercent).toBe(100);
  });
});

describe('normalizeOptimizationSuggestion', () => {
  it('converts legacy single-option payloads', () => {
    const normalized = normalizeOptimizationSuggestion(
      {
        suggestedDivisions: [2, 1, 1, 1],
        currentGap: 25,
        currentMaxPercent: 75,
        suggestedGap: 20,
        currentExtraCount: 2,
        suggestedExtraCount: 9,
        suggestedMaxPercent: 60,
        suggestedMinPercent: 40,
      },
      [1, 1, 1, 1],
    );

    expect(normalized).toEqual({
      currentGap: 25,
      currentMaxPercent: 75,
      currentMinPercent: 50,
      currentExtraCount: 2,
      currentTotalRotations: 4,
      options: [
        {
          periodDivisions: [2, 1, 1, 1],
          totalRotations: 5,
          addedRotations: 1,
          periodsChanged: 1,
          expectedGap: 20,
          expectedMaxPercent: 60,
          expectedMinPercent: 40,
          expectedExtraCount: 9,
          gapImprovement: 5,
        },
      ],
    });
  });

  it('sorts modern options by least change first', () => {
    const normalized = normalizeOptimizationSuggestion({
      currentGap: 25,
      currentMaxPercent: 75,
      currentMinPercent: 50,
      currentExtraCount: 2,
      currentTotalRotations: 4,
      options: [
        {
          periodDivisions: [2, 2, 2, 2],
          totalRotations: 8,
          addedRotations: 4,
          periodsChanged: 4,
          expectedGap: 12.5,
          expectedMaxPercent: 62.5,
          expectedMinPercent: 50,
          expectedExtraCount: 4,
          gapImprovement: 12.5,
        },
        {
          periodDivisions: [2, 1, 1, 1],
          totalRotations: 5,
          addedRotations: 1,
          periodsChanged: 1,
          expectedGap: 20,
          expectedMaxPercent: 60,
          expectedMinPercent: 40,
          expectedExtraCount: 9,
          gapImprovement: 5,
        },
      ],
    });

    expect(normalized?.options[0].periodDivisions).toEqual([2, 1, 1, 1]);
    expect(normalized?.options[1].periodDivisions).toEqual([2, 2, 2, 2]);
  });
});

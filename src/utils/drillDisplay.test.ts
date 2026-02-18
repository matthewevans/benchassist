import { getPhaseColor, getIntensityDisplay, getPhaseBadgeColor } from '@/utils/drillDisplay.ts';

describe('getPhaseColor', () => {
  it('returns amber classes for warm-up', () => {
    expect(getPhaseColor('warm-up')).toBe('border-l-amber-400');
  });

  it('returns blue classes for main', () => {
    expect(getPhaseColor('main')).toBe('border-l-blue-400');
  });

  it('returns emerald classes for scrimmage', () => {
    expect(getPhaseColor('scrimmage')).toBe('border-l-emerald-400');
  });

  it('returns slate classes for cool-down', () => {
    expect(getPhaseColor('cool-down')).toBe('border-l-slate-400');
  });
});

describe('getPhaseBadgeColor', () => {
  it('returns amber bg classes for warm-up', () => {
    expect(getPhaseBadgeColor('warm-up')).toContain('bg-amber-100');
    expect(getPhaseBadgeColor('warm-up')).toContain('text-amber-800');
  });

  it('returns blue bg classes for main', () => {
    expect(getPhaseBadgeColor('main')).toContain('bg-blue-100');
  });

  it('returns emerald bg classes for scrimmage', () => {
    expect(getPhaseBadgeColor('scrimmage')).toContain('bg-emerald-100');
  });

  it('returns slate bg classes for cool-down', () => {
    expect(getPhaseBadgeColor('cool-down')).toContain('bg-slate-100');
  });
});

describe('getIntensityDisplay', () => {
  it('returns 1 filled dot and green color for low', () => {
    const result = getIntensityDisplay('low');
    expect(result.filled).toBe(1);
    expect(result.label).toBe('Low');
    expect(result.colorClass).toContain('green');
  });

  it('returns 2 filled dots and amber color for medium', () => {
    const result = getIntensityDisplay('medium');
    expect(result.filled).toBe(2);
    expect(result.label).toBe('Med');
    expect(result.colorClass).toContain('amber');
  });

  it('returns 3 filled dots and red color for high', () => {
    const result = getIntensityDisplay('high');
    expect(result.filled).toBe(3);
    expect(result.label).toBe('High');
    expect(result.colorClass).toContain('red');
  });
});

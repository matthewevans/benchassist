import { getPhaseColor, getIntensityDisplay, EQUIPMENT_ICON_NAMES } from '@/utils/drillDisplay.ts';

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

describe('EQUIPMENT_ICON_NAMES', () => {
  it('returns known icon names for standard equipment', () => {
    expect(EQUIPMENT_ICON_NAMES['balls']).toBe('Circle');
    expect(EQUIPMENT_ICON_NAMES['cones']).toBe('Triangle');
    expect(EQUIPMENT_ICON_NAMES['pinnies']).toBe('Shirt');
    expect(EQUIPMENT_ICON_NAMES['goals']).toBe('RectangleHorizontal');
    expect(EQUIPMENT_ICON_NAMES['gloves']).toBe('Hand');
    expect(EQUIPMENT_ICON_NAMES['agility ladder']).toBe('Fence');
  });

  it('returns undefined for unknown equipment', () => {
    expect(EQUIPMENT_ICON_NAMES['unknown-item']).toBeUndefined();
  });
});

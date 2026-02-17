import { describe, it, expect } from 'vitest';
import { getUAge, getDrillBracket, birthYearToDisplay, DRILL_BRACKETS } from '@/utils/age.ts';

describe('getUAge', () => {
  it('returns current year minus birth year', () => {
    const currentYear = new Date().getFullYear();
    expect(getUAge(currentYear - 9)).toBe(9);
    expect(getUAge(currentYear - 6)).toBe(6);
  });
});

describe('getDrillBracket', () => {
  const currentYear = new Date().getFullYear();

  it('maps age 5-6 to U6', () => {
    expect(getDrillBracket(currentYear - 5)).toBe('U6');
    expect(getDrillBracket(currentYear - 6)).toBe('U6');
  });

  it('maps age 7-8 to U8', () => {
    expect(getDrillBracket(currentYear - 7)).toBe('U8');
    expect(getDrillBracket(currentYear - 8)).toBe('U8');
  });

  it('maps age 9-10 to U10', () => {
    expect(getDrillBracket(currentYear - 9)).toBe('U10');
    expect(getDrillBracket(currentYear - 10)).toBe('U10');
  });

  it('maps age 11-12 to U12', () => {
    expect(getDrillBracket(currentYear - 11)).toBe('U12');
    expect(getDrillBracket(currentYear - 12)).toBe('U12');
  });

  it('maps age 13-14 to U14', () => {
    expect(getDrillBracket(currentYear - 13)).toBe('U14');
    expect(getDrillBracket(currentYear - 14)).toBe('U14');
  });

  it('maps age 15-16 to U16', () => {
    expect(getDrillBracket(currentYear - 15)).toBe('U16');
    expect(getDrillBracket(currentYear - 16)).toBe('U16');
  });

  it('maps age 17+ to U18', () => {
    expect(getDrillBracket(currentYear - 17)).toBe('U18');
    expect(getDrillBracket(currentYear - 19)).toBe('U18');
  });

  it('maps age 4 or less to U6', () => {
    expect(getDrillBracket(currentYear - 4)).toBe('U6');
  });
});

describe('birthYearToDisplay', () => {
  it('returns formatted string with birth year and U-age', () => {
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 9;
    expect(birthYearToDisplay(birthYear)).toBe(`${birthYear} (U9)`);
  });
});

describe('DRILL_BRACKETS', () => {
  it('has all expected brackets', () => {
    expect(DRILL_BRACKETS).toEqual(['U6', 'U8', 'U10', 'U12', 'U14', 'U16', 'U18']);
  });
});

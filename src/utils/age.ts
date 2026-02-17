export type DrillAgeGroup = 'U6' | 'U8' | 'U10' | 'U12' | 'U14' | 'U16' | 'U18';

export const DRILL_BRACKETS: DrillAgeGroup[] = ['U6', 'U8', 'U10', 'U12', 'U14', 'U16', 'U18'];

export const DRILL_BRACKET_LABELS: Record<DrillAgeGroup, string> = {
  U6: 'U6 (5-6)',
  U8: 'U8 (7-8)',
  U10: 'U10 (9-10)',
  U12: 'U12 (11-12)',
  U14: 'U14 (13-14)',
  U16: 'U16 (15-16)',
  U18: 'U18 (17-18)',
};

export function getUAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

export function getDrillBracket(birthYear: number): DrillAgeGroup {
  const age = getUAge(birthYear);
  if (age <= 6) return 'U6';
  if (age <= 8) return 'U8';
  if (age <= 10) return 'U10';
  if (age <= 12) return 'U12';
  if (age <= 14) return 'U14';
  if (age <= 16) return 'U16';
  return 'U18';
}

export function birthYearToDisplay(birthYear: number): string {
  const uAge = getUAge(birthYear);
  return `${birthYear} (U${uAge})`;
}

export function uAgeToBirthYear(uAge: number): number {
  return new Date().getFullYear() - uAge;
}

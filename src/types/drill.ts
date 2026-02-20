import type { DrillAgeGroup } from '@/utils/age.ts';

export type DrillId = string;

/** A string that may have per-locale translations. Falls back to `en` if the current locale is missing. */
export interface LocalizedString {
  en: string;
  'es-MX'?: string;
}

/** Returns the localized value for the given locale, falling back to English. */
export function getLocalized(field: LocalizedString, locale: string): string {
  const val = (field as unknown as Record<string, string>)[locale];
  if (val !== undefined) return val;
  return field.en;
}

export type DrillCategory =
  | 'passing'
  | 'dribbling'
  | 'shooting'
  | 'first-touch'
  | 'goalkeeping'
  | 'attacking'
  | 'defending'
  | 'possession'
  | 'transition'
  | 'set-pieces';

export const DRILL_CATEGORY_LABELS: Record<DrillCategory, string> = {
  passing: 'Passing',
  dribbling: 'Dribbling',
  shooting: 'Shooting',
  'first-touch': 'First Touch',
  goalkeeping: 'Goalkeeping',
  attacking: 'Attacking',
  defending: 'Defending',
  possession: 'Possession',
  transition: 'Transition',
  'set-pieces': 'Set Pieces',
};

export const YOUNG_CATEGORIES: DrillCategory[] = [
  'passing',
  'dribbling',
  'shooting',
  'first-touch',
  'goalkeeping',
];

export const ALL_CATEGORIES: DrillCategory[] = [
  ...YOUNG_CATEGORIES,
  'attacking',
  'defending',
  'possession',
  'transition',
  'set-pieces',
];

export type DrillPhase = 'warm-up' | 'main' | 'scrimmage' | 'cool-down';

export const DRILL_PHASE_LABELS: Record<DrillPhase, string> = {
  'warm-up': 'Warm-up',
  main: 'Main',
  scrimmage: 'Scrimmage',
  'cool-down': 'Cool-down',
};

export interface Drill {
  id: DrillId;
  name: LocalizedString;
  description: LocalizedString;
  setup: LocalizedString;
  coachingTips: LocalizedString[];
  variations?: LocalizedString[];
  category: DrillCategory;
  phase: DrillPhase;
  ageGroups: DrillAgeGroup[];
  minPlayers: number;
  durationMinutes: number;
  intensity: 'low' | 'medium' | 'high';
  equipment: string[];
  diagram?: string;
}

export interface DrillProgression {
  id: string;
  name: string;
  drillIds: DrillId[];
}

export interface TrainingFocusTemplate {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  ageGroups: DrillAgeGroup[];
  slots: {
    phase: DrillPhase;
    preferredCategories: DrillCategory[];
    count: number;
  }[];
}

export interface PracticePlan {
  drills: Drill[];
  totalDurationMinutes: number;
}

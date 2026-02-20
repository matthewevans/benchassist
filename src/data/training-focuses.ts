import type { TrainingFocusTemplate } from '@/types/drill.ts';
import type { DrillAgeGroup } from '@/utils/age.ts';

const ALL_BRACKETS: DrillAgeGroup[] = ['U6', 'U8', 'U10', 'U12', 'U14', 'U16', 'U18'];

const OLDER_BRACKETS: DrillAgeGroup[] = ['U12', 'U14', 'U16', 'U18'];

export const TRAINING_FOCUSES: TrainingFocusTemplate[] = [
  {
    id: 'focus-passing-day',
    name: { en: 'Passing Day' },
    description: {
      en: 'A session focused on passing technique, combination play, and moving the ball accurately under varying levels of pressure.',
    },
    ageGroups: ALL_BRACKETS,
    slots: [
      { phase: 'warm-up', preferredCategories: ['passing', 'first-touch'], count: 1 },
      { phase: 'main', preferredCategories: ['passing'], count: 2 },
      { phase: 'main', preferredCategories: ['possession', 'passing'], count: 1 },
      { phase: 'scrimmage', preferredCategories: ['passing', 'possession'], count: 1 },
      { phase: 'cool-down', preferredCategories: ['passing', 'first-touch'], count: 1 },
    ],
  },

  {
    id: 'focus-dribbling-day',
    name: { en: 'Dribbling Day' },
    description: {
      en: 'A session centered on ball mastery, close control, dribbling moves, and 1v1 situations. Players will develop confidence on the ball.',
    },
    ageGroups: ALL_BRACKETS,
    slots: [
      { phase: 'warm-up', preferredCategories: ['dribbling', 'first-touch'], count: 1 },
      { phase: 'main', preferredCategories: ['dribbling'], count: 2 },
      { phase: 'main', preferredCategories: ['first-touch', 'dribbling'], count: 1 },
      { phase: 'scrimmage', preferredCategories: ['dribbling', 'attacking'], count: 1 },
      { phase: 'cool-down', preferredCategories: ['first-touch', 'dribbling'], count: 1 },
    ],
  },

  {
    id: 'focus-shooting-day',
    name: { en: 'Shooting Day' },
    description: {
      en: 'A session dedicated to finishing: shooting technique from various positions, volleys, turning and shooting, and scoring in game-like situations.',
    },
    ageGroups: ALL_BRACKETS,
    slots: [
      { phase: 'warm-up', preferredCategories: ['passing', 'dribbling'], count: 1 },
      { phase: 'main', preferredCategories: ['shooting'], count: 2 },
      { phase: 'main', preferredCategories: ['attacking', 'shooting'], count: 1 },
      { phase: 'scrimmage', preferredCategories: ['attacking', 'shooting'], count: 1 },
      { phase: 'cool-down', preferredCategories: ['first-touch', 'passing'], count: 1 },
    ],
  },

  {
    id: 'focus-defense-day',
    name: { en: 'Defense Day' },
    description: {
      en: 'A session focused on individual defending (jockeying, tackling), defensive shape, and organized pressing as a team.',
    },
    ageGroups: OLDER_BRACKETS,
    slots: [
      { phase: 'warm-up', preferredCategories: ['passing', 'first-touch'], count: 1 },
      { phase: 'main', preferredCategories: ['defending'], count: 2 },
      { phase: 'main', preferredCategories: ['transition', 'defending'], count: 1 },
      { phase: 'scrimmage', preferredCategories: ['defending', 'transition'], count: 1 },
      { phase: 'cool-down', preferredCategories: ['passing'], count: 1 },
    ],
  },

  {
    id: 'focus-possession-day',
    name: { en: 'Possession Day' },
    description: {
      en: 'A session that develops the ability to keep the ball as a team through rondos, positional play, and zonal possession games.',
    },
    ageGroups: OLDER_BRACKETS,
    slots: [
      { phase: 'warm-up', preferredCategories: ['passing', 'first-touch'], count: 1 },
      { phase: 'main', preferredCategories: ['possession'], count: 2 },
      { phase: 'main', preferredCategories: ['passing', 'possession'], count: 1 },
      { phase: 'scrimmage', preferredCategories: ['possession', 'transition'], count: 1 },
      { phase: 'cool-down', preferredCategories: ['first-touch'], count: 1 },
    ],
  },

  {
    id: 'focus-match-prep',
    name: { en: 'Match Prep' },
    description: {
      en: 'A pre-match session that combines set-piece rehearsal, tactical walk-throughs, and a conditioned scrimmage to prepare for an upcoming game.',
    },
    ageGroups: OLDER_BRACKETS,
    slots: [
      { phase: 'warm-up', preferredCategories: ['passing', 'dribbling'], count: 1 },
      { phase: 'main', preferredCategories: ['set-pieces'], count: 1 },
      { phase: 'main', preferredCategories: ['attacking', 'defending'], count: 1 },
      { phase: 'scrimmage', preferredCategories: ['attacking', 'transition'], count: 1 },
      { phase: 'cool-down', preferredCategories: ['passing'], count: 1 },
    ],
  },

  {
    id: 'focus-fitness-and-fun',
    name: { en: 'Fitness & Fun' },
    description: {
      en: 'A high-energy session that combines fitness-oriented drills with fun games and competitions. Keeps players engaged while building endurance and agility.',
    },
    ageGroups: ALL_BRACKETS,
    slots: [
      { phase: 'warm-up', preferredCategories: ['dribbling', 'first-touch'], count: 1 },
      { phase: 'main', preferredCategories: ['dribbling', 'shooting'], count: 1 },
      { phase: 'main', preferredCategories: ['attacking', 'dribbling'], count: 1 },
      { phase: 'scrimmage', preferredCategories: ['attacking', 'transition'], count: 1 },
      { phase: 'cool-down', preferredCategories: ['first-touch', 'passing'], count: 1 },
    ],
  },
];

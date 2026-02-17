import { describe, it, expect } from 'vitest';
import { generatePracticePlan } from '@/utils/practiceGenerator.ts';
import type { Drill, DrillCategory } from '@/types/drill.ts';
import type { DrillAgeGroup } from '@/utils/age.ts';

// ---------------------------------------------------------------------------
// Mock drill library (~18 drills covering all phases, categories, ages, etc.)
// ---------------------------------------------------------------------------
const MOCK_DRILLS: Drill[] = [
  // ── Warm-ups (3) ────────────────────────────────────────────────────────
  {
    id: 'wu-1',
    name: 'Passing Warm-up',
    description: 'Two-touch passing in a circle.',
    setup: 'Players in a circle, 1 ball.',
    coachingTips: ['Keep head up', 'Soft touch'],
    category: 'passing',
    phase: 'warm-up',
    ageGroups: ['U6', 'U8', 'U10', 'U12', 'U14'],
    minPlayers: 4,
    durationMinutes: 5,
    intensity: 'low',
    equipment: ['cones', 'balls'],
  },
  {
    id: 'wu-2',
    name: 'Dribbling Warm-up',
    description: 'Dribble through a cone maze.',
    setup: 'Cones scattered in a 20x20 grid.',
    coachingTips: ['Use both feet'],
    category: 'dribbling',
    phase: 'warm-up',
    ageGroups: ['U6', 'U8', 'U10', 'U12'],
    minPlayers: 2,
    durationMinutes: 5,
    intensity: 'low',
    equipment: ['cones', 'balls'],
  },
  {
    id: 'wu-3',
    name: 'Dynamic Stretching',
    description: 'Leg swings, high knees, butt kicks.',
    setup: 'Line up on the sideline.',
    coachingTips: ['Controlled movements'],
    category: 'passing',
    phase: 'warm-up',
    ageGroups: ['U10', 'U12', 'U14'],
    minPlayers: 2,
    durationMinutes: 8,
    intensity: 'low',
    equipment: [],
  },

  // ── Main drills (10) ───────────────────────────────────────────────────
  {
    id: 'main-pass-1',
    name: 'Triangle Passing',
    description: '3-player triangle, 1-2 touch passing.',
    setup: 'Cones in triangle, 10 yard sides.',
    coachingTips: ['Weight of pass', 'Open body shape'],
    category: 'passing',
    phase: 'main',
    ageGroups: ['U8', 'U10', 'U12', 'U14'],
    minPlayers: 3,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },
  {
    id: 'main-pass-2',
    name: 'Long Ball Pairs',
    description: 'Partners 30 yards apart, driven passes.',
    setup: 'Pairs with 1 ball each.',
    coachingTips: ['Lock ankle', 'Follow through'],
    category: 'passing',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14'],
    minPlayers: 2,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['balls'],
  },
  {
    id: 'main-pass-3',
    name: 'Rondo 4v1',
    description: '4 players keep possession against 1 defender.',
    setup: 'Small grid, 4v1.',
    coachingTips: ['Quick decisions', 'Move after passing'],
    category: 'passing',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14'],
    minPlayers: 5,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'bibs'],
  },
  {
    id: 'main-drib-1',
    name: '1v1 to Goal',
    description: 'Attacker vs defender in a channel.',
    setup: '10x20 channel with mini goals.',
    coachingTips: ['Change of pace', 'Commit the defender'],
    category: 'dribbling',
    phase: 'main',
    ageGroups: ['U6', 'U8', 'U10', 'U12', 'U14'],
    minPlayers: 2,
    durationMinutes: 10,
    intensity: 'high',
    equipment: ['cones', 'balls', 'mini goals'],
  },
  {
    id: 'main-drib-2',
    name: 'Cone Slalom Relay',
    description: 'Relay race dribbling through cones.',
    setup: 'Lines of cones, 2 teams.',
    coachingTips: ['Close control', 'Accelerate between cones'],
    category: 'dribbling',
    phase: 'main',
    ageGroups: ['U6', 'U8', 'U10'],
    minPlayers: 4,
    durationMinutes: 8,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },
  {
    id: 'main-shoot-1',
    name: 'Finishing from Crosses',
    description: 'Wide player crosses, attacker finishes.',
    setup: 'Full goal with GK, wide feeders.',
    coachingTips: ['Time the run', 'Hit the target'],
    category: 'shooting',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14'],
    minPlayers: 6,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['balls', 'goals'],
  },
  {
    id: 'main-shoot-2',
    name: 'Shooting Drill - Turn & Shoot',
    description: 'Receive, turn, and shoot at goal.',
    setup: 'Outside the 18-yard box, single line.',
    coachingTips: ['First touch away from pressure', 'Shoot early'],
    category: 'shooting',
    phase: 'main',
    ageGroups: ['U8', 'U10', 'U12', 'U14'],
    minPlayers: 4,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['balls', 'goals'],
  },
  {
    id: 'main-ft-1',
    name: 'Wall Pass First Touch',
    description: 'Receive from a rebounder and control.',
    setup: 'Rebounder board, line of players.',
    coachingTips: ['Cushion the ball', 'Get body behind it'],
    category: 'first-touch',
    phase: 'main',
    ageGroups: ['U8', 'U10', 'U12'],
    minPlayers: 2,
    durationMinutes: 10,
    intensity: 'low',
    equipment: ['rebounder', 'balls'],
  },
  {
    id: 'main-atk-1',
    name: '3v2 Attacking Overload',
    description: '3 attackers vs 2 defenders.',
    setup: 'Half-field setup, real goals.',
    coachingTips: ['Width and depth', 'Quick combinations'],
    category: 'attacking',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14'],
    minPlayers: 7,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'bibs', 'goals'],
  },
  {
    id: 'main-drib-3',
    name: 'U6 Dribble Tag',
    description: 'Players dribble while avoiding taggers.',
    setup: '15x15 grid.',
    coachingTips: ['Keep ball close', 'Use body to shield'],
    category: 'dribbling',
    phase: 'main',
    ageGroups: ['U6'],
    minPlayers: 4,
    durationMinutes: 8,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  // ── Scrimmages (2) ─────────────────────────────────────────────────────
  {
    id: 'scrim-1',
    name: 'Small-Sided Scrimmage 4v4',
    description: 'Mini-match 4v4 with small goals.',
    setup: '30x20 field, 4 mini goals.',
    coachingTips: ['Encourage passing combinations'],
    category: 'passing',
    phase: 'scrimmage',
    ageGroups: ['U8', 'U10', 'U12', 'U14'],
    minPlayers: 8,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'bibs', 'mini goals'],
  },
  {
    id: 'scrim-2',
    name: 'Full Scrimmage',
    description: 'Match conditions, focus on shape.',
    setup: 'Full field or large grid.',
    coachingTips: ['Play positions', 'Communicate'],
    category: 'attacking',
    phase: 'scrimmage',
    ageGroups: ['U10', 'U12', 'U14'],
    minPlayers: 10,
    durationMinutes: 20,
    intensity: 'high',
    equipment: ['goals', 'bibs', 'balls'],
  },
  {
    id: 'scrim-3',
    name: '3v3 Mini Games',
    description: 'Quick 3v3 games with rotation.',
    setup: '20x15 grids, mini goals.',
    coachingTips: ['Move after passing', 'Defend as a unit'],
    category: 'dribbling',
    phase: 'scrimmage',
    ageGroups: ['U6', 'U8', 'U10'],
    minPlayers: 6,
    durationMinutes: 10,
    intensity: 'high',
    equipment: ['cones', 'mini goals', 'bibs'],
  },

  // ── Cool-downs (3) ─────────────────────────────────────────────────────
  {
    id: 'cd-1',
    name: 'Passing Cool-down',
    description: 'Easy-paced passing in pairs.',
    setup: 'Pairs, 5 yards apart.',
    coachingTips: ['Relax', 'Good technique at low pace'],
    category: 'passing',
    phase: 'cool-down',
    ageGroups: ['U6', 'U8', 'U10', 'U12', 'U14'],
    minPlayers: 2,
    durationMinutes: 5,
    intensity: 'low',
    equipment: ['balls'],
  },
  {
    id: 'cd-2',
    name: 'Stretch Circle',
    description: 'Static stretching in a circle.',
    setup: 'Players in a circle.',
    coachingTips: ['Hold each stretch 15-20 seconds'],
    category: 'passing',
    phase: 'cool-down',
    ageGroups: ['U6', 'U8', 'U10', 'U12', 'U14'],
    minPlayers: 2,
    durationMinutes: 5,
    intensity: 'low',
    equipment: [],
  },
  {
    id: 'cd-3',
    name: 'Juggling Challenge',
    description: 'Individual juggling, count personal bests.',
    setup: '1 ball per player.',
    coachingTips: ['Use both feet', 'Stay relaxed'],
    category: 'first-touch',
    phase: 'cool-down',
    ageGroups: ['U10', 'U12', 'U14'],
    minPlayers: 2,
    durationMinutes: 5,
    intensity: 'low',
    equipment: ['balls'],
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function makePlan(
  overrides: {
    ageGroup?: DrillAgeGroup;
    playerCount?: number;
    categories?: DrillCategory[];
    targetDurationMinutes?: number;
    favoritesOnly?: boolean;
    favoriteIds?: string[];
    seed?: number;
  } = {},
) {
  return generatePracticePlan({
    drills: MOCK_DRILLS,
    ageGroup: overrides.ageGroup ?? 'U10',
    playerCount: overrides.playerCount ?? 10,
    categories: overrides.categories ?? ['passing'],
    targetDurationMinutes: overrides.targetDurationMinutes ?? 60,
    favoritesOnly: overrides.favoritesOnly ?? false,
    favoriteIds: overrides.favoriteIds ?? [],
    seed: overrides.seed ?? 42,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('generatePracticePlan', () => {
  it('returns a plan with drills matching the selected categories', () => {
    const plan = makePlan({ categories: ['passing'] });
    expect(plan.drills.length).toBeGreaterThanOrEqual(3);
    const mainDrills = plan.drills.filter((d) => d.phase === 'main');
    mainDrills.forEach((d) => expect(d.category).toBe('passing'));
  });

  it('filters by player count', () => {
    const plan = makePlan({ playerCount: 4, categories: ['passing', 'dribbling'] });
    plan.drills.forEach((d) => expect(d.minPlayers).toBeLessThanOrEqual(4));
  });

  it('filters by age group', () => {
    const plan = makePlan({ ageGroup: 'U6', categories: ['dribbling'] });
    plan.drills.forEach((d) => expect(d.ageGroups).toContain('U6'));
  });

  it('respects target duration roughly (within +/-15 min)', () => {
    const plan = makePlan({ categories: ['passing', 'shooting'], targetDurationMinutes: 60 });
    expect(plan.totalDurationMinutes).toBeGreaterThanOrEqual(45);
    expect(plan.totalDurationMinutes).toBeLessThanOrEqual(75);
  });

  it('includes warm-up, main, and cool-down phases', () => {
    const plan = makePlan();
    const phases = new Set(plan.drills.map((d) => d.phase));
    expect(phases.has('warm-up')).toBe(true);
    expect(phases.has('main')).toBe(true);
    expect(phases.has('cool-down')).toBe(true);
  });

  it('returns same plan for same seed', () => {
    const plan1 = makePlan({ seed: 42 });
    const plan2 = makePlan({ seed: 42 });
    expect(plan1.drills.map((d) => d.id)).toEqual(plan2.drills.map((d) => d.id));
  });

  it('returns different plan for different seed', () => {
    const plan1 = makePlan({ seed: 1, categories: ['passing', 'dribbling'] });
    const plan2 = makePlan({ seed: 2, categories: ['passing', 'dribbling'] });
    expect(plan1.drills.map((d) => d.id)).not.toEqual(plan2.drills.map((d) => d.id));
  });

  it('filters to favorites only when enabled', () => {
    const favIds = MOCK_DRILLS.filter((d) => d.phase === 'main')
      .slice(0, 3)
      .map((d) => d.id);
    const plan = makePlan({
      categories: ['passing', 'dribbling', 'shooting'],
      favoritesOnly: true,
      favoriteIds: favIds,
    });
    const mainDrills = plan.drills.filter((d) => d.phase === 'main');
    mainDrills.forEach((d) => expect(favIds).toContain(d.id));
  });

  it('returns empty plan when no drills match', () => {
    const plan = generatePracticePlan({
      drills: [],
      ageGroup: 'U10',
      playerCount: 10,
      categories: ['passing'],
      targetDurationMinutes: 60,
      favoritesOnly: false,
      favoriteIds: [],
      seed: 42,
    });
    expect(plan.drills).toEqual([]);
    expect(plan.totalDurationMinutes).toBe(0);
  });

  it('includes scrimmage when player count is sufficient', () => {
    const plan = makePlan({ playerCount: 10, categories: ['passing'] });
    const scrimmages = plan.drills.filter((d) => d.phase === 'scrimmage');
    expect(scrimmages.length).toBeGreaterThanOrEqual(1);
  });

  it('omits scrimmage when player count is too low', () => {
    const plan = makePlan({ playerCount: 4, categories: ['passing', 'dribbling'] });
    const scrimmages = plan.drills.filter((d) => d.phase === 'scrimmage');
    expect(scrimmages.length).toBe(0);
  });

  it('orders phases correctly: warm-up before main before scrimmage before cool-down', () => {
    const plan = makePlan({ categories: ['passing', 'dribbling'], playerCount: 10 });
    const phaseOrder: Record<string, number> = {
      'warm-up': 0,
      main: 1,
      scrimmage: 2,
      'cool-down': 3,
    };
    for (let i = 1; i < plan.drills.length; i++) {
      const prevOrder = phaseOrder[plan.drills[i - 1].phase];
      const currOrder = phaseOrder[plan.drills[i].phase];
      expect(currOrder).toBeGreaterThanOrEqual(prevOrder);
    }
  });

  it('totalDurationMinutes equals the sum of all drill durations', () => {
    const plan = makePlan({ categories: ['passing', 'shooting'] });
    const sum = plan.drills.reduce((acc, d) => acc + d.durationMinutes, 0);
    expect(plan.totalDurationMinutes).toBe(sum);
  });
});

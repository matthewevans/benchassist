import type { DrillAgeGroup } from '@/utils/age.ts';
import type { Drill, DrillCategory, DrillPhase, PracticePlan } from '@/types/drill.ts';

export interface PracticeGeneratorOptions {
  drills: Drill[];
  ageGroup: DrillAgeGroup;
  playerCount: number;
  categories: DrillCategory[];
  targetDurationMinutes: number;
  favoritesOnly: boolean;
  favoriteIds: string[];
  seed: number;
}

// Mulberry32 seeded PRNG
function createRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generatePracticePlan(opts: PracticeGeneratorOptions): PracticePlan {
  const {
    ageGroup,
    playerCount,
    categories,
    targetDurationMinutes,
    favoritesOnly,
    favoriteIds,
    seed,
  } = opts;
  const rng = createRng(seed);

  // Filter to eligible drills
  const eligible = opts.drills.filter((d) => {
    if (!d.ageGroups.includes(ageGroup)) return false;
    if (d.minPlayers > playerCount) return false;
    if (favoritesOnly && !favoriteIds.includes(d.id)) return false;
    return true;
  });

  const byPhase = (phase: DrillPhase, cats?: DrillCategory[]) =>
    eligible.filter(
      (d) => d.phase === phase && (!cats || cats.length === 0 || cats.includes(d.category)),
    );

  // Pick warm-up (1, prefer selected categories, fall back to any)
  let warmUps = byPhase('warm-up', categories);
  if (warmUps.length === 0) warmUps = byPhase('warm-up');
  const warmUp = shuffle(warmUps, rng).slice(0, 1);

  // Pick cool-down (1, any category)
  const coolDown = shuffle(byPhase('cool-down'), rng).slice(0, 1);

  // Pick scrimmage (1 if >= 6 players)
  let scrimmages = byPhase('scrimmage', categories);
  if (scrimmages.length === 0) scrimmages = byPhase('scrimmage');
  const scrimmage = playerCount >= 6 ? shuffle(scrimmages, rng).slice(0, 1) : [];

  // Calculate remaining time budget for main drills
  const fixedDuration = [...warmUp, ...coolDown, ...scrimmage].reduce(
    (sum, d) => sum + d.durationMinutes,
    0,
  );
  const mainBudget = Math.max(targetDurationMinutes - fixedDuration, 10);

  // Fill main drills to match budget
  const mainCandidates = shuffle(byPhase('main', categories), rng);
  const mainDrills: Drill[] = [];
  let mainTotal = 0;
  for (const drill of mainCandidates) {
    if (mainTotal + drill.durationMinutes > mainBudget + 5) continue;
    mainDrills.push(drill);
    mainTotal += drill.durationMinutes;
    if (mainTotal >= mainBudget - 5) break;
  }

  const allDrills = [...warmUp, ...mainDrills, ...scrimmage, ...coolDown];
  return {
    drills: allDrills,
    totalDurationMinutes: allDrills.reduce((sum, d) => sum + d.durationMinutes, 0),
  };
}

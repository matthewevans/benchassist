import { useState, useMemo, useRef, useEffect } from 'react';
import { DRILLS } from '@/data/drills.ts';
import { getDrillBracket, uAgeToBirthYear } from '@/utils/age.ts';
import { generatePracticePlan } from '@/utils/practiceGenerator.ts';
import { YOUNG_CATEGORIES, ALL_CATEGORIES } from '@/types/drill.ts';
import type { DrillCategory, Drill, DrillPhase } from '@/types/drill.ts';
import type { DrillAgeGroup } from '@/utils/age.ts';

const SESSION_KEY = 'practice_plan_state';
export const PHASE_ORDER: DrillPhase[] = ['warm-up', 'main', 'scrimmage', 'cool-down'];

interface PersistentPlanState {
  birthYear: number | null;
  playerCount: number;
  selectedCategories: DrillCategory[];
  targetDuration: number;
  favoritesOnly: boolean;
  seed: number;
}

function loadPlanState(): Partial<PersistentPlanState> {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Partial<PersistentPlanState>;
  } catch {
    return {};
  }
}

function savePlanState(state: PersistentPlanState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // Silently ignore storage errors
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function usePracticePlan(options: {
  initialBirthYear: number | null;
  initialPlayerCount: number;
  favoriteDrillIds: string[];
}) {
  const [birthYear, setBirthYear] = useState<number | null>(() => {
    const saved = loadPlanState();
    return options.initialBirthYear ?? saved.birthYear ?? null;
  });
  const [playerCount, setPlayerCount] = useState(() => {
    const saved = loadPlanState();
    return options.initialBirthYear ? options.initialPlayerCount : (saved.playerCount ?? 10);
  });
  const [selectedCategories, setSelectedCategories] = useState<DrillCategory[]>(() => {
    const saved = loadPlanState();
    return saved.selectedCategories ?? [];
  });
  const [targetDuration, setTargetDuration] = useState(() => {
    const saved = loadPlanState();
    return saved.targetDuration ?? 60;
  });
  const [favoritesOnly, setFavoritesOnly] = useState(() => {
    const saved = loadPlanState();
    return saved.favoritesOnly ?? false;
  });
  const [seed, setSeed] = useState(() => {
    const saved = loadPlanState();
    return saved.seed ?? Date.now();
  });
  const [expandedDrillIds, setExpandedDrillIds] = useState<Set<string>>(new Set());
  const [swappedDrills, setSwappedDrills] = useState<Map<number, Drill>>(new Map());
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseCategory, setBrowseCategory] = useState<DrillCategory | null>(null);

  // Session storage persistence (debounced)
  const planInputs = useMemo(
    () => ({ birthYear, playerCount, selectedCategories, targetDuration, favoritesOnly, seed }),
    [birthYear, playerCount, selectedCategories, targetDuration, favoritesOnly, seed],
  );
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => savePlanState(planInputs), 300);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [planInputs]);

  const drillBracket = birthYear ? getDrillBracket(birthYear) : null;

  const plan = useMemo(() => {
    if (!drillBracket || selectedCategories.length === 0) return null;
    return generatePracticePlan({
      drills: DRILLS,
      ageGroup: drillBracket,
      playerCount,
      categories: selectedCategories,
      targetDurationMinutes: targetDuration,
      favoritesOnly,
      favoriteIds: options.favoriteDrillIds,
      seed,
    });
  }, [
    drillBracket,
    playerCount,
    selectedCategories,
    targetDuration,
    favoritesOnly,
    options.favoriteDrillIds,
    seed,
  ]);

  // Reset swaps when plan identity changes (render-phase derived-state pattern per project ESLint rules)
  const planKey = plan ? plan.drills.map((d) => d.id).join(',') : '';
  const [lastPlanKey, setLastPlanKey] = useState(planKey);
  if (planKey !== lastPlanKey) {
    setLastPlanKey(planKey);
    setSwappedDrills(new Map());
  }

  const displayDrills = useMemo(() => {
    if (!plan) return null;
    return plan.drills.map((d, i) => swappedDrills.get(i) ?? d);
  }, [plan, swappedDrills]);

  const totalDuration = useMemo(() => {
    if (!displayDrills) return 0;
    return displayDrills.reduce((sum, d) => sum + d.durationMinutes, 0);
  }, [displayDrills]);

  const availableCategories: DrillCategory[] = useMemo(() => {
    if (!drillBracket) return [];
    const youngBrackets: DrillAgeGroup[] = ['U6', 'U8', 'U10'];
    return youngBrackets.includes(drillBracket) ? YOUNG_CATEGORIES : ALL_CATEGORIES;
  }, [drillBracket]);

  const browseDrills = useMemo(() => {
    if (!drillBracket || selectedCategories.length > 0) return null;
    return DRILLS.filter((d) => {
      if (!d.ageGroups.includes(drillBracket)) return false;
      if (d.minPlayers > playerCount) return false;
      if (browseCategory && d.category !== browseCategory) return false;
      if (browseSearch) {
        const q = browseSearch.toLowerCase();
        if (!d.name.toLowerCase().includes(q) && !d.description.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [drillBracket, playerCount, selectedCategories, browseSearch, browseCategory]);

  const groupedBrowseDrills = useMemo(() => {
    if (!browseDrills) return null;
    const groups: Record<DrillPhase, Drill[]> = {
      'warm-up': [],
      main: [],
      scrimmage: [],
      'cool-down': [],
    };
    for (const drill of browseDrills) {
      groups[drill.phase].push(drill);
    }
    return groups;
  }, [browseDrills]);

  function toggleCategory(cat: DrillCategory) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function toggleExpanded(drillId: string) {
    setExpandedDrillIds((prev) => {
      const next = new Set(prev);
      if (next.has(drillId)) {
        next.delete(drillId);
      } else {
        next.add(drillId);
      }
      return next;
    });
  }

  function handleSwap(index: number) {
    if (!plan || !displayDrills) return;
    const currentDrill = displayDrills[index];
    const planDrillIds = new Set(displayDrills.map((d) => d.id));
    const candidates = DRILLS.filter((d) => {
      if (d.id === currentDrill.id || planDrillIds.has(d.id)) return false;
      if (d.phase !== currentDrill.phase) return false;
      if (!drillBracket || !d.ageGroups.includes(drillBracket)) return false;
      if (d.minPlayers > playerCount) return false;
      if (
        currentDrill.phase === 'main' &&
        selectedCategories.length > 0 &&
        !selectedCategories.includes(d.category)
      )
        return false;
      if (favoritesOnly && !options.favoriteDrillIds.includes(d.id)) return false;
      return true;
    });
    if (candidates.length === 0) return;
    setSwappedDrills((prev) => {
      const next = new Map(prev);
      next.set(index, pickRandom(candidates));
      return next;
    });
  }

  function handleBirthYearInput(value: string) {
    if (value === '') {
      setBirthYear(null);
      return;
    }
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      setBirthYear(parsed);
    }
  }

  function selectUAge(uAge: number) {
    setBirthYear(uAgeToBirthYear(uAge));
  }

  return {
    // State
    birthYear,
    playerCount,
    selectedCategories,
    targetDuration,
    favoritesOnly,
    seed,
    expandedDrillIds,
    browseSearch,
    browseCategory,
    drillBracket,
    // Derived
    plan,
    displayDrills,
    totalDuration,
    availableCategories,
    browseDrills,
    groupedBrowseDrills,
    // Setters
    setPlayerCount,
    setTargetDuration,
    setFavoritesOnly,
    setSeed,
    setBrowseSearch,
    setBrowseCategory,
    setSelectedCategories,
    // Handlers
    toggleCategory,
    toggleExpanded,
    handleSwap,
    handleBirthYearInput,
    selectUAge,
  };
}

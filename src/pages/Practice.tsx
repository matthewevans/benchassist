import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { DrillCard, StarIcon } from '@/components/DrillCard.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { DRILLS } from '@/data/drills.ts';
import { TRAINING_FOCUSES } from '@/data/training-focuses.ts';
import { getDrillBracket, getUAge, uAgeToBirthYear, DRILL_BRACKET_LABELS } from '@/utils/age.ts';
import { generatePracticePlan } from '@/utils/practiceGenerator.ts';
import {
  YOUNG_CATEGORIES,
  ALL_CATEGORIES,
  DRILL_CATEGORY_LABELS,
  DRILL_PHASE_LABELS,
} from '@/types/drill.ts';
import type { DrillCategory, Drill, DrillPhase } from '@/types/drill.ts';
import type { DrillAgeGroup } from '@/utils/age.ts';

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

const PHASE_ORDER: DrillPhase[] = ['warm-up', 'main', 'scrimmage', 'cool-down'];

/** Pick a random element from an array (event-handler only, not used during render). */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** U-age values to display as quick-select chips */
const U_AGE_CHIPS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const SESSION_KEY = 'practice_plan_state';

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
    return JSON.parse(stored);
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

export function Practice() {
  const { state, dispatch } = useAppContext();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team');
  const team = teamId ? state.teams[teamId] : undefined;

  const initialBirthYear = team?.birthYear ?? null;
  const initialPlayerCount = team ? Math.max(...team.rosters.map((r) => r.players.length), 10) : 10;

  const saved = loadPlanState();

  const [birthYear, setBirthYear] = useState<number | null>(
    initialBirthYear ?? saved.birthYear ?? null,
  );
  const [playerCount, setPlayerCount] = useState(
    team ? initialPlayerCount : (saved.playerCount ?? 10),
  );
  const [selectedCategories, setSelectedCategories] = useState<DrillCategory[]>(
    saved.selectedCategories ?? [],
  );
  const [targetDuration, setTargetDuration] = useState(saved.targetDuration ?? 60);
  const [favoritesOnly, setFavoritesOnly] = useState(saved.favoritesOnly ?? false);
  const [seed, setSeed] = useState(() => saved.seed ?? Date.now());
  const [expandedDrillIds, setExpandedDrillIds] = useState<Set<string>>(new Set());
  const [swappedDrills, setSwappedDrills] = useState<Map<number, Drill>>(new Map());
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseCategory, setBrowseCategory] = useState<DrillCategory | null>(null);

  // Persist plan inputs to sessionStorage
  const planInputs = useMemo(
    () => ({
      birthYear,
      playerCount,
      selectedCategories,
      targetDuration,
      favoritesOnly,
      seed,
    }),
    [birthYear, playerCount, selectedCategories, targetDuration, favoritesOnly, seed],
  );

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      savePlanState(planInputs);
    }, 300);
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
      favoriteIds: state.favoriteDrillIds,
      seed,
    });
  }, [
    drillBracket,
    playerCount,
    selectedCategories,
    targetDuration,
    favoritesOnly,
    state.favoriteDrillIds,
    seed,
  ]);

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

  // Reset swaps when plan changes
  const planKey = plan ? plan.drills.map((d) => d.id).join(',') : '';
  const [lastPlanKey, setLastPlanKey] = useState(planKey);
  if (planKey !== lastPlanKey) {
    setLastPlanKey(planKey);
    setSwappedDrills(new Map());
  }

  // Merge plan drills with swapped drills
  const displayDrills = useMemo(() => {
    if (!plan) return null;
    return plan.drills.map((d, i) => swappedDrills.get(i) ?? d);
  }, [plan, swappedDrills]);

  const totalDuration = useMemo(() => {
    if (!displayDrills) return 0;
    return displayDrills.reduce((sum, d) => sum + d.durationMinutes, 0);
  }, [displayDrills]);

  // Available categories depend on age bracket
  const availableCategories: DrillCategory[] = useMemo(() => {
    if (!drillBracket) return [];
    const youngBrackets: DrillAgeGroup[] = ['U6', 'U8', 'U10'];
    return youngBrackets.includes(drillBracket) ? YOUNG_CATEGORIES : ALL_CATEGORIES;
  }, [drillBracket]);

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

  function toggleFavorite(drillId: string) {
    dispatch({ type: 'TOGGLE_FAVORITE_DRILL', payload: drillId });
  }

  function handleSwap(index: number) {
    if (!plan || !displayDrills) return;
    const currentDrill = displayDrills[index];
    const planDrillIds = new Set(displayDrills.map((d) => d.id));

    // Find candidates: same phase, matching age/players, not already in plan
    const candidates = DRILLS.filter((d) => {
      if (d.id === currentDrill.id) return false;
      if (planDrillIds.has(d.id)) return false;
      if (d.phase !== currentDrill.phase) return false;
      if (!drillBracket || !d.ageGroups.includes(drillBracket)) return false;
      if (d.minPlayers > playerCount) return false;
      // For main phase, also match selected categories
      if (currentDrill.phase === 'main' && selectedCategories.length > 0) {
        if (!selectedCategories.includes(d.category)) return false;
      }
      if (favoritesOnly && !state.favoriteDrillIds.includes(d.id)) return false;
      return true;
    });

    if (candidates.length === 0) return;

    const replacement = pickRandom(candidates);
    setSwappedDrills((prev) => {
      const next = new Map(prev);
      next.set(index, replacement);
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

  // Group drills by phase for browse mode
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">Practice</h1>

      {/* Birth year input row */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Input
            type="number"
            placeholder="Birth year"
            value={birthYear ?? ''}
            onChange={(e) => handleBirthYearInput(e.target.value)}
            className="w-32"
          />
          {birthYear && drillBracket && (
            <span className="text-sm text-muted-foreground">
              U{getUAge(birthYear)} &middot; {DRILL_BRACKET_LABELS[drillBracket]} drills
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {U_AGE_CHIPS.map((uAge) => {
            const chipBirthYear = uAgeToBirthYear(uAge);
            const isSelected = birthYear === chipBirthYear;
            return (
              <Button
                key={uAge}
                size="xs"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => selectUAge(uAge)}
              >
                U{uAge}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Settings row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Players</span>
          <Input
            type="number"
            min={1}
            max={30}
            value={playerCount}
            onChange={(e) => setPlayerCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Duration</span>
          <Select
            value={String(targetDuration)}
            onValueChange={(v) => setTargetDuration(parseInt(v, 10))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((mins) => (
                <SelectItem key={mins} value={String(mins)}>
                  {mins}m
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          variant={favoritesOnly ? 'default' : 'outline'}
          onClick={() => setFavoritesOnly((prev) => !prev)}
        >
          <StarIcon filled={favoritesOnly} className="size-4" />
          Favorites
        </Button>
      </div>

      {/* Practice theme quick-select */}
      {drillBracket && (
        <div className="space-y-2">
          <span className="text-sm font-medium">Practice themes</span>
          <div className="flex flex-wrap gap-1.5">
            {TRAINING_FOCUSES.filter((t) => t.ageGroups.includes(drillBracket)).map((template) => (
              <Button
                key={template.id}
                size="sm"
                variant="outline"
                onClick={() => {
                  const cats = [
                    ...new Set(template.slots.flatMap((s) => s.preferredCategories)),
                  ].filter((c) => availableCategories.includes(c)) as DrillCategory[];
                  setSelectedCategories(cats);
                  setSeed(Date.now());
                }}
              >
                {template.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Category chips */}
      {drillBracket && (
        <div className="space-y-2">
          <span className="text-sm font-medium">Focus areas</span>
          <div className="flex flex-wrap gap-1.5">
            {availableCategories.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <Button
                  key={cat}
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => toggleCategory(cat)}
                >
                  {DRILL_CATEGORY_LABELS[cat]}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Output section */}
      {displayDrills && plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Practice Plan &middot; {totalDuration} min</h2>
            <Button size="sm" variant="outline" onClick={() => setSeed(Date.now())}>
              Shuffle All
            </Button>
          </div>
          <div className="space-y-3">
            {displayDrills.map((drill, index) => (
              <DrillCard
                key={`${index}-${drill.id}`}
                drill={drill}
                index={index + 1}
                isFavorite={state.favoriteDrillIds.includes(drill.id)}
                isExpanded={expandedDrillIds.has(drill.id)}
                onToggleExpand={() => toggleExpanded(drill.id)}
                onToggleFavorite={() => toggleFavorite(drill.id)}
                onSwap={() => handleSwap(index)}
                showSwap
              />
            ))}
          </div>
        </div>
      )}

      {groupedBrowseDrills && !plan && (
        <div className="space-y-4">
          {/* Browse filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search drills..."
              value={browseSearch}
              onChange={(e) => setBrowseSearch(e.target.value)}
              className="w-64"
            />
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="xs"
                variant={browseCategory === null ? 'default' : 'outline'}
                onClick={() => setBrowseCategory(null)}
              >
                All
              </Button>
              {availableCategories.map((cat) => (
                <Button
                  key={cat}
                  size="xs"
                  variant={browseCategory === cat ? 'default' : 'outline'}
                  onClick={() => setBrowseCategory(browseCategory === cat ? null : cat)}
                >
                  {DRILL_CATEGORY_LABELS[cat]}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{browseDrills!.length} drills</p>

          {/* Grouped drills */}
          {PHASE_ORDER.map((phase) => {
            const drills = groupedBrowseDrills[phase];
            if (drills.length === 0) return null;
            return (
              <div key={phase} className="space-y-3">
                <h2 className="text-lg font-semibold">{DRILL_PHASE_LABELS[phase]}</h2>
                <div className="space-y-3">
                  {drills.map((drill) => (
                    <DrillCard
                      key={drill.id}
                      drill={drill}
                      isFavorite={state.favoriteDrillIds.includes(drill.id)}
                      isExpanded={expandedDrillIds.has(drill.id)}
                      onToggleExpand={() => toggleExpanded(drill.id)}
                      onToggleFavorite={() => toggleFavorite(drill.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state: no bracket selected */}
      {!drillBracket && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <p className="text-lg font-medium">Select a birth year to get started</p>
            <p className="text-sm mt-1">
              Choose the team birth year above to browse drills and generate practice plans.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

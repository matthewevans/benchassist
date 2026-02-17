import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
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

const CATEGORY_COLORS: Record<DrillCategory, string> = {
  passing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  dribbling: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  shooting: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'first-touch': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  goalkeeping: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  attacking: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  defending: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
  possession: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  transition: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'set-pieces': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
};

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

const PHASE_ORDER: DrillPhase[] = ['warm-up', 'main', 'scrimmage', 'cool-down'];

/** Pick a random element from an array (event-handler only, not used during render). */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** U-age values to display as quick-select chips */
const U_AGE_CHIPS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export function Practice() {
  const { state, dispatch } = useAppContext();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team');
  const team = teamId ? state.teams[teamId] : undefined;

  const initialBirthYear = team?.birthYear ?? null;
  const initialPlayerCount = team ? Math.max(...team.rosters.map((r) => r.players.length), 10) : 10;

  const [birthYear, setBirthYear] = useState<number | null>(initialBirthYear);
  const [playerCount, setPlayerCount] = useState(initialPlayerCount);
  const [selectedCategories, setSelectedCategories] = useState<DrillCategory[]>([]);
  const [targetDuration, setTargetDuration] = useState(60);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [seed, setSeed] = useState(() => Date.now());
  const [expandedDrillIds, setExpandedDrillIds] = useState<Set<string>>(new Set());
  const [swappedDrills, setSwappedDrills] = useState<Map<number, Drill>>(new Map());

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
    return DRILLS.filter((d) => d.ageGroups.includes(drillBracket) && d.minPlayers <= playerCount);
  }, [drillBracket, playerCount, selectedCategories]);

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
        <div className="space-y-6">
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
          <CardContent className="pt-6 text-center text-muted-foreground">
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

// ---------------------------------------------------------------------------
// DrillCard sub-component
// ---------------------------------------------------------------------------

interface DrillCardProps {
  drill: Drill;
  index?: number;
  isFavorite: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleFavorite: () => void;
  onSwap?: () => void;
  showSwap?: boolean;
}

function DrillCard({
  drill,
  index,
  isFavorite,
  isExpanded,
  onToggleExpand,
  onToggleFavorite,
  onSwap,
  showSwap,
}: DrillCardProps) {
  const hasExpandContent =
    drill.setup ||
    (drill.coachingTips && drill.coachingTips.length > 1) ||
    (drill.variations && drill.variations.length > 0) ||
    (drill.equipment && drill.equipment.length > 0);

  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4 space-y-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {index !== undefined && (
              <span className="text-sm font-bold text-muted-foreground shrink-0">{index}.</span>
            )}
            <span className="font-semibold">{drill.name}</span>
            <button
              onClick={onToggleFavorite}
              className="shrink-0 hover:opacity-80 transition-opacity"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <StarIcon filled={isFavorite} className="size-4" />
            </button>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[drill.category]}`}
            >
              {DRILL_CATEGORY_LABELS[drill.category]}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {drill.durationMinutes}m &middot; {drill.minPlayers}+ players
            </span>
            {showSwap && onSwap && (
              <Button size="icon-xs" variant="ghost" onClick={onSwap} aria-label="Swap drill">
                <SwapIcon className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">{drill.description}</p>

        {/* First coaching tip (always visible) */}
        {drill.coachingTips.length > 0 && (
          <div className="text-sm">
            <span className="font-medium">Tip: </span>
            <span className="text-muted-foreground">{drill.coachingTips[0]}</span>
          </div>
        )}

        {/* Expand section */}
        {isExpanded && hasExpandContent && (
          <div className="space-y-3 pt-2 border-t">
            {drill.setup && (
              <div className="text-sm">
                <span className="font-medium">Setup: </span>
                <span className="text-muted-foreground">{drill.setup}</span>
              </div>
            )}

            {drill.coachingTips.length > 1 && (
              <div className="text-sm space-y-1">
                <span className="font-medium">More tips:</span>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {drill.coachingTips.slice(1).map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {drill.variations && drill.variations.length > 0 && (
              <div className="text-sm space-y-1">
                <span className="font-medium">Variations:</span>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {drill.variations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            )}

            {drill.equipment.length > 0 && (
              <div className="text-sm">
                <span className="font-medium">Equipment: </span>
                <span className="text-muted-foreground">{drill.equipment.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Expand toggle */}
        {hasExpandContent && (
          <button
            onClick={onToggleExpand}
            className="text-xs font-medium text-primary hover:underline"
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons (avoid extra icon library deps for just 2 icons)
// ---------------------------------------------------------------------------

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  if (filled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`text-yellow-500 ${className ?? ''}`}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-muted-foreground ${className ?? ''}`}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

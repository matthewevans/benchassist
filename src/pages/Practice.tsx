import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { usePracticePlan, PHASE_ORDER } from '@/hooks/usePracticePlan.ts';
import { DrillCard, StarIcon } from '@/components/DrillCard.tsx';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { TRAINING_FOCUSES } from '@/data/training-focuses.ts';
import { getUAge, uAgeToBirthYear, DRILL_BRACKET_LABELS } from '@/utils/age.ts';
import { DRILL_CATEGORY_LABELS, DRILL_PHASE_LABELS } from '@/types/drill.ts';
import type { DrillCategory } from '@/types/drill.ts';

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

/** U-age values to display as quick-select chips */
const U_AGE_CHIPS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export function Practice() {
  const { state, dispatch } = useAppContext();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team');
  const team = teamId ? state.teams[teamId] : undefined;

  const initialBirthYear = team?.birthYear ?? null;
  const initialPlayerCount = team ? Math.max(...team.rosters.map((r) => r.players.length), 10) : 10;

  const p = usePracticePlan({
    initialBirthYear,
    initialPlayerCount,
    favoriteDrillIds: state.favoriteDrillIds,
  });

  function toggleFavorite(drillId: string) {
    dispatch({ type: 'TOGGLE_FAVORITE_DRILL', payload: drillId });
  }

  return (
    <div>
      <NavBar title="Practice" largeTitle />

      <div className="px-4 space-y-6 pt-4">
        {/* Birth year input row */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              placeholder="Birth year"
              value={p.birthYear ?? ''}
              onChange={(e) => p.handleBirthYearInput(e.target.value)}
              className="w-32"
            />
            {p.birthYear && p.drillBracket && (
              <span className="text-ios-footnote text-muted-foreground">
                U{getUAge(p.birthYear)} &middot; {DRILL_BRACKET_LABELS[p.drillBracket]} drills
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {U_AGE_CHIPS.map((uAge) => {
              const chipBirthYear = uAgeToBirthYear(uAge);
              const isSelected = p.birthYear === chipBirthYear;
              return (
                <Button
                  key={uAge}
                  size="capsule"
                  variant={isSelected ? 'default' : 'secondary'}
                  onClick={() => p.selectUAge(uAge)}
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
            <span className="text-ios-footnote text-muted-foreground">Players</span>
            <Input
              type="number"
              min={1}
              max={30}
              value={p.playerCount}
              onChange={(e) => p.setPlayerCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-20"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-ios-footnote text-muted-foreground">Duration</span>
            <Select
              value={String(p.targetDuration)}
              onValueChange={(v) => p.setTargetDuration(parseInt(v, 10))}
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
            size="capsule"
            variant={p.favoritesOnly ? 'default' : 'secondary'}
            onClick={() => p.setFavoritesOnly((prev) => !prev)}
          >
            <StarIcon filled={p.favoritesOnly} className="size-4" />
            Favorites
          </Button>
        </div>

        {/* Practice theme quick-select */}
        {p.drillBracket && (
          <div className="space-y-2">
            <span className="text-ios-footnote font-medium">Practice themes</span>
            <div className="flex flex-wrap gap-1.5">
              {TRAINING_FOCUSES.filter((t) => t.ageGroups.includes(p.drillBracket!)).map(
                (template) => (
                  <Button
                    key={template.id}
                    size="capsule"
                    variant="secondary"
                    onClick={() => {
                      const cats = [
                        ...new Set(template.slots.flatMap((s) => s.preferredCategories)),
                      ].filter((c) => p.availableCategories.includes(c)) as DrillCategory[];
                      p.setSelectedCategories(cats);
                      p.setSeed(Date.now());
                    }}
                  >
                    {template.name}
                  </Button>
                ),
              )}
            </div>
          </div>
        )}

        {/* Category chips */}
        {p.drillBracket && (
          <div className="space-y-2">
            <span className="text-ios-footnote font-medium">Focus areas</span>
            <div className="flex flex-wrap gap-1.5">
              {p.availableCategories.map((cat) => {
                const isSelected = p.selectedCategories.includes(cat);
                return (
                  <Button
                    key={cat}
                    size="capsule"
                    variant={isSelected ? 'default' : 'secondary'}
                    onClick={() => p.toggleCategory(cat)}
                  >
                    {DRILL_CATEGORY_LABELS[cat]}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Output section */}
        {p.displayDrills && p.plan && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-ios-title3">Practice Plan &middot; {p.totalDuration} min</h2>
              <Button size="sm" variant="plain" onClick={() => p.setSeed(Date.now())}>
                Shuffle All
              </Button>
            </div>
            <div className="space-y-3">
              {p.displayDrills.map((drill, index) => (
                <DrillCard
                  key={`${index}-${drill.id}`}
                  drill={drill}
                  index={index + 1}
                  isFavorite={state.favoriteDrillIds.includes(drill.id)}
                  isExpanded={p.expandedDrillIds.has(drill.id)}
                  onToggleExpand={() => p.toggleExpanded(drill.id)}
                  onToggleFavorite={() => toggleFavorite(drill.id)}
                  onSwap={() => p.handleSwap(index)}
                  showSwap
                />
              ))}
            </div>
          </div>
        )}

        {p.groupedBrowseDrills && !p.plan && (
          <div className="space-y-4">
            {/* Browse filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Search drills..."
                value={p.browseSearch}
                onChange={(e) => p.setBrowseSearch(e.target.value)}
                className="w-64"
              />
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="capsule"
                  variant={p.browseCategory === null ? 'default' : 'secondary'}
                  onClick={() => p.setBrowseCategory(null)}
                >
                  All
                </Button>
                {p.availableCategories.map((cat) => (
                  <Button
                    key={cat}
                    size="capsule"
                    variant={p.browseCategory === cat ? 'default' : 'secondary'}
                    onClick={() => p.setBrowseCategory(p.browseCategory === cat ? null : cat)}
                  >
                    {DRILL_CATEGORY_LABELS[cat]}
                  </Button>
                ))}
              </div>
            </div>

            <p className="text-ios-footnote text-muted-foreground">
              {p.browseDrills!.length} drills
            </p>

            {/* Grouped drills */}
            {PHASE_ORDER.map((phase) => {
              const drills = p.groupedBrowseDrills![phase];
              if (drills.length === 0) return null;
              return (
                <div key={phase} className="space-y-3">
                  <h2 className="text-ios-title3">{DRILL_PHASE_LABELS[phase]}</h2>
                  <div className="space-y-3">
                    {drills.map((drill) => (
                      <DrillCard
                        key={drill.id}
                        drill={drill}
                        isFavorite={state.favoriteDrillIds.includes(drill.id)}
                        isExpanded={p.expandedDrillIds.has(drill.id)}
                        onToggleExpand={() => p.toggleExpanded(drill.id)}
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
        {!p.drillBracket && (
          <GroupedList>
            <GroupedListRow last>
              <div className="text-center py-4">
                <div className="text-ios-body font-medium text-muted-foreground">
                  Select a birth year to get started
                </div>
                <div className="text-ios-caption1 text-muted-foreground mt-1">
                  Choose the team birth year above to browse drills and generate practice plans.
                </div>
              </div>
            </GroupedListRow>
          </GroupedList>
        )}
      </div>
    </div>
  );
}

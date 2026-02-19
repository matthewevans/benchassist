import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/hooks/useAppContext.ts';
import { usePracticePlan, PHASE_ORDER } from '@/hooks/usePracticePlan.ts';
import { DrillCard } from '@/components/DrillCard.tsx';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { GroupedList, GroupedListRow } from '@/components/ui/grouped-list.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Switch } from '@/components/ui/switch.tsx';
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
import { cn } from '@/lib/utils.ts';
import type { DrillCategory } from '@/types/drill.ts';

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

/** U-age values to display as quick-select chips */
const U_AGE_CHIPS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

interface PracticeChipProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function PracticeChip({ selected, onClick, children }: PracticeChipProps) {
  return (
    <Button
      type="button"
      variant="plain"
      size="sm"
      aria-pressed={selected}
      className="h-11 rounded-full px-1.5 active:bg-[#D1D1D6] dark:active:bg-[#3A3A3C]"
      onClick={onClick}
    >
      <span
        className={cn(
          'inline-flex h-8 items-center rounded-full border px-3 text-ios-footnote font-medium transition-colors',
          selected
            ? 'border-primary/25 bg-primary/12 text-primary'
            : 'border-border/60 bg-transparent text-muted-foreground',
        )}
      >
        {children}
      </span>
    </Button>
  );
}

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
      <NavBar
        title="Practice"
        largeTitle
        trailing={
          p.birthYear != null ? (
            <Button
              variant="plain"
              size="xs"
              className="h-11 px-2 text-ios-footnote"
              onClick={p.reset}
            >
              Reset
            </Button>
          ) : undefined
        }
      />

      <div className="max-w-4xl mx-auto px-4 space-y-6 pt-4">
        {/* Age group section */}
        <GroupedList header="Age Group">
          <GroupedListRow last>
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
                    U{getUAge(p.birthYear)} · {DRILL_BRACKET_LABELS[p.drillBracket]} drills
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 pb-0.5">
                {U_AGE_CHIPS.map((uAge) => {
                  const chipBirthYear = uAgeToBirthYear(uAge);
                  const isSelected = p.birthYear === chipBirthYear;
                  return (
                    <PracticeChip
                      key={uAge}
                      selected={isSelected}
                      onClick={() => p.selectUAge(uAge)}
                    >
                      U{uAge}
                    </PracticeChip>
                  );
                })}
              </div>
            </div>
          </GroupedListRow>
        </GroupedList>

        {/* Settings section */}
        <GroupedList header="Settings">
          <GroupedListRow
            trailing={
              <Input
                type="number"
                min={1}
                max={30}
                value={p.playerCount}
                onChange={(e) => p.setPlayerCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 text-right border-none shadow-none bg-transparent px-0 focus-visible:ring-0 h-auto text-ios-body"
              />
            }
          >
            <span className="text-ios-body">Players</span>
          </GroupedListRow>
          <GroupedListRow
            trailing={
              <Select
                value={String(p.targetDuration)}
                onValueChange={(v) => p.setTargetDuration(parseInt(v, 10))}
              >
                <SelectTrigger className="w-24 border-none shadow-none bg-transparent px-0 focus:ring-0 text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((mins) => (
                    <SelectItem key={mins} value={String(mins)}>
                      {mins} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          >
            <span className="text-ios-body">Duration</span>
          </GroupedListRow>
          <GroupedListRow
            last
            trailing={<Switch checked={p.favoritesOnly} onCheckedChange={p.setFavoritesOnly} />}
          >
            <div>
              <div className="text-ios-body">Favorites only</div>
            </div>
          </GroupedListRow>
        </GroupedList>

        {/* Practice themes */}
        {p.drillBracket && (
          <GroupedList
            header="Practice Presets"
            footer="Tap a preset to apply its focus mix and regenerate the plan."
          >
            {TRAINING_FOCUSES.filter((t) => t.ageGroups.includes(p.drillBracket!)).map(
              (template, index, list) => (
                <GroupedListRow
                  key={template.id}
                  last={index === list.length - 1}
                  onClick={() => {
                    const cats = [
                      ...new Set(template.slots.flatMap((s) => s.preferredCategories)),
                    ].filter((c) => p.availableCategories.includes(c)) as DrillCategory[];
                    p.setSelectedCategories(cats);
                    p.setSeed(Date.now());
                  }}
                >
                  <div>
                    <div className="text-ios-body font-medium">{template.name}</div>
                    <div className="text-ios-caption1 text-muted-foreground">
                      {template.description}
                    </div>
                  </div>
                </GroupedListRow>
              ),
            )}
          </GroupedList>
        )}

        {/* Focus areas */}
        {p.drillBracket && (
          <section>
            <h3 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
              Focus Areas
            </h3>
            <div className="bg-card rounded-[10px] px-3 py-3">
              <div className="flex flex-wrap gap-1.5">
                {p.availableCategories.map((cat) => {
                  const isSelected = p.selectedCategories.includes(cat);
                  return (
                    <PracticeChip
                      key={cat}
                      selected={isSelected}
                      onClick={() => p.toggleCategory(cat)}
                    >
                      {DRILL_CATEGORY_LABELS[cat]}
                    </PracticeChip>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Practice plan output */}
        {p.displayDrills && p.plan && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-ios-title3 font-semibold">
                Practice Plan · {p.totalDuration} min
              </h2>
              <Button
                size="xs"
                variant="plain"
                className="h-11 px-2 text-ios-footnote"
                onClick={() => p.setSeed(Date.now())}
              >
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

        {/* Browse mode */}
        {p.groupedBrowseDrills && !p.plan && (
          <div className="space-y-6">
            {/* Browse filters */}
            <section>
              <h3 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
                Browse Drills
              </h3>
              <div className="bg-card rounded-[10px] px-3 py-3 space-y-3">
                <Input
                  placeholder="Search drills…"
                  value={p.browseSearch}
                  onChange={(e) => p.setBrowseSearch(e.target.value)}
                />
                <div className="flex flex-wrap gap-1.5">
                  <PracticeChip
                    selected={p.browseCategory === null}
                    onClick={() => p.setBrowseCategory(null)}
                  >
                    All
                  </PracticeChip>
                  {p.availableCategories.map((cat) => (
                    <PracticeChip
                      key={cat}
                      selected={p.browseCategory === cat}
                      onClick={() => p.setBrowseCategory(p.browseCategory === cat ? null : cat)}
                    >
                      {DRILL_CATEGORY_LABELS[cat]}
                    </PracticeChip>
                  ))}
                </div>
              </div>
              <p className="text-ios-footnote text-muted-foreground px-4 pt-1.5">
                {p.browseDrills!.length} drill{p.browseDrills!.length !== 1 ? 's' : ''}
              </p>
            </section>

            {/* Grouped drills by phase */}
            {PHASE_ORDER.map((phase) => {
              const drills = p.groupedBrowseDrills![phase];
              if (drills.length === 0) return null;
              return (
                <section key={phase} className="space-y-2">
                  <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4">
                    {DRILL_PHASE_LABELS[phase]}
                  </h2>
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
                </section>
              );
            })}
          </div>
        )}

        {/* Empty state */}
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

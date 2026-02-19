import { Clock, RefreshCw, Users } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/components/ui/button.tsx';
import { DrillDiagram } from '@/components/DrillDiagram.tsx';
import { getIntensityDisplay } from '@/utils/drillDisplay.ts';
import { DRILL_CATEGORY_LABELS, DRILL_PHASE_LABELS } from '@/types/drill.ts';
import type { Drill } from '@/types/drill.ts';

const CATEGORY_ACCENT_CLASSES: Record<Drill['category'], string> = {
  passing: 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
  dribbling: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  shooting: 'bg-orange-500/12 text-orange-700 dark:text-orange-300',
  'first-touch': 'bg-violet-500/12 text-violet-700 dark:text-violet-300',
  goalkeeping: 'bg-yellow-500/12 text-yellow-700 dark:text-yellow-300',
  attacking: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
  defending: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',
  possession: 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300',
  transition: 'bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300',
  'set-pieces': 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  balls: 'Balls',
  cones: 'Cones',
  pinnies: 'Pinnies',
  goals: 'Goals',
  gloves: 'Gloves',
  'agility ladder': 'Ladder',
};

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

export function DrillCard({
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
    drill.diagram ||
    (drill.coachingTips && drill.coachingTips.length > 0) ||
    !!drill.setup ||
    (drill.variations && drill.variations.length > 0) ||
    drill.equipment.length > 0;

  const {
    filled,
    label: intensityLabel,
    colorClass: intensityColor,
  } = getIntensityDisplay(drill.intensity);

  return (
    <div className="bg-card rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
      <div className="px-4 py-3 space-y-2.5">
        {/* Header: index + name (left), star (right) */}
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 pt-0.5">
            {index !== undefined && (
              <span className="text-ios-footnote font-medium text-muted-foreground shrink-0">
                {index}
              </span>
            )}
            <span className="text-ios-body font-semibold truncate">{drill.name}</span>
          </div>
          <button
            onClick={onToggleFavorite}
            className="flex size-11 -m-2 shrink-0 items-center justify-center rounded-full active:bg-[#D1D1D6] dark:active:bg-[#3A3A3C]"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <StarIcon filled={isFavorite} className="size-[18px]" />
          </button>
        </div>

        {/* Compact summary line */}
        <div className="flex flex-wrap items-center gap-1.5 text-ios-caption1 text-muted-foreground">
          <span>{DRILL_PHASE_LABELS[drill.phase]}</span>
          <span aria-hidden>&middot;</span>
          <span className="text-muted-foreground/80">Category</span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 font-medium',
              CATEGORY_ACCENT_CLASSES[drill.category],
            )}
          >
            {DRILL_CATEGORY_LABELS[drill.category]}
          </span>
          <span aria-hidden>&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {drill.durationMinutes}m
          </span>
          <span aria-hidden>&middot;</span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" />
            {drill.minPlayers}+
          </span>
          <span aria-hidden>&middot;</span>
          <span className="inline-flex items-center gap-1">
            <span>Pace:</span>
            <span className="inline-flex items-center gap-0.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'text-[7px]',
                    i < filled ? intensityColor : 'text-muted-foreground/45',
                  )}
                >
                  {i < filled ? '\u25CF' : '\u25CB'}
                </span>
              ))}
            </span>
            <span>{intensityLabel}</span>
          </span>
        </div>

        {/* Description + diagram */}
        <div className={drill.diagram ? 'flex gap-3 items-start' : ''}>
          <p className="text-ios-subheadline text-muted-foreground flex-1 line-clamp-2">
            {drill.description}
          </p>
          {drill.diagram && (
            <DrillDiagram
              diagram={drill.diagram}
              className="w-32 h-32 shrink-0 rounded-lg hidden sm:block"
            />
          )}
        </div>

        {/* Expanded section */}
        {isExpanded && hasExpandContent && (
          <div className="space-y-3 pt-2.5 border-t border-border/50">
            {drill.diagram && (
              <DrillDiagram diagram={drill.diagram} className="w-full h-48 rounded-lg sm:hidden" />
            )}

            {drill.setup && (
              <div className="text-ios-subheadline">
                <span className="font-medium">Setup: </span>
                <span className="text-muted-foreground">{drill.setup}</span>
              </div>
            )}

            {drill.coachingTips.length > 0 && (
              <div className="text-ios-subheadline">
                <span className="font-medium">Tip: </span>
                <span className="text-muted-foreground">{drill.coachingTips[0]}</span>
              </div>
            )}

            {drill.coachingTips.length > 1 && (
              <div className="text-ios-subheadline space-y-1">
                <span className="font-medium">More tips:</span>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {drill.coachingTips.slice(1).map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {drill.equipment.length > 0 && (
              <div className="text-ios-subheadline">
                <span className="font-medium">Equipment: </span>
                <span className="text-muted-foreground">
                  {drill.equipment.map((eq) => EQUIPMENT_LABELS[eq] ?? eq).join(', ')}
                </span>
              </div>
            )}

            {drill.variations && drill.variations.length > 0 && (
              <div className="text-ios-subheadline space-y-1">
                <span className="font-medium">Variations:</span>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {drill.variations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      {(hasExpandContent || (showSwap && onSwap)) && (
        <div className="flex items-center px-4 py-2 border-t border-border/50">
          {showSwap && onSwap && (
            <Button
              variant="plain"
              size="xs"
              className="gap-1.5 text-ios-footnote"
              onClick={onSwap}
              aria-label="Swap drill"
            >
              <RefreshCw className="size-3.5" />
              Swap
            </Button>
          )}
          <div className="flex-1" />
          {hasExpandContent && (
            <Button
              variant="plain"
              size="xs"
              className="text-ios-footnote"
              onClick={onToggleExpand}
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  if (filled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`text-yellow-500 dark:text-yellow-400 ${className ?? ''}`}
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

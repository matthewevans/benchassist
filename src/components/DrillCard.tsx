import type { ComponentType } from 'react';
import {
  Clock,
  Users,
  Triangle,
  Circle,
  Shirt,
  RectangleHorizontal,
  Hand,
  Fence,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/components/ui/button.tsx';
import { DrillDiagram } from '@/components/DrillDiagram.tsx';
import { getIntensityDisplay, getPhaseDotColor } from '@/utils/drillDisplay.ts';
import { DRILL_CATEGORY_LABELS, DRILL_PHASE_LABELS } from '@/types/drill.ts';
import type { Drill, DrillCategory } from '@/types/drill.ts';

const CATEGORY_COLORS: Record<DrillCategory, string> = {
  passing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
  dribbling: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300',
  shooting: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300',
  'first-touch': 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
  goalkeeping: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300',
  attacking: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300',
  defending: 'bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-300',
  possession: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
  transition: 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-300',
  'set-pieces': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
};

const EQUIPMENT_ICONS: Record<string, ComponentType<{ className?: string }> | undefined> = {
  balls: Circle,
  cones: Triangle,
  pinnies: Shirt,
  goals: RectangleHorizontal,
  gloves: Hand,
  'agility ladder': Fence,
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
    (drill.coachingTips && drill.coachingTips.length > 1) ||
    (drill.variations && drill.variations.length > 0);

  const {
    filled,
    label: intensityLabel,
    colorClass: intensityColor,
  } = getIntensityDisplay(drill.intensity);

  return (
    <div className="bg-card rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-none">
      <div className="px-4 py-3 space-y-2.5">
        {/* Header: phase dot + index + name (left), star (right) */}
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 pt-0.5">
            <span className={cn('size-2.5 rounded-full shrink-0', getPhaseDotColor(drill.phase))} />
            {index !== undefined && (
              <span className="text-ios-footnote font-medium text-muted-foreground shrink-0">
                {index}
              </span>
            )}
            <span className="text-ios-body font-semibold truncate">{drill.name}</span>
          </div>
          <button
            onClick={onToggleFavorite}
            className="p-1.5 -m-1.5 shrink-0"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <StarIcon filled={isFavorite} className="size-[18px]" />
          </button>
        </div>

        {/* Tags row: phase + category + metadata */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-ios-caption1 px-2 py-0.5 rounded-full font-medium bg-secondary text-secondary-foreground">
            {DRILL_PHASE_LABELS[drill.phase]}
          </span>
          <span
            className={cn(
              'text-ios-caption1 px-2 py-0.5 rounded-full font-medium',
              CATEGORY_COLORS[drill.category],
            )}
          >
            {DRILL_CATEGORY_LABELS[drill.category]}
          </span>
          <span className="text-ios-caption1 text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {drill.durationMinutes}m
          </span>
          <span className="text-ios-caption1 text-muted-foreground flex items-center gap-1">
            <Users className="size-3" />
            {drill.minPlayers}+
          </span>
          <span
            className={cn('text-ios-caption1 inline-flex items-center gap-0.5', intensityColor)}
          >
            {[0, 1, 2].map((i) => (
              <span key={i} className="text-[7px]" aria-hidden="true">
                {i < filled ? '\u25CF' : '\u25CB'}
              </span>
            ))}
            <span className="ml-0.5">{intensityLabel}</span>
          </span>
        </div>

        {/* Equipment row (only if present) */}
        {drill.equipment.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {drill.equipment.map((eq) => {
              const Icon = EQUIPMENT_ICONS[eq];
              const label = EQUIPMENT_LABELS[eq] ?? eq;
              return (
                <span
                  key={eq}
                  className="text-ios-caption1 text-muted-foreground flex items-center gap-1"
                >
                  {Icon && <Icon className="size-3" />}
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {/* Description + diagram */}
        <div className={drill.diagram ? 'flex gap-3 items-start' : ''}>
          <p className="text-ios-subheadline text-muted-foreground flex-1">{drill.description}</p>
          {drill.diagram && (
            <DrillDiagram
              diagram={drill.diagram}
              className="w-32 h-32 shrink-0 rounded-lg hidden sm:block"
            />
          )}
        </div>

        {/* Setup */}
        {drill.setup && (
          <div className="text-ios-subheadline">
            <span className="font-medium">Setup: </span>
            <span className="text-muted-foreground">{drill.setup}</span>
          </div>
        )}

        {/* First coaching tip */}
        {drill.coachingTips.length > 0 && (
          <div className="text-ios-subheadline">
            <span className="font-medium">Tip: </span>
            <span className="text-muted-foreground">{drill.coachingTips[0]}</span>
          </div>
        )}

        {/* Expanded section */}
        {isExpanded && hasExpandContent && (
          <div className="space-y-3 pt-2.5 border-t border-border/50">
            {drill.diagram && (
              <DrillDiagram diagram={drill.diagram} className="w-full h-48 rounded-lg sm:hidden" />
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

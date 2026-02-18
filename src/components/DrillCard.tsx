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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { DrillDiagram } from '@/components/DrillDiagram.tsx';
import { getPhaseColor, getIntensityDisplay } from '@/utils/drillDisplay.ts';
import { DRILL_CATEGORY_LABELS } from '@/types/drill.ts';
import type { Drill, DrillCategory } from '@/types/drill.ts';

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

const EQUIPMENT_ICONS: Record<string, ComponentType<{ className?: string }> | undefined> = {
  balls: Circle,
  cones: Triangle,
  pinnies: Shirt,
  goals: RectangleHorizontal,
  gloves: Hand,
  'agility ladder': Fence,
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
    drill.setup ||
    (drill.coachingTips && drill.coachingTips.length > 1) ||
    (drill.variations && drill.variations.length > 0);

  return (
    <Card className={`gap-0 py-0 border-l-4 ${getPhaseColor(drill.phase)}`}>
      <CardContent className="p-4 space-y-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {index !== undefined && (
              <span className="text-sm font-semibold text-muted-foreground shrink-0">{index}.</span>
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
            {showSwap && onSwap && (
              <Button size="icon-xs" variant="ghost" onClick={onSwap} aria-label="Swap drill">
                <SwapIcon className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Metadata pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="gap-1 text-xs font-normal">
            <Clock className="size-3" />
            {drill.durationMinutes}m
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs font-normal">
            <Users className="size-3" />
            {drill.minPlayers}+
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs font-normal">
            <IntensityDots intensity={drill.intensity} />
          </Badge>
          {drill.equipment.length > 0 && (
            <Badge
              variant="outline"
              className="gap-1 text-xs font-normal text-muted-foreground"
              aria-label={`Equipment: ${drill.equipment.join(', ')}`}
            >
              {drill.equipment.map((eq) => {
                const Icon = EQUIPMENT_ICONS[eq];
                return Icon ? <Icon key={eq} className="size-3" /> : null;
              })}
            </Badge>
          )}
        </div>

        {/* Description */}
        <div className={drill.diagram ? 'flex gap-3 items-start' : ''}>
          <p className="text-sm text-muted-foreground flex-1">{drill.description}</p>
          {drill.diagram && (
            <DrillDiagram
              diagram={drill.diagram}
              className="w-36 h-36 shrink-0 rounded-md hidden sm:block"
            />
          )}
        </div>

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

function IntensityDots({ intensity }: { intensity: 'low' | 'medium' | 'high' }) {
  const { filled, label, colorClass } = getIntensityDisplay(intensity);
  return (
    <span className={`inline-flex items-center gap-0.5 ${colorClass}`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="text-[8px]" aria-hidden="true">
          {i < filled ? '\u25CF' : '\u25CB'}
        </span>
      ))}
      <span className="ml-0.5 text-xs">{label}</span>
    </span>
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

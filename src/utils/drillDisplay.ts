import type { DrillPhase } from '@/types/drill.ts';

const PHASE_BORDER_COLORS: Record<DrillPhase, string> = {
  'warm-up': 'border-l-amber-400',
  main: 'border-l-blue-400',
  scrimmage: 'border-l-emerald-400',
  'cool-down': 'border-l-slate-400',
};

export function getPhaseColor(phase: DrillPhase): string {
  return PHASE_BORDER_COLORS[phase];
}

export interface IntensityDisplay {
  filled: number;
  label: string;
  colorClass: string;
}

const INTENSITY_MAP: Record<'low' | 'medium' | 'high', IntensityDisplay> = {
  low: { filled: 1, label: 'Low', colorClass: 'text-green-600 dark:text-green-400' },
  medium: { filled: 2, label: 'Med', colorClass: 'text-amber-600 dark:text-amber-400' },
  high: { filled: 3, label: 'High', colorClass: 'text-red-600 dark:text-red-400' },
};

export function getIntensityDisplay(intensity: 'low' | 'medium' | 'high'): IntensityDisplay {
  return INTENSITY_MAP[intensity];
}

const PHASE_BADGE_COLORS: Record<DrillPhase, string> = {
  'warm-up': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  main: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  scrimmage: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'cool-down': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
};

export function getPhaseBadgeColor(phase: DrillPhase): string {
  return PHASE_BADGE_COLORS[phase];
}

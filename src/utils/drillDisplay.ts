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

const INTENSITY_MAP: Record<string, IntensityDisplay> = {
  low: { filled: 1, label: 'Low', colorClass: 'text-green-600 dark:text-green-400' },
  medium: { filled: 2, label: 'Med', colorClass: 'text-amber-600 dark:text-amber-400' },
  high: { filled: 3, label: 'High', colorClass: 'text-red-600 dark:text-red-400' },
};

export function getIntensityDisplay(intensity: 'low' | 'medium' | 'high'): IntensityDisplay {
  return INTENSITY_MAP[intensity];
}

export const EQUIPMENT_ICON_NAMES: Record<string, string> = {
  balls: 'Circle',
  cones: 'Triangle',
  pinnies: 'Shirt',
  goals: 'RectangleHorizontal',
  gloves: 'Hand',
  'agility ladder': 'Fence',
};

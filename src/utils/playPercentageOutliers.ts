import type { PlayerId } from '@/types/domain.ts';

export interface PlayPercentageSample {
  playerId: PlayerId;
  playPercentage: number;
}

interface OutlierOptions {
  minimumDelta?: number;
  madMultiplier?: number;
  minSampleSize?: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

export function getHighPlayPercentageOutlierIds(
  samples: PlayPercentageSample[],
  options?: OutlierOptions,
): Set<PlayerId> {
  const minimumDelta = options?.minimumDelta ?? 10;
  const madMultiplier = options?.madMultiplier ?? 2;
  const minSampleSize = options?.minSampleSize ?? 3;
  const validSamples = samples.filter((s) => Number.isFinite(s.playPercentage));
  if (validSamples.length < minSampleSize) return new Set();

  const values = validSamples.map((s) => s.playPercentage);
  const center = median(values);
  const deviations = values.map((value) => Math.abs(value - center));
  const mad = median(deviations);
  const threshold = Math.max(minimumDelta, mad * madMultiplier);

  const outliers = new Set<PlayerId>();
  for (const sample of validSamples) {
    if (sample.playPercentage > center && sample.playPercentage - center >= threshold) {
      outliers.add(sample.playerId);
    }
  }
  return outliers;
}

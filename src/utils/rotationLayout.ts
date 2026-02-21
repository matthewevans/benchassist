export function normalizePeriodDivisions(
  periodDivisions: number[] | undefined,
  periods: number,
  fallbackDivision: number,
): number[] {
  if (!Number.isFinite(periods) || periods <= 0) return [];

  const safePeriods = Math.floor(periods);
  const safeFallback = Math.max(1, Math.floor(fallbackDivision) || 1);
  const raw = Array.isArray(periodDivisions) ? periodDivisions : [];

  return Array.from({ length: safePeriods }, (_, i) => {
    const value = Number(raw[i]);
    if (!Number.isFinite(value) || value < 1) return safeFallback;
    return Math.floor(value);
  });
}

export function getTotalRotationsFromDivisions(periodDivisions: number[]): number {
  return periodDivisions.reduce((sum, value) => sum + Math.max(1, Math.floor(value) || 1), 0);
}

export function getPeriodOffsets(periodDivisions: number[]): number[] {
  const offsets: number[] = [];
  let cursor = 0;
  for (let i = 0; i < periodDivisions.length; i++) {
    offsets.push(cursor);
    cursor += Math.max(1, Math.floor(periodDivisions[i]) || 1);
  }
  return offsets;
}

export function getPeriodRange(
  periodDivisions: number[],
  periodIndex: number,
): { start: number; endExclusive: number } | null {
  if (periodIndex < 0 || periodIndex >= periodDivisions.length) return null;
  const offsets = getPeriodOffsets(periodDivisions);
  const start = offsets[periodIndex];
  const endExclusive = start + Math.max(1, Math.floor(periodDivisions[periodIndex]) || 1);
  return { start, endExclusive };
}

export function getPeriodForRotation(periodDivisions: number[], rotationIndex: number): number {
  if (periodDivisions.length === 0) return 0;
  if (rotationIndex <= 0) return 0;

  let cursor = 0;
  for (let i = 0; i < periodDivisions.length; i++) {
    const size = Math.max(1, Math.floor(periodDivisions[i]) || 1);
    if (rotationIndex < cursor + size) return i;
    cursor += size;
  }

  return periodDivisions.length - 1;
}

export function getWithinPeriodRotationIndex(
  periodDivisions: number[],
  rotationIndex: number,
): number {
  const periodIndex = getPeriodForRotation(periodDivisions, rotationIndex);
  const range = getPeriodRange(periodDivisions, periodIndex);
  if (!range) return 0;
  return Math.max(0, rotationIndex - range.start);
}

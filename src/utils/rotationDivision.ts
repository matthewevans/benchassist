import { rebuildScheduleWithRotations } from '@/utils/stats.ts';
import type { Player, Rotation, RotationSchedule } from '@/types/domain.ts';

interface RedivideSchedulePeriodParams {
  schedule: RotationSchedule;
  players: Player[];
  periodDivisions: number[];
  periodIndex: number;
  nextDivision: number;
}

type RedivideSchedulePeriodResult =
  | {
      ok: true;
      schedule: RotationSchedule;
      periodDivisions: number[];
    }
  | {
      ok: false;
      error: string;
    };

function cloneRotation(rotation: Rotation): Rotation {
  return {
    ...rotation,
    assignments: { ...rotation.assignments },
    fieldPositions: rotation.fieldPositions ? { ...rotation.fieldPositions } : undefined,
    violations: [...rotation.violations],
  };
}

function equalRecord(
  a: Record<string, string> | undefined,
  b: Record<string, string> | undefined,
): boolean {
  const keysA = Object.keys(a ?? {});
  const keysB = Object.keys(b ?? {});
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if ((a ?? {})[key] !== (b ?? {})[key]) return false;
  }
  return true;
}

function rotationsEquivalent(a: Rotation, b: Rotation): boolean {
  return (
    equalRecord(a.assignments as Record<string, string>, b.assignments as Record<string, string>) &&
    equalRecord(
      a.fieldPositions as Record<string, string> | undefined,
      b.fieldPositions as Record<string, string> | undefined,
    )
  );
}

function getRotationsByPeriod(schedule: RotationSchedule, periodCount: number): Rotation[][] {
  const byPeriod = Array.from({ length: periodCount }, () => [] as Rotation[]);
  for (const rotation of schedule.rotations) {
    if (rotation.periodIndex >= 0 && rotation.periodIndex < periodCount) {
      byPeriod[rotation.periodIndex].push(rotation);
    }
  }
  return byPeriod.map((rotations) => [...rotations].sort((a, b) => a.index - b.index));
}

function sanitizeDivision(value: number): number {
  return Math.max(1, Math.floor(value) || 1);
}

export function redivideSchedulePeriod(
  params: RedivideSchedulePeriodParams,
): RedivideSchedulePeriodResult {
  const { schedule, players, periodDivisions, periodIndex, nextDivision } = params;
  if (periodIndex < 0 || periodIndex >= periodDivisions.length) {
    return { ok: false, error: 'Invalid period selected.' };
  }

  const safeNextDivision = sanitizeDivision(nextDivision);
  const byPeriod = getRotationsByPeriod(schedule, periodDivisions.length);
  const currentPeriodRotations = byPeriod[periodIndex];
  const currentDivision = currentPeriodRotations.length;

  if (currentDivision === 0) {
    return { ok: false, error: `Period ${periodIndex + 1} has no rotations.` };
  }

  if (safeNextDivision === currentDivision) {
    return {
      ok: true,
      schedule,
      periodDivisions: [...periodDivisions],
    };
  }

  let nextPeriodRotations: Rotation[] = [];

  if (safeNextDivision > currentDivision) {
    nextPeriodRotations = Array.from({ length: safeNextDivision }, (_, newIdx) => {
      const sourceIdx = Math.floor((newIdx * currentDivision) / safeNextDivision);
      return cloneRotation(currentPeriodRotations[sourceIdx]);
    });
  } else {
    const groups = Array.from({ length: safeNextDivision }, () => [] as Rotation[]);
    for (let i = 0; i < currentDivision; i++) {
      const groupIndex = Math.floor((i * safeNextDivision) / currentDivision);
      groups[groupIndex].push(currentPeriodRotations[i]);
    }

    for (const group of groups) {
      if (group.length <= 1) continue;
      const first = group[0];
      for (let i = 1; i < group.length; i++) {
        if (!rotationsEquivalent(first, group[i])) {
          return {
            ok: false,
            error: `Cannot merge period ${periodIndex + 1}: R${first.index + 1} and R${group[i].index + 1} differ.`,
          };
        }
      }
    }

    nextPeriodRotations = groups.map((group) => cloneRotation(group[0]));
  }

  const rebuiltRotations: Rotation[] = [];
  for (let p = 0; p < byPeriod.length; p++) {
    const sourceRotations =
      p === periodIndex ? nextPeriodRotations : byPeriod[p].map(cloneRotation);
    for (const rotation of sourceRotations) {
      rebuiltRotations.push({
        ...rotation,
        index: rebuiltRotations.length,
        periodIndex: p,
      });
    }
  }

  const rebuiltSchedule = rebuildScheduleWithRotations(schedule, rebuiltRotations, players);
  const nextPeriodDivisions = [...periodDivisions];
  nextPeriodDivisions[periodIndex] = safeNextDivision;

  return {
    ok: true,
    schedule: rebuiltSchedule,
    periodDivisions: nextPeriodDivisions,
  };
}

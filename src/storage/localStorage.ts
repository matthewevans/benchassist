import type { Team, Game } from '@/types/domain.ts';

const STORAGE_KEY = 'benchassist_data';

export interface StorageData {
  version: number;
  teams: Record<string, Team>;
  games: Record<string, Game>;
  favoriteDrillIds?: string[];
}

type RawStorageData = {
  version: number;
  teams: Record<string, unknown>;
  games: Record<string, unknown>;
  [key: string]: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/** v1→v2: Add gender field to all teams (default: 'coed') */
export function migrateV1toV2(data: RawStorageData): RawStorageData {
  const teams: Record<string, unknown> = {};
  for (const [id, team] of Object.entries(data.teams)) {
    const teamRecord = asRecord(team);
    teams[id] = { ...teamRecord, gender: teamRecord.gender ?? 'coed' };
  }
  return { ...data, version: 2, teams };
}

/** v2→v3: Add birthYear field to all teams (default: null) */
export function migrateV2toV3(data: RawStorageData): RawStorageData {
  const teams: Record<string, unknown> = {};
  for (const [id, team] of Object.entries(data.teams)) {
    const teamRecord = asRecord(team);
    teams[id] = {
      ...teamRecord,
      gender: teamRecord.gender ?? 'coed',
      birthYear: teamRecord.birthYear ?? null,
    };
  }
  return { ...data, version: 3, teams };
}

/** v3→v4: Convert balancePriority to skillBalance boolean */
export function migrateV3toV4(data: RawStorageData): RawStorageData {
  const teams: Record<string, unknown> = {};
  for (const [id, team] of Object.entries(data.teams)) {
    const teamRecord = asRecord(team);
    const gameConfigs = Array.isArray(teamRecord.gameConfigs) ? teamRecord.gameConfigs : [];
    teams[id] = {
      ...teamRecord,
      gameConfigs: gameConfigs.map((cfg) => {
        const cfgRecord = asRecord(cfg);
        const { balancePriority, ...rest } = cfgRecord;
        return { ...rest, skillBalance: balancePriority !== 'off' };
      }),
    };
  }
  return { ...data, version: 4, teams };
}

function readPositiveInt(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return null;
  return Math.floor(num);
}

function readNonNegativeInt(value: unknown): number | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.floor(num);
}

function inferPeriodCount(gameRecord: Record<string, unknown>): number {
  const schedule = asRecord(gameRecord.schedule);
  const rotations = Array.isArray(schedule.rotations) ? schedule.rotations : [];
  const maxPeriodIndex = rotations.reduce((max, rotation) => {
    const periodIndex = readNonNegativeInt(asRecord(rotation).periodIndex);
    return periodIndex == null ? max : Math.max(max, periodIndex + 1);
  }, 0);
  return Math.max(1, maxPeriodIndex || 0);
}

function inferDivisionFromSchedule(
  gameRecord: Record<string, unknown>,
  periodIndex: number,
): number {
  const schedule = asRecord(gameRecord.schedule);
  const rotations = Array.isArray(schedule.rotations) ? schedule.rotations : [];
  const count = rotations.filter((rotation) => {
    const period = Number(asRecord(rotation).periodIndex);
    return Number.isFinite(period) && Math.floor(period) === periodIndex;
  }).length;
  return Math.max(1, count || 1);
}

/** v4→v5: Add periodDivisions to games */
export function migrateV4toV5(data: RawStorageData): RawStorageData {
  const games: Record<string, unknown> = {};
  for (const [id, game] of Object.entries(data.games)) {
    const gameRecord = asRecord(game);
    const existingDivisions = Array.isArray(gameRecord.periodDivisions)
      ? gameRecord.periodDivisions
          .map((value) => readPositiveInt(value))
          .filter((v): v is number => v != null)
      : [];

    if (existingDivisions.length > 0) {
      games[id] = { ...gameRecord, periodDivisions: existingDivisions };
      continue;
    }

    const teamId = String(gameRecord.teamId ?? '');
    const configId = String(gameRecord.gameConfigId ?? '');
    const teamRecord = asRecord(data.teams[teamId]);
    const gameConfigs = Array.isArray(teamRecord.gameConfigs) ? teamRecord.gameConfigs : [];
    const config = gameConfigs.find((cfg) => String(asRecord(cfg).id ?? '') === configId);
    const configRecord = asRecord(config);

    const configuredPeriods = readPositiveInt(configRecord.periods);
    const configuredDivision = readPositiveInt(configRecord.rotationsPerPeriod);

    const periodCount = configuredPeriods ?? inferPeriodCount(gameRecord);
    const defaultDivision = configuredDivision ?? inferDivisionFromSchedule(gameRecord, 0);
    const periodDivisions = Array.from({ length: periodCount }, (_, periodIndex) => {
      const inferredForPeriod = inferDivisionFromSchedule(gameRecord, periodIndex);
      return configuredDivision ?? inferredForPeriod ?? defaultDivision;
    });

    games[id] = { ...gameRecord, periodDivisions };
  }

  return { ...data, version: 5, games };
}

const migrationSteps = [migrateV1toV2, migrateV2toV3, migrateV3toV4, migrateV4toV5];
export const CURRENT_VERSION = migrationSteps.length + 1;

function migrateData(data: RawStorageData): StorageData {
  let migrated = data;
  for (const step of migrationSteps) {
    if (migrated.version >= CURRENT_VERSION) break;
    try {
      migrated = step(migrated);
    } catch (error) {
      console.error(`Migration from v${migrated.version} failed:`, error);
      throw error;
    }
  }
  return migrated as unknown as StorageData;
}

function isValidStorageData(data: unknown): data is StorageData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.version !== 'number' || !d.teams || typeof d.teams !== 'object') return false;
  if (!d.games || typeof d.games !== 'object') return false;

  // Spot-check that teams and games have the expected shape
  for (const team of Object.values(d.teams as Record<string, unknown>)) {
    if (!team || typeof team !== 'object') return false;
    const t = team as Record<string, unknown>;
    if (typeof t.id !== 'string' || typeof t.name !== 'string' || !Array.isArray(t.rosters))
      return false;
  }
  for (const game of Object.values(d.games as Record<string, unknown>)) {
    if (!game || typeof game !== 'object') return false;
    const g = game as Record<string, unknown>;
    if (typeof g.id !== 'string' || typeof g.teamId !== 'string' || typeof g.status !== 'string')
      return false;
  }

  return true;
}

export function loadData(): StorageData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!isValidStorageData(parsed)) return null;

    if (parsed.version < CURRENT_VERSION) {
      return migrateData(parsed as unknown as RawStorageData);
    }

    return parsed;
  } catch {
    return null;
  }
}

export function normalizeImportedData(data: StorageData): StorageData {
  if (data.version < CURRENT_VERSION) {
    return migrateData(data as unknown as RawStorageData);
  }
  return data;
}

export function saveData(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded');
    }
  }
}

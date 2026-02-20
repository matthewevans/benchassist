import type { Team, Game } from '@/types/domain.ts';

const STORAGE_KEY = 'benchassist_data';
export const CURRENT_VERSION = 4;

export interface StorageData {
  version: number;
  teams: Record<string, Team>;
  games: Record<string, Game>;
  favoriteDrillIds?: string[];
}

type PreMigrationTeam = Omit<Team, 'gender' | 'birthYear'> & {
  gender?: Team['gender'];
  birthYear?: Team['birthYear'];
};

type PreV4GameConfig = Omit<import('@/types/domain.ts').GameConfig, 'skillBalance'> & {
  balancePriority?: 'strict' | 'balanced' | 'off';
  skillBalance?: boolean;
};

function migrateData(data: StorageData): StorageData {
  let migrated = data;
  if (migrated.version === 1) {
    // v1→v2: Add gender field to all teams (default: 'coed')
    const teams: Record<string, Team> = {};
    for (const [id, team] of Object.entries(migrated.teams as Record<string, PreMigrationTeam>)) {
      teams[id] = { ...team, gender: team.gender ?? 'coed' } as Team;
    }
    migrated = { ...migrated, version: 2, teams };
  }
  if (migrated.version === 2) {
    const teams: Record<string, Team> = {};
    for (const [id, team] of Object.entries(migrated.teams as Record<string, PreMigrationTeam>)) {
      teams[id] = {
        ...team,
        gender: team.gender ?? 'coed',
        birthYear: team.birthYear ?? null,
      } as Team;
    }
    migrated = { ...migrated, version: 3, teams };
  }
  if (migrated.version === 3) {
    // v3→v4: Convert balancePriority ('strict'|'balanced'|'off') to skillBalance (boolean)
    const teams: Record<string, Team> = {};
    for (const [id, team] of Object.entries(migrated.teams)) {
      teams[id] = {
        ...team,
        gameConfigs: team.gameConfigs.map((cfg) => {
          const old = cfg as unknown as PreV4GameConfig;
          const { balancePriority, ...rest } = old;
          return {
            ...rest,
            skillBalance: balancePriority !== 'off',
          } as import('@/types/domain.ts').GameConfig;
        }),
      };
    }
    migrated = { ...migrated, version: 4, teams };
  }
  return migrated;
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
      return migrateData(parsed);
    }

    return parsed;
  } catch {
    return null;
  }
}

export function normalizeImportedData(data: StorageData): StorageData {
  if (data.version < CURRENT_VERSION) {
    return migrateData(data);
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

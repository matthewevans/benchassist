import type { Team, Game } from '@/types/domain.ts';

const STORAGE_KEY = 'benchassist_data';
const CURRENT_VERSION = 1;

export interface StorageData {
  version: number;
  teams: Record<string, Team>;
  games: Record<string, Game>;
}

function migrateData(data: StorageData): StorageData {
  // Add migration steps here as the schema evolves:
  // if (data.version === 1) { data = migrateV1ToV2(data); }
  return data;
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

export function saveData(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded');
    }
  }
}

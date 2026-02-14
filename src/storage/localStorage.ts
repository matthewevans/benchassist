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

export function loadData(): StorageData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as StorageData;
    if (!parsed.version || !parsed.teams) return null;

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

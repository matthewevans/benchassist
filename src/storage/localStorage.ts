import type { Team, Game } from '@/types/domain.ts';

const STORAGE_KEY = 'benchassist_data';

export interface StorageData {
  version: number;
  teams: Record<string, Team>;
  games: Record<string, Game>;
}

export function loadData(): StorageData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as StorageData;
    if (!parsed.version || !parsed.teams) return null;
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

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

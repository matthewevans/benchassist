import { normalizeImportedData, type StorageData } from './localStorage.ts';
import type { TeamSelection } from '@/hooks/useSelectionState.ts';

interface ExportFormat {
  app: 'benchassist';
  version: number;
  exportedAt: number;
  data: StorageData;
}

export function exportToJSON(data: StorageData): string {
  const exportData: ExportFormat = {
    app: 'benchassist',
    version: 1,
    exportedAt: Date.now(),
    data,
  };
  return JSON.stringify(exportData, null, 2);
}

export function importFromJSON(json: string): StorageData {
  const parsed = JSON.parse(json) as ExportFormat;
  if (parsed.app !== 'benchassist' || !parsed.data) {
    throw new Error('Invalid BenchAssist export file');
  }
  const { data } = parsed;
  if (!data.teams || typeof data.teams !== 'object') {
    throw new Error('Invalid export: missing teams data');
  }
  if (!data.version || typeof data.version !== 'number') {
    throw new Error('Invalid export: missing version');
  }
  if (data.games && typeof data.games !== 'object') {
    throw new Error('Invalid export: malformed games data');
  }
  return normalizeImportedData({ ...data, games: data.games ?? {} });
}

export function downloadJSON(data: StorageData, filename?: string): void {
  const json = exportToJSON(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `benchassist-export-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareOrDownloadJSON(data: StorageData, filename?: string): Promise<void> {
  const name = filename ?? `benchassist-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const json = exportToJSON(data);
  const file = new File([json], name, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      // Share failed (e.g. macOS restrictions) — fall through to download
    }
  }

  downloadJSON(data, name);
}

export function exportToBase64(data: StorageData): string {
  const bytes = new TextEncoder().encode(exportToJSON(data));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function importFromBase64(text: string): StorageData {
  const binary = atob(text.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return importFromJSON(new TextDecoder().decode(bytes));
}

export function readJSONFile(file: File): Promise<StorageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        resolve(importFromJSON(json));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function filterStorageData(
  data: StorageData,
  selections: Record<string, TeamSelection>,
): StorageData {
  const teams: StorageData['teams'] = {};
  const games: StorageData['games'] = {};

  for (const [teamId, sel] of Object.entries(selections)) {
    const team = data.teams[teamId];
    if (!team) continue;
    if (!sel.rosters && !sel.configs && !sel.history) continue;

    teams[teamId] = {
      ...team,
      rosters: sel.rosters ? team.rosters : [],
      gameConfigs: sel.configs ? team.gameConfigs : [],
    };

    if (sel.history) {
      for (const [gameId, game] of Object.entries(data.games)) {
        if (game.teamId === teamId) {
          games[gameId] = game;
        }
      }
    }
  }

  return { version: data.version, teams, games };
}

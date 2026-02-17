import { normalizeImportedData, type StorageData } from './localStorage.ts';

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

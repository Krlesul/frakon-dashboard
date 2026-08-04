import { normalizeDashboard, type FrakonDashboardDocument } from './layout-model';

const STORAGE_PREFIX = 'frakon-dashboard:';

export interface DashboardStore {
  load(id: string): FrakonDashboardDocument | undefined;
  save(document: FrakonDashboardDocument): void;
  remove(id: string): void;
}

export class LocalDashboardStore implements DashboardStore {
  load(id: string): FrakonDashboardDocument | undefined {
    const raw = globalThis.localStorage?.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw) as FrakonDashboardDocument;
      if (parsed.version !== 1 || !Array.isArray(parsed.items)) return undefined;
      return normalizeDashboard(parsed);
    } catch {
      return undefined;
    }
  }

  save(document: FrakonDashboardDocument): void {
    globalThis.localStorage?.setItem(`${STORAGE_PREFIX}${document.id}`, JSON.stringify(normalizeDashboard(document)));
  }

  remove(id: string): void {
    globalThis.localStorage?.removeItem(`${STORAGE_PREFIX}${id}`);
  }
}

export function exportDashboard(document: FrakonDashboardDocument): string {
  return JSON.stringify(normalizeDashboard(document), null, 2);
}

export function importDashboard(source: string): FrakonDashboardDocument {
  const parsed = JSON.parse(source) as FrakonDashboardDocument;
  if (parsed.version !== 1 || !parsed.id || !Array.isArray(parsed.items)) {
    throw new Error('Unsupported FRAKON dashboard document.');
  }
  return normalizeDashboard(parsed);
}

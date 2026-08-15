import { isDashboardDocumentV1 } from './dashboard-document-codec';
import { findCollisions, normalizeDashboard, type FrakonDashboardDocument } from './layout-model';

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
      const parsed: unknown = JSON.parse(raw);
      return isDashboardDocumentV1(parsed) && parsed.id === id
        ? normalizeDashboard(parsed)
        : undefined;
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error('Invalid FRAKON dashboard JSON.');
  }
  if (!isDashboardDocumentV1(parsed)) {
    throw new Error('Invalid FRAKON dashboard payload.');
  }

  const normalized = normalizeDashboard(parsed);
  if (findCollisions(normalized.items).length > 0) {
    throw new Error('Imported FRAKON dashboard contains overlapping items.');
  }
  return normalized;
}

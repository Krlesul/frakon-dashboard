import { isDashboardDocumentV1 } from './dashboard-document-codec';
import type { FrakonDashboardDocument } from './layout-model';

const STORAGE_PREFIX = 'frakon-dashboard:';
const INVALID_DOCUMENT_MESSAGE = 'Invalid or non-canonical FRAKON dashboard document.';

export interface DashboardStore {
  load(id: string): FrakonDashboardDocument | undefined;
  save(document: FrakonDashboardDocument): void;
  remove(id: string): void;
}

export class LocalDashboardStore implements DashboardStore {
  constructor(private readonly storage: Storage | undefined = globalThis.localStorage) {}

  load(id: string): FrakonDashboardDocument | undefined {
    const raw = this.storage?.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isDashboardDocumentV1(parsed) && parsed.id === id
        ? structuredClone(parsed)
        : undefined;
    } catch {
      return undefined;
    }
  }

  save(document: FrakonDashboardDocument): void {
    if (!isDashboardDocumentV1(document)) throw new Error(INVALID_DOCUMENT_MESSAGE);
    const exact = structuredClone(document);
    this.storage?.setItem(`${STORAGE_PREFIX}${exact.id}`, JSON.stringify(exact));
  }

  remove(id: string): void {
    this.storage?.removeItem(`${STORAGE_PREFIX}${id}`);
  }
}

export function exportDashboard(document: FrakonDashboardDocument): string {
  if (!isDashboardDocumentV1(document)) throw new Error(INVALID_DOCUMENT_MESSAGE);
  return JSON.stringify(structuredClone(document), null, 2);
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
  return structuredClone(parsed);
}

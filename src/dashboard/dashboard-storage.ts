import { normalizeDashboard, type FrakonDashboardDocument } from './layout-model';

const STORAGE_PREFIX = 'frakon-dashboard:';

export interface DashboardStorageAdapter {
  readonly kind: string;
  load(id: string): Promise<FrakonDashboardDocument | undefined>;
  save(document: FrakonDashboardDocument): Promise<void>;
  remove(id: string): Promise<void>;
}

export class LocalStorageDashboardAdapter implements DashboardStorageAdapter {
  readonly kind = 'local-storage';

  constructor(private readonly storage: Storage | undefined = globalThis.localStorage) {}

  async load(id: string): Promise<FrakonDashboardDocument | undefined> {
    const raw = this.storage?.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw) as FrakonDashboardDocument;
      if (parsed.version !== 1 || !Array.isArray(parsed.items)) return undefined;
      return normalizeDashboard(parsed);
    } catch {
      return undefined;
    }
  }

  async save(document: FrakonDashboardDocument): Promise<void> {
    this.storage?.setItem(`${STORAGE_PREFIX}${document.id}`, JSON.stringify(normalizeDashboard(document)));
  }

  async remove(id: string): Promise<void> {
    this.storage?.removeItem(`${STORAGE_PREFIX}${id}`);
  }
}

export class MemoryDashboardStorageAdapter implements DashboardStorageAdapter {
  readonly kind = 'memory';
  private readonly documents = new Map<string, FrakonDashboardDocument>();

  async load(id: string): Promise<FrakonDashboardDocument | undefined> {
    const document = this.documents.get(id);
    return document ? structuredClone(document) : undefined;
  }

  async save(document: FrakonDashboardDocument): Promise<void> {
    this.documents.set(document.id, structuredClone(normalizeDashboard(document)));
  }

  async remove(id: string): Promise<void> {
    this.documents.delete(id);
  }
}

export function createDefaultDashboardStorage(): DashboardStorageAdapter {
  return new LocalStorageDashboardAdapter();
}

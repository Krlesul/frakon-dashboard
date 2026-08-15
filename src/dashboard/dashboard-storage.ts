import { isDashboardDocumentV1 } from './dashboard-document-codec';
import { normalizeDashboard, type FrakonDashboardDocument } from './layout-model';

const STORAGE_PREFIX = 'frakon-dashboard:';

export interface DashboardStorageAdapter {
  readonly kind: string;
  load(id: string): Promise<FrakonDashboardDocument | undefined>;
  save(document: FrakonDashboardDocument): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface DashboardStorageTransport {
  request<T>(command: string, payload: Record<string, unknown>): Promise<T>;
}

export class LocalStorageDashboardAdapter implements DashboardStorageAdapter {
  readonly kind = 'local-storage';

  constructor(private readonly storage: Storage | undefined = globalThis.localStorage) {}

  async load(id: string): Promise<FrakonDashboardDocument | undefined> {
    const raw = this.storage?.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isDashboardDocumentV1(parsed) ? normalizeDashboard(parsed) : undefined;
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

export class RemoteDashboardStorageAdapter implements DashboardStorageAdapter {
  readonly kind = 'remote';

  constructor(
    private readonly transport: DashboardStorageTransport,
    private readonly namespace = 'frakon/dashboard',
  ) {}

  async load(id: string): Promise<FrakonDashboardDocument | undefined> {
    const document = await this.transport.request<unknown>(`${this.namespace}/load`, { dashboard_id: id });
    return isDashboardDocumentV1(document) ? normalizeDashboard(document) : undefined;
  }

  async save(document: FrakonDashboardDocument): Promise<void> {
    await this.transport.request(`${this.namespace}/save`, { document: normalizeDashboard(document) });
  }

  async remove(id: string): Promise<void> {
    await this.transport.request(`${this.namespace}/remove`, { dashboard_id: id });
  }
}

export function createDefaultDashboardStorage(): DashboardStorageAdapter {
  return new LocalStorageDashboardAdapter();
}

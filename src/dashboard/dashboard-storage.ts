import { isDashboardDocumentV1 } from './dashboard-document-codec';
import type { FrakonDashboardDocument } from './layout-model';

const STORAGE_PREFIX = 'frakon-dashboard:';
const INVALID_DOCUMENT_MESSAGE = 'Invalid or non-canonical FRAKON dashboard document.';

export interface DashboardStorageAdapter {
  readonly kind: string;
  load(id: string): Promise<FrakonDashboardDocument | undefined>;
  save(document: FrakonDashboardDocument): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface DashboardStorageTransport {
  request<T>(command: string, payload: Record<string, unknown>): Promise<T>;
}

function validatedDocument(
  value: unknown,
  expectedId?: string,
): FrakonDashboardDocument | undefined {
  if (!isDashboardDocumentV1(value)) return undefined;
  if (expectedId !== undefined && value.id !== expectedId) return undefined;
  return structuredClone(value);
}

function requireValidDocument(document: FrakonDashboardDocument): FrakonDashboardDocument {
  const validated = validatedDocument(document);
  if (!validated) throw new Error(INVALID_DOCUMENT_MESSAGE);
  return validated;
}

export class LocalStorageDashboardAdapter implements DashboardStorageAdapter {
  readonly kind = 'local-storage';

  constructor(private readonly storage: Storage | undefined = globalThis.localStorage) {}

  async load(id: string): Promise<FrakonDashboardDocument | undefined> {
    const raw = this.storage?.getItem(`${STORAGE_PREFIX}${id}`);
    if (!raw) return undefined;
    try {
      return validatedDocument(JSON.parse(raw) as unknown, id);
    } catch {
      return undefined;
    }
  }

  async save(document: FrakonDashboardDocument): Promise<void> {
    const exact = requireValidDocument(document);
    this.storage?.setItem(`${STORAGE_PREFIX}${exact.id}`, JSON.stringify(exact));
  }

  async remove(id: string): Promise<void> {
    this.storage?.removeItem(`${STORAGE_PREFIX}${id}`);
  }
}

export class MemoryDashboardStorageAdapter implements DashboardStorageAdapter {
  readonly kind = 'memory';
  private readonly documents = new Map<string, FrakonDashboardDocument>();

  async load(id: string): Promise<FrakonDashboardDocument | undefined> {
    return validatedDocument(this.documents.get(id), id);
  }

  async save(document: FrakonDashboardDocument): Promise<void> {
    const exact = requireValidDocument(document);
    this.documents.set(exact.id, exact);
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
    return validatedDocument(document, id);
  }

  async save(document: FrakonDashboardDocument): Promise<void> {
    const exact = requireValidDocument(document);
    await this.transport.request(`${this.namespace}/save`, { document: exact });
  }

  async remove(id: string): Promise<void> {
    await this.transport.request(`${this.namespace}/remove`, { dashboard_id: id });
  }
}

export function createDefaultDashboardStorage(): DashboardStorageAdapter {
  return new LocalStorageDashboardAdapter();
}

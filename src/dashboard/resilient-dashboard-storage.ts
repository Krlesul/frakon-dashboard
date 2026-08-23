import { isDashboardDocumentV1 } from './dashboard-document-codec';
import type { FrakonDashboardDocument } from './layout-model';
import type { DashboardStorageAdapter } from './dashboard-storage';

export type DashboardSyncOperation =
  | { kind: 'save'; id: string; document: FrakonDashboardDocument; queuedAt: number }
  | { kind: 'remove'; id: string; queuedAt: number };

export interface DashboardSyncQueue {
  list(): Promise<DashboardSyncOperation[]>;
  put(operation: DashboardSyncOperation): Promise<void>;
  delete(id: string): Promise<void>;
}

const INVALID_DOCUMENT_MESSAGE = 'Invalid or non-canonical FRAKON dashboard document.';
const INVALID_OPERATION_MESSAGE = 'Invalid FRAKON dashboard sync operation.';

export class MemoryDashboardSyncQueue implements DashboardSyncQueue {
  private readonly operations = new Map<string, DashboardSyncOperation>();

  async list(): Promise<DashboardSyncOperation[]> {
    return [...this.operations.values()]
      .filter(isDashboardSyncOperation)
      .map((operation) => structuredClone(operation))
      .sort((a, b) => a.queuedAt - b.queuedAt);
  }

  async put(operation: DashboardSyncOperation): Promise<void> {
    const exact = requireSyncOperation(operation);
    this.operations.set(exact.id, exact);
  }

  async delete(id: string): Promise<void> {
    requireIdentifier(id);
    this.operations.delete(id);
  }
}

export class LocalStorageDashboardSyncQueue implements DashboardSyncQueue {
  constructor(
    private readonly storage: Storage | undefined = globalThis.localStorage,
    private readonly key = 'frakon-dashboard:sync-queue',
  ) {}

  async list(): Promise<DashboardSyncOperation[]> {
    const raw = this.storage?.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(isDashboardSyncOperation)
        .map((operation) => structuredClone(operation))
        .sort((a, b) => a.queuedAt - b.queuedAt);
    } catch {
      return [];
    }
  }

  async put(operation: DashboardSyncOperation): Promise<void> {
    const exact = requireSyncOperation(operation);
    const operations = new Map((await this.list()).map((entry) => [entry.id, entry]));
    operations.set(exact.id, exact);
    this.write([...operations.values()]);
  }

  async delete(id: string): Promise<void> {
    requireIdentifier(id);
    this.write((await this.list()).filter((operation) => operation.id !== id));
  }

  private write(operations: DashboardSyncOperation[]): void {
    const exact = operations.map((operation) => requireSyncOperation(operation));
    this.storage?.setItem(this.key, JSON.stringify(exact));
  }
}

export interface ResilientDashboardStorageState {
  mode: 'primary' | 'fallback';
  syncing: boolean;
  pending: number;
  error?: Error;
}

export type ResilientDashboardStorageListener = (state: ResilientDashboardStorageState) => void;

export class ResilientDashboardStorageAdapter implements DashboardStorageAdapter {
  readonly kind = 'resilient';
  private state: ResilientDashboardStorageState = { mode: 'primary', syncing: false, pending: 0 };
  private readonly listeners = new Set<ResilientDashboardStorageListener>();
  private synchronizePromise?: Promise<void>;

  constructor(
    private readonly primary: DashboardStorageAdapter,
    private readonly fallback: DashboardStorageAdapter,
    private readonly queue: DashboardSyncQueue = new LocalStorageDashboardSyncQueue(),
  ) {}

  get currentState(): ResilientDashboardStorageState {
    return { ...this.state };
  }

  subscribe(listener: ResilientDashboardStorageListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  async load(id: string): Promise<FrakonDashboardDocument | undefined> {
    requireIdentifier(id);
    try {
      const document = await this.primary.load(id);
      this.patchState({ mode: 'primary', error: undefined });
      if (document) {
        const exact = requireDashboardDocument(document, id);
        await this.fallback.save(exact);
        return structuredClone(exact);
      }
      return this.loadFallback(id);
    } catch (error) {
      this.patchState({ mode: 'fallback', error: toError(error) });
      return this.loadFallback(id);
    } finally {
      await this.refreshPending();
    }
  }

  async save(document: FrakonDashboardDocument): Promise<void> {
    const exact = requireDashboardDocument(document);
    await this.fallback.save(exact);
    try {
      await this.primary.save(exact);
      await this.queue.delete(exact.id);
      this.patchState({ mode: 'primary', error: undefined });
    } catch (error) {
      await this.queue.put({
        kind: 'save',
        id: exact.id,
        document: structuredClone(exact),
        queuedAt: Date.now(),
      });
      this.patchState({ mode: 'fallback', error: toError(error) });
    } finally {
      await this.refreshPending();
    }
  }

  async remove(id: string): Promise<void> {
    requireIdentifier(id);
    await this.fallback.remove(id);
    try {
      await this.primary.remove(id);
      await this.queue.delete(id);
      this.patchState({ mode: 'primary', error: undefined });
    } catch (error) {
      await this.queue.put({ kind: 'remove', id, queuedAt: Date.now() });
      this.patchState({ mode: 'fallback', error: toError(error) });
    } finally {
      await this.refreshPending();
    }
  }

  synchronize(): Promise<void> {
    if (this.synchronizePromise) return this.synchronizePromise;
    this.synchronizePromise = this.runSynchronization().finally(() => {
      this.synchronizePromise = undefined;
    });
    return this.synchronizePromise;
  }

  private async runSynchronization(): Promise<void> {
    this.patchState({ syncing: true, error: undefined });
    try {
      for (const candidate of await this.queue.list()) {
        const operation = requireSyncOperation(candidate);
        if (operation.kind === 'save') await this.primary.save(operation.document);
        else await this.primary.remove(operation.id);
        await this.queue.delete(operation.id);
      }
      this.patchState({ mode: 'primary', error: undefined });
    } catch (error) {
      this.patchState({ mode: 'fallback', error: toError(error) });
    } finally {
      await this.refreshPending();
      this.patchState({ syncing: false });
    }
  }

  private async loadFallback(id: string): Promise<FrakonDashboardDocument | undefined> {
    const document = await this.fallback.load(id);
    return document ? requireDashboardDocument(document, id) : undefined;
  }

  private async refreshPending(): Promise<void> {
    const operations = await this.queue.list();
    this.patchState({ pending: operations.filter(isDashboardSyncOperation).length });
  }

  private patchState(patch: Partial<ResilientDashboardStorageState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.currentState);
  }
}

function isDashboardSyncOperation(value: unknown): value is DashboardSyncOperation {
  if (!value || typeof value !== 'object') return false;
  const operation = value as Record<string, unknown>;
  if (operation.kind !== 'save' && operation.kind !== 'remove') return false;
  if (typeof operation.id !== 'string' || !validIdentifier(operation.id)) return false;
  if (typeof operation.queuedAt !== 'number'
    || !Number.isSafeInteger(operation.queuedAt)
    || operation.queuedAt < 0) return false;
  if (operation.kind === 'remove') return true;
  if (!isDashboardDocumentV1(operation.document)) return false;
  return operation.document.id === operation.id;
}

function requireSyncOperation(value: unknown): DashboardSyncOperation {
  if (!isDashboardSyncOperation(value)) throw new Error(INVALID_OPERATION_MESSAGE);
  return structuredClone(value);
}

function requireDashboardDocument(
  value: unknown,
  expectedId?: string,
): FrakonDashboardDocument {
  if (!isDashboardDocumentV1(value)
    || (expectedId !== undefined && value.id !== expectedId)) {
    throw new Error(INVALID_DOCUMENT_MESSAGE);
  }
  return structuredClone(value);
}

function validIdentifier(value: string): boolean {
  return value.length > 0 && value.length <= 128;
}

function requireIdentifier(value: string): void {
  if (!validIdentifier(value)) throw new Error('Dashboard id must be a non-empty string up to 128 characters.');
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

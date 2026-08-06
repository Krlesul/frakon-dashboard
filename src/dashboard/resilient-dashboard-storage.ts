import { normalizeAndCompactDashboard, type FrakonDashboardDocument } from './layout-model';
import type { DashboardStorageAdapter } from './dashboard-storage';

export type DashboardSyncOperation =
  | { kind: 'save'; id: string; document: FrakonDashboardDocument; queuedAt: number }
  | { kind: 'remove'; id: string; queuedAt: number };

export interface DashboardSyncQueue {
  list(): Promise<DashboardSyncOperation[]>;
  put(operation: DashboardSyncOperation): Promise<void>;
  delete(id: string): Promise<void>;
}

export class MemoryDashboardSyncQueue implements DashboardSyncQueue {
  private readonly operations = new Map<string, DashboardSyncOperation>();

  async list(): Promise<DashboardSyncOperation[]> {
    return [...this.operations.values()]
      .sort((left, right) => left.queuedAt - right.queuedAt)
      .map((operation) => structuredClone(operation));
  }

  async put(operation: DashboardSyncOperation): Promise<void> {
    this.operations.set(operation.id, structuredClone(operation));
  }

  async delete(id: string): Promise<void> {
    this.operations.delete(id);
  }
}

const DEFAULT_QUEUE_KEY = 'frakon-dashboard:sync-queue';

export class LocalStorageDashboardSyncQueue implements DashboardSyncQueue {
  constructor(
    private readonly storage: Storage | undefined = globalThis.localStorage,
    private readonly key = DEFAULT_QUEUE_KEY,
  ) {}

  async list(): Promise<DashboardSyncOperation[]> {
    const raw = this.storage?.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as DashboardSyncOperation[];
      return Array.isArray(parsed)
        ? parsed.filter(isDashboardSyncOperation).sort((a, b) => a.queuedAt - b.queuedAt)
        : [];
    } catch {
      return [];
    }
  }

  async put(operation: DashboardSyncOperation): Promise<void> {
    const operations = await this.list();
    const next = operations.filter((entry) => entry.id !== operation.id);
    next.push(structuredClone(operation));
    this.storage?.setItem(this.key, JSON.stringify(next));
  }

  async delete(id: string): Promise<void> {
    const next = (await this.list()).filter((operation) => operation.id !== id);
    if (next.length === 0) this.storage?.removeItem(this.key);
    else this.storage?.setItem(this.key, JSON.stringify(next));
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
  private syncPromise?: Promise<void>;

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
    try {
      const remote = await this.primary.load(id);
      this.patchState({ mode: 'primary', error: undefined });
      if (remote) await this.fallback.save(remote);
      await this.refreshPending();
      return remote ?? this.fallback.load(id);
    } catch (error) {
      this.patchState({ mode: 'fallback', error: toError(error) });
      await this.refreshPending();
      return this.fallback.load(id);
    }
  }

  async save(document: FrakonDashboardDocument): Promise<void> {
    const normalized = normalizeAndCompactDashboard(document);
    await this.fallback.save(normalized);
    try {
      await this.primary.save(normalized);
      await this.queue.delete(normalized.id);
      this.patchState({ mode: 'primary', error: undefined });
    } catch (error) {
      await this.queue.put({ kind: 'save', id: normalized.id, document: normalized, queuedAt: Date.now() });
      this.patchState({ mode: 'fallback', error: toError(error) });
    }
    await this.refreshPending();
  }

  async remove(id: string): Promise<void> {
    await this.fallback.remove(id);
    try {
      await this.primary.remove(id);
      await this.queue.delete(id);
      this.patchState({ mode: 'primary', error: undefined });
    } catch (error) {
      await this.queue.put({ kind: 'remove', id, queuedAt: Date.now() });
      this.patchState({ mode: 'fallback', error: toError(error) });
    }
    await this.refreshPending();
  }

  synchronize(): Promise<void> {
    if (this.syncPromise) return this.syncPromise;
    this.syncPromise = this.runSynchronization().finally(() => {
      this.syncPromise = undefined;
    });
    return this.syncPromise;
  }

  private async runSynchronization(): Promise<void> {
    this.patchState({ syncing: true });
    try {
      for (const operation of await this.queue.list()) {
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

  private async refreshPending(): Promise<void> {
    this.patchState({ pending: (await this.queue.list()).length });
  }

  private patchState(patch: Partial<ResilientDashboardStorageState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.currentState);
  }
}

function isDashboardSyncOperation(value: unknown): value is DashboardSyncOperation {
  if (!value || typeof value !== 'object') return false;
  const operation = value as Partial<DashboardSyncOperation>;
  if (operation.kind !== 'save' && operation.kind !== 'remove') return false;
  if (typeof operation.id !== 'string' || typeof operation.queuedAt !== 'number') return false;
  return operation.kind === 'remove' || Boolean(operation.document);
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

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

export class MemoryDashboardSyncQueue implements DashboardSyncQueue {
  private readonly operations = new Map<string, DashboardSyncOperation>();

  async list(): Promise<DashboardSyncOperation[]> {
    return [...this.operations.values()]
      .map((operation) => structuredClone(operation))
      .sort((a, b) => a.queuedAt - b.queuedAt);
  }

  async put(operation: DashboardSyncOperation): Promise<void> {
    this.operations.set(operation.id, structuredClone(operation));
  }

  async delete(id: string): Promise<void> {
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
      return parsed.filter(isDashboardSyncOperation).sort((a, b) => a.queuedAt - b.queuedAt);
    } catch {
      return [];
    }
  }

  async put(operation: DashboardSyncOperation): Promise<void> {
    const operations = new Map((await this.list()).map((entry) => [entry.id, entry]));
    operations.set(operation.id, structuredClone(operation));
    this.write([...operations.values()]);
  }

  async delete(id: string): Promise<void> {
    this.write((await this.list()).filter((operation) => operation.id !== id));
  }

  private write(operations: DashboardSyncOperation[]): void {
    this.storage?.setItem(this.key, JSON.stringify(operations));
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
    try {
      const document = await this.primary.load(id);
      this.patchState({ mode: 'primary', error: undefined });
      if (document) await this.fallback.save(document);
      return document ?? this.fallback.load(id);
    } catch (error) {
      this.patchState({ mode: 'fallback', error: toError(error) });
      return this.fallback.load(id);
    } finally {
      await this.refreshPending();
    }
  }

  async save(document: FrakonDashboardDocument): Promise<void> {
    await this.fallback.save(document);
    try {
      await this.primary.save(document);
      await this.queue.delete(document.id);
      this.patchState({ mode: 'primary', error: undefined });
    } catch (error) {
      await this.queue.put({
        kind: 'save',
        id: document.id,
        document: structuredClone(document),
        queuedAt: Date.now(),
      });
      this.patchState({ mode: 'fallback', error: toError(error) });
    } finally {
      await this.refreshPending();
    }
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
  const operation = value as Record<string, unknown>;
  if (operation.kind !== 'save' && operation.kind !== 'remove') return false;
  if (typeof operation.id !== 'string' || typeof operation.queuedAt !== 'number') return false;
  if (operation.kind === 'remove') return true;
  return Boolean(operation.document && typeof operation.document === 'object');
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

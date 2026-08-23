import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocument } from './layout-model';
import {
  LocalStorageDashboardSyncQueue,
  MemoryDashboardSyncQueue,
  ResilientDashboardStorageAdapter,
  type DashboardSyncOperation,
  type DashboardSyncQueue,
} from './resilient-dashboard-storage';
import { MemoryDashboardStorageAdapter, type DashboardStorageAdapter } from './dashboard-storage';

function dashboard(revision: number): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'home',
    title: `Home ${revision}`,
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 80,
    gap: 12,
    items: [],
  };
}

function exactDashboard(): FrakonDashboardDocument {
  return {
    ...dashboard(9),
    items: [
      { id: 'front', x: 8, y: 7, w: 3, h: 2, card: { type: 'custom:front' } },
      { id: 'hidden', x: 1, y: 4, w: 2, h: 2, hidden: true, card: { type: 'custom:hidden' } },
      { id: 'back', x: 0, y: 0, w: 2, h: 2, card: { type: 'custom:back' } },
    ],
    constraints: [
      { id: 'hidden-left-front', kind: 'align-left', sourceId: 'hidden', targetId: 'front', priority: 40 },
    ],
  };
}

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key: string) { return values.get(key) ?? null; },
    key(index: number) { return [...values.keys()][index] ?? null; },
    removeItem(key: string) { values.delete(key); },
    setItem(key: string, value: string) { values.set(key, value); },
  };
}

class ToggleAdapter implements DashboardStorageAdapter {
  readonly kind = 'remote';
  readonly delegate = new MemoryDashboardStorageAdapter();
  online = true;

  private assertOnline(): void {
    if (!this.online) throw new Error('offline');
  }

  async load(id: string) {
    this.assertOnline();
    return this.delegate.load(id);
  }

  async save(document: FrakonDashboardDocument): Promise<void> {
    this.assertOnline();
    await this.delegate.save(document);
  }

  async remove(id: string): Promise<void> {
    this.assertOnline();
    await this.delegate.remove(id);
  }
}

describe('ResilientDashboardStorageAdapter', () => {
  it('stores locally and queues the newest save while primary storage is offline', async () => {
    const primary = new ToggleAdapter();
    const fallback = new MemoryDashboardStorageAdapter();
    const queue = new MemoryDashboardSyncQueue();
    const storage = new ResilientDashboardStorageAdapter(primary, fallback, queue);
    primary.online = false;

    await storage.save(dashboard(1));
    await storage.save(dashboard(2));

    expect((await fallback.load('home'))?.title).toBe('Home 2');
    expect(await queue.list()).toHaveLength(1);
    expect(storage.currentState.mode).toBe('fallback');
    expect(storage.currentState.pending).toBe(1);
  });

  it('synchronizes queued saves after primary storage returns', async () => {
    const primary = new ToggleAdapter();
    const fallback = new MemoryDashboardStorageAdapter();
    const queue = new MemoryDashboardSyncQueue();
    const storage = new ResilientDashboardStorageAdapter(primary, fallback, queue);
    primary.online = false;
    await storage.save(dashboard(3));

    primary.online = true;
    await storage.synchronize();

    expect((await primary.load('home'))?.title).toBe('Home 3');
    expect(await queue.list()).toHaveLength(0);
    expect(storage.currentState.mode).toBe('primary');
    expect(storage.currentState.pending).toBe(0);
  });

  it('replays exact hidden geometry, z-order and constraints after reconnecting', async () => {
    const primary = new ToggleAdapter();
    const fallback = new MemoryDashboardStorageAdapter();
    const queue = new MemoryDashboardSyncQueue();
    const storage = new ResilientDashboardStorageAdapter(primary, fallback, queue);
    const exact = exactDashboard();
    primary.online = false;

    await storage.save(exact);
    const queued = await queue.list();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.kind).toBe('save');
    if (queued[0]?.kind !== 'save') throw new Error('Expected queued save.');
    expect(queued[0].document.items).toEqual(exact.items);
    expect(queued[0].document.constraints).toEqual(exact.constraints);

    primary.online = true;
    await storage.synchronize();
    const loaded = await primary.load('home');
    expect(loaded?.items).toEqual(exact.items);
    expect(loaded?.constraints).toEqual(exact.constraints);
  });

  it('queues removals and replays them after reconnecting', async () => {
    const primary = new ToggleAdapter();
    const fallback = new MemoryDashboardStorageAdapter();
    const queue = new MemoryDashboardSyncQueue();
    const storage = new ResilientDashboardStorageAdapter(primary, fallback, queue);
    await primary.save(dashboard(4));
    await fallback.save(dashboard(4));
    primary.online = false;

    await storage.remove('home');
    expect(await fallback.load('home')).toBeUndefined();
    expect((await queue.list())[0]?.kind).toBe('remove');

    primary.online = true;
    await storage.synchronize();
    expect(await primary.load('home')).toBeUndefined();
  });

  it('loads the fallback copy when primary storage is unavailable', async () => {
    const primary = new ToggleAdapter();
    const fallback = new MemoryDashboardStorageAdapter();
    const storage = new ResilientDashboardStorageAdapter(primary, fallback, new MemoryDashboardSyncQueue());
    await fallback.save(dashboard(5));
    primary.online = false;

    expect((await storage.load('home'))?.title).toBe('Home 5');
    expect(storage.currentState.mode).toBe('fallback');
  });

  it('does not leak an invalid document returned by a custom primary adapter', async () => {
    const fallback = new MemoryDashboardStorageAdapter();
    await fallback.save(dashboard(6));
    const invalid = { ...dashboard(99), rowHeight: 8 };
    const primary: DashboardStorageAdapter = {
      kind: 'raw-primary',
      load: async () => invalid,
      save: async () => undefined,
      remove: async () => undefined,
    };
    const storage = new ResilientDashboardStorageAdapter(primary, fallback, new MemoryDashboardSyncQueue());

    expect((await storage.load('home'))?.title).toBe('Home 6');
    expect(storage.currentState.mode).toBe('fallback');
    expect(storage.currentState.error?.message).toMatch(/non-canonical/i);
  });

  it('rejects an invalid fallback document instead of returning repaired state', async () => {
    const primary: DashboardStorageAdapter = {
      kind: 'offline',
      load: async () => { throw new Error('offline'); },
      save: async () => { throw new Error('offline'); },
      remove: async () => { throw new Error('offline'); },
    };
    const invalid = { ...dashboard(7), rowHeight: 8 };
    const fallback: DashboardStorageAdapter = {
      kind: 'raw-fallback',
      load: async () => invalid,
      save: async () => undefined,
      remove: async () => undefined,
    };
    const storage = new ResilientDashboardStorageAdapter(primary, fallback, new MemoryDashboardSyncQueue());

    await expect(storage.load('home')).rejects.toThrow(/non-canonical/i);
  });

  it('blocks an invalid save before either custom adapter or queue sees it', async () => {
    let primarySaves = 0;
    let fallbackSaves = 0;
    const primary: DashboardStorageAdapter = {
      kind: 'permissive-primary',
      load: async () => undefined,
      save: async () => { primarySaves += 1; },
      remove: async () => undefined,
    };
    const fallback: DashboardStorageAdapter = {
      kind: 'permissive-fallback',
      load: async () => undefined,
      save: async () => { fallbackSaves += 1; },
      remove: async () => undefined,
    };
    const queue = new MemoryDashboardSyncQueue();
    const storage = new ResilientDashboardStorageAdapter(primary, fallback, queue);

    await expect(storage.save({ ...dashboard(8), rowHeight: 8 })).rejects.toThrow(/non-canonical/i);
    expect(primarySaves).toBe(0);
    expect(fallbackSaves).toBe(0);
    expect(await queue.list()).toEqual([]);
  });

  it('filters malformed or mismatched local-storage sync operations before replay', async () => {
    const validRemove = { kind: 'remove', id: 'old', queuedAt: 1 };
    const malformedSave = {
      kind: 'save',
      id: 'home',
      queuedAt: 2,
      document: {
        version: 1,
        id: 'home',
        title: 'Broken',
        breakpoint: 'desktop',
        columns: 12,
        rowHeight: 80,
        gap: 12,
        items: [{ id: 'bad', card: {}, x: 0, y: 0, w: 'bad', h: 2 }],
      },
    };
    const mismatchedSave = {
      kind: 'save',
      id: 'other',
      queuedAt: 3,
      document: exactDashboard(),
    };
    const fractionalTimestamp = { kind: 'remove', id: 'fractional', queuedAt: 3.5 };
    const backing = memoryStorage({
      'frakon-dashboard:sync-queue': JSON.stringify([
        validRemove,
        malformedSave,
        mismatchedSave,
        fractionalTimestamp,
      ]),
    });
    const queue = new LocalStorageDashboardSyncQueue(backing);

    expect(await queue.list()).toEqual([validRemove]);
  });

  it('rejects malformed operations written directly to memory or local queues', async () => {
    const invalidSave = {
      kind: 'save',
      id: 'home',
      queuedAt: 1,
      document: { ...dashboard(10), rowHeight: 8 },
    } as unknown as DashboardSyncOperation;
    const invalidRemove = {
      kind: 'remove',
      id: '',
      queuedAt: 1,
    } as unknown as DashboardSyncOperation;

    const memory = new MemoryDashboardSyncQueue();
    await expect(memory.put(invalidSave)).rejects.toThrow(/invalid.*sync operation/i);
    await expect(memory.put(invalidRemove)).rejects.toThrow(/invalid.*sync operation/i);
    expect(await memory.list()).toEqual([]);

    const local = new LocalStorageDashboardSyncQueue(memoryStorage());
    await expect(local.put(invalidSave)).rejects.toThrow(/invalid.*sync operation/i);
    expect(await local.list()).toEqual([]);
  });

  it('refuses to replay an invalid operation returned by a custom queue', async () => {
    let primarySaves = 0;
    const primary: DashboardStorageAdapter = {
      kind: 'permissive-primary',
      load: async () => undefined,
      save: async () => { primarySaves += 1; },
      remove: async () => undefined,
    };
    const corruptOperation = {
      kind: 'save',
      id: 'home',
      queuedAt: 1,
      document: { ...dashboard(11), rowHeight: 8 },
    } as unknown as DashboardSyncOperation;
    const queue: DashboardSyncQueue = {
      list: async () => [corruptOperation],
      put: async () => undefined,
      delete: async () => undefined,
    };
    const storage = new ResilientDashboardStorageAdapter(
      primary,
      new MemoryDashboardStorageAdapter(),
      queue,
    );

    await storage.synchronize();

    expect(primarySaves).toBe(0);
    expect(storage.currentState.mode).toBe('fallback');
    expect(storage.currentState.error?.message).toMatch(/invalid.*sync operation/i);
  });
});

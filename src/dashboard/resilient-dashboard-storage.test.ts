import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocument } from './layout-model';
import {
  LocalStorageDashboardSyncQueue,
  MemoryDashboardSyncQueue,
  ResilientDashboardStorageAdapter,
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
    const backing = memoryStorage({
      'frakon-dashboard:sync-queue': JSON.stringify([validRemove, malformedSave, mismatchedSave]),
    });
    const queue = new LocalStorageDashboardSyncQueue(backing);

    expect(await queue.list()).toEqual([validRemove]);
  });
});

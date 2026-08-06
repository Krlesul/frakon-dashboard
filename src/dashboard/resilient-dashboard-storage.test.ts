import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocument } from './layout-model';
import {
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
});

import { describe, expect, it } from 'vitest';
import { DashboardSyncCoordinator, type DashboardConnectivitySource } from './dashboard-sync-coordinator';
import { MemoryDashboardSyncQueue, ResilientDashboardStorageAdapter } from './resilient-dashboard-storage';
import { MemoryDashboardStorageAdapter, type DashboardStorageAdapter } from './dashboard-storage';
import type { FrakonDashboardDocument } from './layout-model';

class Connectivity implements DashboardConnectivitySource {
  online = false;
  private listener?: (online: boolean) => void;
  subscribe(listener: (online: boolean) => void): () => void {
    this.listener = listener;
    return () => { this.listener = undefined; };
  }
  setOnline(online: boolean): void {
    this.online = online;
    this.listener?.(online);
  }
}

class ToggleAdapter implements DashboardStorageAdapter {
  readonly kind = 'remote';
  readonly delegate = new MemoryDashboardStorageAdapter();
  online = false;
  private assertOnline(): void {
    if (!this.online) throw new Error('offline');
  }
  async load(id: string) { this.assertOnline(); return this.delegate.load(id); }
  async save(document: FrakonDashboardDocument): Promise<void> { this.assertOnline(); await this.delegate.save(document); }
  async remove(id: string): Promise<void> { this.assertOnline(); await this.delegate.remove(id); }
}

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  name: 'Home',
  columns: 12,
  rowHeight: 80,
  gap: 12,
  items: [],
};

describe('DashboardSyncCoordinator', () => {
  it('replays pending operations when connectivity returns', async () => {
    const primary = new ToggleAdapter();
    const storage = new ResilientDashboardStorageAdapter(
      primary,
      new MemoryDashboardStorageAdapter(),
      new MemoryDashboardSyncQueue(),
    );
    await storage.save(document);
    expect(storage.currentState.pending).toBe(1);

    const connectivity = new Connectivity();
    const coordinator = new DashboardSyncCoordinator(storage, connectivity);
    coordinator.start();
    primary.online = true;
    connectivity.setOnline(true);
    await coordinator.synchronize();

    expect(storage.currentState.pending).toBe(0);
    expect((await primary.load('home'))?.name).toBe('Home');
    coordinator.stop();
  });

  it('does not synchronize while connectivity is offline', async () => {
    const primary = new ToggleAdapter();
    const storage = new ResilientDashboardStorageAdapter(
      primary,
      new MemoryDashboardStorageAdapter(),
      new MemoryDashboardSyncQueue(),
    );
    await storage.save(document);
    const connectivity = new Connectivity();
    const coordinator = new DashboardSyncCoordinator(storage, connectivity);

    await coordinator.synchronize();

    expect(storage.currentState.pending).toBe(1);
  });
});

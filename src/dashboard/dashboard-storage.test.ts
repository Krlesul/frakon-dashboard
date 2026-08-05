import { describe, expect, it, vi } from 'vitest';
import { MemoryDashboardStorageAdapter, RemoteDashboardStorageAdapter } from './dashboard-storage';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  items: [
    {
      id: 'light',
      card: { type: 'custom:frakon-light-card', entity: 'light.living_room' },
      x: 0,
      y: 0,
      w: 4,
      h: 3,
    },
  ],
};

describe('dashboard storage adapters', () => {
  it('stores and loads normalized documents', async () => {
    const storage = new MemoryDashboardStorageAdapter();
    await storage.save({ ...document, rowHeight: 10, gap: -2 });
    const loaded = await storage.load('home');
    expect(loaded).toMatchObject({ rowHeight: 24, gap: 0 });
    expect(loaded?.items).toHaveLength(1);
  });

  it('returns defensive copies', async () => {
    const storage = new MemoryDashboardStorageAdapter();
    await storage.save(document);
    const first = await storage.load('home');
    if (!first) throw new Error('Expected stored dashboard.');
    first.items[0].w = 10;
    const second = await storage.load('home');
    expect(second?.items[0].w).toBe(4);
  });

  it('removes documents', async () => {
    const storage = new MemoryDashboardStorageAdapter();
    await storage.save(document);
    await storage.remove('home');
    expect(await storage.load('home')).toBeUndefined();
  });

  it('maps remote operations to transport commands', async () => {
    const request = vi.fn(async (command: string) => command.endsWith('/load') ? document : undefined);
    const storage = new RemoteDashboardStorageAdapter({ request });

    await storage.load('home');
    await storage.save(document);
    await storage.remove('home');

    expect(request).toHaveBeenNthCalledWith(1, 'frakon/dashboard/load', { id: 'home' });
    expect(request).toHaveBeenNthCalledWith(2, 'frakon/dashboard/save', { document });
    expect(request).toHaveBeenNthCalledWith(3, 'frakon/dashboard/remove', { id: 'home' });
  });
});

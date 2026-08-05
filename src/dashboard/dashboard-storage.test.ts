import { describe, expect, it } from 'vitest';
import {
  MemoryDashboardStorageAdapter,
  RemoteDashboardStorageAdapter,
  type DashboardStorageTransport,
} from './dashboard-storage';
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
    const calls: Array<{ command: string; payload: Record<string, unknown> }> = [];
    const transport: DashboardStorageTransport = {
      async request<T>(command: string, payload: Record<string, unknown>): Promise<T> {
        calls.push({ command, payload });
        return (command.endsWith('/load') ? document : undefined) as T;
      },
    };
    const storage = new RemoteDashboardStorageAdapter(transport);

    await storage.load('home');
    await storage.save(document);
    await storage.remove('home');

    expect(calls).toEqual([
      { command: 'frakon/dashboard/load', payload: { id: 'home' } },
      { command: 'frakon/dashboard/save', payload: { document } },
      { command: 'frakon/dashboard/remove', payload: { id: 'home' } },
    ]);
  });
});

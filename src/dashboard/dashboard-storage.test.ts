import { describe, expect, it } from 'vitest';
import {
  LocalStorageDashboardAdapter,
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
      id: 'front',
      card: { type: 'custom:frakon-light-card', entity: 'light.living_room' },
      x: 7,
      y: 5,
      w: 4,
      h: 3,
    },
    {
      id: 'hidden',
      card: { type: 'custom:frakon-sensor-card', entity: 'sensor.temperature' },
      x: 1,
      y: 3,
      w: 3,
      h: 2,
      hidden: true,
    },
    {
      id: 'back',
      card: { type: 'custom:frakon-card' },
      x: 0,
      y: 0,
      w: 2,
      h: 2,
    },
  ],
  constraints: [
    { id: 'hidden-left-front', kind: 'align-left', sourceId: 'hidden', targetId: 'front', priority: 40 },
  ],
};

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

describe('dashboard storage adapters', () => {
  it('stores and loads normalized documents without compacting exact geometry or z-order', async () => {
    const storage = new MemoryDashboardStorageAdapter();
    await storage.save({ ...document, rowHeight: 10, gap: -2 });
    const loaded = await storage.load('home');
    expect(loaded).toMatchObject({ rowHeight: 24, gap: 0 });
    expect(loaded?.items.map((item) => item.id)).toEqual(['front', 'hidden', 'back']);
    expect(loaded?.items.find((item) => item.id === 'front')).toMatchObject({ x: 7, y: 5 });
    expect(loaded?.items.find((item) => item.id === 'hidden')).toMatchObject({ x: 1, y: 3, hidden: true });
    expect(loaded?.constraints).toEqual(document.constraints);
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

  it('round-trips valid local-storage documents and rejects malformed or mismatched stored payloads', async () => {
    const backing = memoryStorage();
    const storage = new LocalStorageDashboardAdapter(backing);
    await storage.save(document);
    const loaded = await storage.load('home');
    expect(loaded?.items).toEqual(document.items);
    expect(loaded?.constraints).toEqual(document.constraints);

    backing.setItem('frakon-dashboard:bad', JSON.stringify({
      version: 1,
      id: 'bad',
      title: 'Bad',
      breakpoint: 'desktop',
      columns: 12,
      rowHeight: 48,
      gap: 12,
      items: [{ id: 'broken', card: {}, x: 0, y: 0, w: 'oops', h: 2 }],
    }));
    expect(await storage.load('bad')).toBeUndefined();

    backing.setItem('frakon-dashboard:home', JSON.stringify({ ...document, id: 'other' }));
    expect(await storage.load('home')).toBeUndefined();
  });

  it('maps remote operations to Home Assistant-safe transport commands without stripping hidden data', async () => {
    const calls: Array<{ command: string; payload: Record<string, unknown> }> = [];
    const transport: DashboardStorageTransport = {
      async request<T>(command: string, payload: Record<string, unknown>): Promise<T> {
        calls.push({ command, payload });
        return (command.endsWith('/load') ? structuredClone(document) : undefined) as T;
      },
    };
    const storage = new RemoteDashboardStorageAdapter(transport);

    const loaded = await storage.load('home');
    await storage.save(document);
    await storage.remove('home');

    expect(loaded?.items).toEqual(document.items);
    expect(loaded?.constraints).toEqual(document.constraints);
    expect(calls).toEqual([
      { command: 'frakon/dashboard/load', payload: { dashboard_id: 'home' } },
      { command: 'frakon/dashboard/save', payload: { document } },
      { command: 'frakon/dashboard/remove', payload: { dashboard_id: 'home' } },
    ]);
  });

  it('fails closed when a remote load returns malformed or mismatched version 1 data', async () => {
    const malformedTransport: DashboardStorageTransport = {
      async request<T>(): Promise<T> {
        return {
          version: 1,
          id: 'home',
          title: 'Corrupt',
          breakpoint: 'desktop',
          columns: 12,
          rowHeight: 48,
          gap: 12,
          items: [{ id: 'bad', card: { type: 'custom:bad' }, x: 0, y: 0, w: null, h: 2 }],
        } as T;
      },
    };
    expect(await new RemoteDashboardStorageAdapter(malformedTransport).load('home')).toBeUndefined();

    const mismatchedTransport: DashboardStorageTransport = {
      async request<T>(): Promise<T> {
        return structuredClone({ ...document, id: 'other' }) as T;
      },
    };
    expect(await new RemoteDashboardStorageAdapter(mismatchedTransport).load('home')).toBeUndefined();
  });
});

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
  it('rejects non-canonical documents instead of normalizing them during save', async () => {
    const storage = new MemoryDashboardStorageAdapter();
    await expect(storage.save({ ...document, rowHeight: 10 })).rejects.toThrow(/non-canonical/i);
    await expect(storage.save({ ...document, gap: -2 })).rejects.toThrow(/non-canonical/i);
    expect(await storage.load('home')).toBeUndefined();
  });

  it('stores and loads canonical documents without changing geometry, z-order or hidden state', async () => {
    const storage = new MemoryDashboardStorageAdapter();
    await storage.save(document);
    const loaded = await storage.load('home');
    expect(loaded).toEqual(document);
    expect(loaded).not.toBe(document);
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

  it('rejects fractional and overlapping local-storage payloads rather than repairing them', async () => {
    const backing = memoryStorage({
      'frakon-dashboard:fractional': JSON.stringify({ ...document, id: 'fractional', rowHeight: 48.5 }),
      'frakon-dashboard:overlap': JSON.stringify({
        ...document,
        id: 'overlap',
        items: [
          { ...document.items[0], id: 'a', x: 0, y: 0, w: 3, h: 2 },
          { ...document.items[1], id: 'b', x: 2, y: 1, w: 3, h: 2 },
        ],
        constraints: undefined,
      }),
    });
    const storage = new LocalStorageDashboardAdapter(backing);
    expect(await storage.load('fractional')).toBeUndefined();
    expect(await storage.load('overlap')).toBeUndefined();
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

  it('does not send a malformed remote save request', async () => {
    const calls: Array<{ command: string; payload: Record<string, unknown> }> = [];
    const transport: DashboardStorageTransport = {
      async request<T>(command: string, payload: Record<string, unknown>): Promise<T> {
        calls.push({ command, payload });
        return undefined as T;
      },
    };
    const storage = new RemoteDashboardStorageAdapter(transport);
    await expect(storage.save({ ...document, rowHeight: 10 })).rejects.toThrow(/non-canonical/i);
    expect(calls).toEqual([]);
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

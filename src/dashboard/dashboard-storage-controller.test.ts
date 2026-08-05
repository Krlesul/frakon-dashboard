import { describe, expect, it, vi } from 'vitest';
import { DashboardStorageController } from './dashboard-storage-controller';
import { MemoryDashboardStorageAdapter, type DashboardStorageAdapter } from './dashboard-storage';
import type { FrakonDashboardDocument } from './layout-model';

const dashboard = (id: string, title = id): FrakonDashboardDocument => ({
  version: 1,
  id,
  title,
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  items: [],
});

describe('DashboardStorageController', () => {
  it('loads normalized dashboards and exposes state changes', async () => {
    const adapter = new MemoryDashboardStorageAdapter();
    await adapter.save({ ...dashboard('home'), rowHeight: 8 });
    const controller = new DashboardStorageController(adapter);
    const states: boolean[] = [];
    controller.subscribe((state) => states.push(state.loading));

    const loaded = await controller.load('home');

    expect(loaded?.rowHeight).toBe(24);
    expect(states).toContain(true);
    expect(states.at(-1)).toBe(false);
  });

  it('ignores an older load that resolves after a newer request', async () => {
    const resolvers = new Map<string, (document: FrakonDashboardDocument) => void>();
    const adapter: DashboardStorageAdapter = {
      kind: 'delayed',
      load: vi.fn((id: string) => new Promise((resolve) => resolvers.set(id, resolve))),
      save: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };
    const controller = new DashboardStorageController(adapter);

    const first = controller.load('first');
    const second = controller.load('second');
    resolvers.get('second')?.(dashboard('second'));
    expect((await second)?.id).toBe('second');
    resolvers.get('first')?.(dashboard('first'));
    expect(await first).toBeUndefined();
  });

  it('serializes saves in request order', async () => {
    const order: string[] = [];
    const adapter: DashboardStorageAdapter = {
      kind: 'ordered',
      load: vi.fn(async () => undefined),
      save: vi.fn(async (document) => {
        await Promise.resolve();
        order.push(document.id);
      }),
      remove: vi.fn(async () => undefined),
    };
    const controller = new DashboardStorageController(adapter);

    await Promise.all([controller.save(dashboard('one')), controller.save(dashboard('two'))]);

    expect(order).toEqual(['one', 'two']);
    expect(controller.currentState.saving).toBe(false);
  });

  it('captures adapter errors without rejecting editor operations', async () => {
    const adapter: DashboardStorageAdapter = {
      kind: 'failing',
      load: vi.fn(async () => { throw new Error('load failed'); }),
      save: vi.fn(async () => { throw new Error('save failed'); }),
      remove: vi.fn(async () => { throw new Error('remove failed'); }),
    };
    const controller = new DashboardStorageController(adapter);

    expect(await controller.load('home')).toBeUndefined();
    expect(controller.currentState.error?.message).toBe('load failed');
    await controller.save(dashboard('home'));
    expect(controller.currentState.error?.message).toBe('save failed');
    await controller.remove('home');
    expect(controller.currentState.error?.message).toBe('remove failed');
  });
});

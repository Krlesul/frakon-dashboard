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
  it('loads canonical dashboards and exposes state changes', async () => {
    const adapter = new MemoryDashboardStorageAdapter();
    await adapter.save(dashboard('home'));
    const controller = new DashboardStorageController(adapter);
    const states: boolean[] = [];
    controller.subscribe((state) => states.push(state.loading));

    const loaded = await controller.load('home');

    expect(loaded).toEqual(dashboard('home'));
    expect(states).toContain(true);
    expect(states.at(-1)).toBe(false);
  });

  it('rejects a non-canonical document returned by a custom adapter', async () => {
    const invalid = { ...dashboard('home'), rowHeight: 8 };
    const adapter: DashboardStorageAdapter = {
      kind: 'raw-invalid',
      load: vi.fn(async () => invalid),
      save: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };
    const controller = new DashboardStorageController(adapter);

    expect(await controller.load('home')).toBeUndefined();
    expect(controller.currentState.error?.message).toMatch(/non-canonical/i);
  });

  it('rejects a wrong-dashboard document returned by a custom adapter', async () => {
    const adapter: DashboardStorageAdapter = {
      kind: 'wrong-id',
      load: vi.fn(async () => dashboard('other')),
      save: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };
    const controller = new DashboardStorageController(adapter);

    expect(await controller.load('home')).toBeUndefined();
    expect(controller.currentState.error?.message).toMatch(/non-canonical/i);
  });

  it('preserves exact committed geometry, z-order, hidden state and constraints across save/load', async () => {
    const adapter = new MemoryDashboardStorageAdapter();
    const controller = new DashboardStorageController(adapter);
    const exact: FrakonDashboardDocument = {
      ...dashboard('exact'),
      items: [
        { id: 'front', x: 7, y: 8, w: 3, h: 2, card: { type: 'custom:front' } },
        { id: 'hidden', x: 1, y: 5, w: 2, h: 2, hidden: true, card: { type: 'custom:hidden' } },
        { id: 'back', x: 0, y: 0, w: 2, h: 2, card: { type: 'custom:back' } },
      ],
      constraints: [
        {
          id: 'hidden-left-front',
          kind: 'align-left',
          sourceId: 'hidden',
          targetId: 'front',
          priority: 40,
        },
      ],
    };

    await controller.save(exact);
    const loaded = await controller.load('exact');

    expect(loaded?.items.map((item) => item.id)).toEqual(['front', 'hidden', 'back']);
    expect(loaded?.items).toEqual(exact.items);
    expect(loaded?.constraints).toEqual(exact.constraints);
  });

  it('does not turn storage load into an implicit compaction or normalization pass', async () => {
    const source: FrakonDashboardDocument = {
      ...dashboard('spaced'),
      items: [
        { id: 'late', x: 8, y: 10, w: 2, h: 2, card: { type: 'custom:late' } },
        { id: 'early', x: 0, y: 0, w: 2, h: 2, card: { type: 'custom:early' } },
      ],
    };
    const adapter: DashboardStorageAdapter = {
      kind: 'raw',
      load: vi.fn(async () => structuredClone(source)),
      save: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };
    const controller = new DashboardStorageController(adapter);

    const loaded = await controller.load('spaced');

    expect(loaded?.items).toEqual(source.items);
  });

  it('ignores an older load that resolves after a newer request', async () => {
    const resolvers = new Map<string, (document: FrakonDashboardDocument | undefined) => void>();
    const load = vi.fn((id: string): Promise<FrakonDashboardDocument | undefined> => (
      new Promise<FrakonDashboardDocument | undefined>((resolve) => resolvers.set(id, resolve))
    ));
    const adapter: DashboardStorageAdapter = {
      kind: 'delayed',
      load,
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

  it('serializes valid saves in request order', async () => {
    const order: string[] = [];
    const adapter: DashboardStorageAdapter = {
      kind: 'ordered',
      load: vi.fn(async (): Promise<FrakonDashboardDocument | undefined> => undefined),
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

  it('blocks a non-canonical save before it reaches the adapter', async () => {
    const save = vi.fn(async () => undefined);
    const adapter: DashboardStorageAdapter = {
      kind: 'guarded',
      load: vi.fn(async (): Promise<FrakonDashboardDocument | undefined> => undefined),
      save,
      remove: vi.fn(async () => undefined),
    };
    const controller = new DashboardStorageController(adapter);

    await controller.save({ ...dashboard('bad'), rowHeight: 8 });

    expect(save).not.toHaveBeenCalled();
    expect(controller.currentState.error?.message).toMatch(/non-canonical/i);
  });

  it('captures adapter errors without rejecting editor operations', async () => {
    const adapter: DashboardStorageAdapter = {
      kind: 'failing',
      load: vi.fn(async (): Promise<FrakonDashboardDocument | undefined> => { throw new Error('load failed'); }),
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

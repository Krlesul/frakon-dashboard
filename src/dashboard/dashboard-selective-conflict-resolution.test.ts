import { describe, expect, it } from 'vitest';
import { mergeDashboardDocuments } from './dashboard-conflict-resolver';
import { resolveDashboardConflicts } from './dashboard-selective-conflict-resolution';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

function dashboard(title: string, lightX: number, cameraX: number): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'home',
    title,
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 80,
    gap: 12,
    items: [
      { id: 'light', x: lightX, y: 0, w: 2, h: 2, card: { type: 'light' } },
      { id: 'camera', x: cameraX, y: 0, w: 2, h: 2, card: { type: 'camera' } },
    ],
  };
}

function orderedDashboard(ids: string[]): FrakonDashboardDocument {
  const positions = new Map([
    ['a', 0],
    ['b', 4],
    ['c', 8],
  ]);
  const items: FrakonGridItem[] = ids.map((id) => ({
    id,
    x: positions.get(id) ?? 0,
    y: 0,
    w: 2,
    h: 2,
    card: { type: `custom:${id}` },
  }));
  return {
    version: 1,
    id: 'ordered',
    title: 'Ordered',
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 80,
    gap: 12,
    items,
  };
}

describe('resolveDashboardConflicts', () => {
  it('resolves each conflicting path independently', () => {
    const base = dashboard('Home', 0, 4);
    const local = dashboard('Local home', 1, 4);
    const remote = dashboard('Remote home', 3, 4);
    const merge = mergeDashboardDocuments(base, local, remote);

    const result = resolveDashboardConflicts(merge, {
      title: 'remote',
      'items.light': 'local',
    });

    expect(result.complete).toBe(true);
    expect(result.document.title).toBe('Remote home');
    expect(result.document.items.find((item) => item.id === 'light')?.x).toBe(1);
  });

  it('rejects a complete choice combination that would still overlap cards', () => {
    const base = dashboard('Home', 0, 4);
    const local = dashboard('Home', 6, 4);
    const remote = dashboard('Home', 0, 6);
    const merge = mergeDashboardDocuments(base, local, remote);
    expect(merge.conflicts.map((conflict) => conflict.path)).toEqual(
      expect.arrayContaining(['items.light', 'items.camera']),
    );

    expect(() => resolveDashboardConflicts(merge, {
      'items.light': 'local',
      'items.camera': 'remote',
    })).toThrow(/non-canonical version 1/i);

    const valid = resolveDashboardConflicts(merge, {
      'items.light': 'local',
      'items.camera': 'local',
    });
    expect(valid.complete).toBe(true);
    expect(valid.document.items.find((item) => item.id === 'light')?.x).toBe(6);
    expect(valid.document.items.find((item) => item.id === 'camera')?.x).toBe(4);
  });

  it('does not sort layer order by geometry while resolving an item conflict', () => {
    const base = dashboard('Home', 0, 4);
    base.items = [base.items[1], base.items[0]];
    const local = structuredClone(base);
    const remote = structuredClone(base);
    const localLight = local.items.find((item) => item.id === 'light');
    const remoteLight = remote.items.find((item) => item.id === 'light');
    if (!localLight || !remoteLight) throw new Error('Missing light item.');
    localLight.x = 1;
    remoteLight.x = 2;

    const merge = mergeDashboardDocuments(base, local, remote);
    const result = resolveDashboardConflicts(merge, { 'items.light': 'remote' });

    expect(result.complete).toBe(true);
    expect(result.document.items.map((item) => item.id)).toEqual(['camera', 'light']);
    expect(result.document.items.find((item) => item.id === 'light')?.x).toBe(2);
  });

  it('applies a selected itemOrder side without changing item geometry', () => {
    const base = orderedDashboard(['a', 'b', 'c']);
    const local = orderedDashboard(['b', 'c', 'a']);
    const remote = orderedDashboard(['c', 'a', 'b']);
    const merge = mergeDashboardDocuments(base, local, remote);
    expect(merge.conflicts.some((conflict) => conflict.path === 'itemOrder')).toBe(true);

    const beforeGeometry = new Map(merge.document.items.map((item) => [item.id, { x: item.x, y: item.y, w: item.w, h: item.h }]));
    const result = resolveDashboardConflicts(merge, { itemOrder: 'remote' });

    expect(result.complete).toBe(true);
    expect(result.document.items.map((item) => item.id)).toEqual(['c', 'a', 'b']);
    for (const item of result.document.items) {
      expect({ x: item.x, y: item.y, w: item.w, h: item.h }).toEqual(beforeGeometry.get(item.id));
    }
  });

  it('reports unresolved paths until every conflict has a selection', () => {
    const merge = mergeDashboardDocuments(
      dashboard('Home', 0, 4),
      dashboard('Local', 1, 4),
      dashboard('Remote', 2, 4),
    );

    const result = resolveDashboardConflicts(merge, { title: 'local' });

    expect(result.complete).toBe(false);
    expect(result.unresolved.map((conflict) => conflict.path)).toEqual(['items.light']);
  });

  it('can accept a remote deletion of a card without reordering surviving layers', () => {
    const base = dashboard('Home', 0, 4);
    base.items = [base.items[1], base.items[0]];
    const local = structuredClone(base);
    const remote = structuredClone(base);
    const localLight = local.items.find((item) => item.id === 'light');
    if (!localLight) throw new Error('Missing light item.');
    localLight.x = 2;
    remote.items = remote.items.filter((item) => item.id !== 'light');
    const merge = mergeDashboardDocuments(base, local, remote);

    const result = resolveDashboardConflicts(merge, { 'items.light': 'remote' });

    expect(result.complete).toBe(true);
    expect(result.document.items.map((item) => item.id)).toEqual(['camera']);
  });
});

import { describe, expect, it } from 'vitest';
import { mergeDashboardDocuments } from './dashboard-conflict-resolver';
import { migrateDashboardV1ToV2 } from './layout-model-v2';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

function item(id: string, x: number): FrakonGridItem { return { id, x, y: 0, w: 2, h: 2, card: { type: `custom:${id}` } }; }
function dashboard(items: FrakonGridItem[], title = 'Home'): FrakonDashboardDocument { return { version: 1, id: 'home', title, breakpoint: 'desktop', columns: 12, rowHeight: 80, gap: 12, items }; }

describe('mergeDashboardDocuments', () => {
  it('merges independent card changes cleanly', () => {
    const base = dashboard([item('light', 0), item('camera', 4)]);
    const local = dashboard([item('light', 1), item('camera', 4)]);
    const remote = dashboard([item('light', 0), item('camera', 6)]);
    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(true);
    expect(result.document.items.find((entry) => entry.id === 'light')?.x).toBe(1);
    expect(result.document.items.find((entry) => entry.id === 'camera')?.x).toBe(6);
  });

  it('detects concurrent changes to the same card', () => {
    const base = dashboard([item('light', 0)]);
    const local = dashboard([item('light', 1)]);
    const remote = dashboard([item('light', 2)]);
    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(false);
    expect(result.conflicts[0]?.path).toBe('items.light');
    expect(result.document.items[0]?.x).toBe(1);
  });

  it('keeps a one-sided card addition or removal', () => {
    const base = dashboard([item('light', 0)]);
    const local = dashboard([item('light', 0), item('camera', 4)]);
    const remote = dashboard([]);
    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(true);
    expect(result.document.items.map((entry) => entry.id)).toEqual(['camera']);
  });

  it('reports conflicting top-level changes', () => {
    const base = dashboard([], 'Home');
    const local = dashboard([], 'Local');
    const remote = dashboard([], 'Remote');
    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(false);
    expect(result.conflicts[0]?.path).toBe('title');
    expect(result.document.title).toBe('Local');
  });

  it('merges independent canvas frame changes in version 2 documents', () => {
    const base = migrateDashboardV1ToV2(dashboard([item('light', 0), item('camera', 4)]), 1200);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    const localLight = local.items.find((entry) => entry.id === 'light');
    const remoteCamera = remote.items.find((entry) => entry.id === 'camera');
    if (!localLight || !remoteCamera) throw new Error('Missing v2 test items.');
    localLight.frame.x += 25;
    remoteCamera.frame.y += 30;
    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(true);
    expect(result.document.version).toBe(2);
    expect(result.document.items.find((entry) => entry.id === 'light')?.frame.x).toBe(localLight.frame.x);
    expect(result.document.items.find((entry) => entry.id === 'camera')?.frame.y).toBe(remoteCamera.frame.y);
  });

  it('preserves a one-sided version 2 layer reorder instead of sorting by geometry', () => {
    const base = migrateDashboardV1ToV2(dashboard([item('a', 0), item('b', 4), item('c', 8)]), 1200);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.items = [local.items[1], local.items[2], local.items[0]];
    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(true);
    expect(result.document.items.map((entry) => entry.id)).toEqual(['b', 'c', 'a']);
  });

  it('reports concurrent incompatible version 2 layer reorders as itemOrder conflict', () => {
    const base = migrateDashboardV1ToV2(dashboard([item('a', 0), item('b', 4), item('c', 8)]), 1200);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.items = [local.items[1], local.items[2], local.items[0]];
    remote.items = [remote.items[2], remote.items[0], remote.items[1]];
    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(false);
    expect(result.conflicts.some((conflict) => conflict.path === 'itemOrder')).toBe(true);
    expect(result.document.items.map((entry) => entry.id)).toEqual(['b', 'c', 'a']);
  });

  it('reports version 2 layout conflicts without applying grid fields', () => {
    const base = migrateDashboardV1ToV2(dashboard([]), 1200);
    const local = { ...structuredClone(base), layout: { ...base.layout, minHeight: 900 } };
    const remote = { ...structuredClone(base), layout: { ...base.layout, minHeight: 1000 } };
    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(false);
    expect(result.conflicts[0]?.path).toBe('layout');
    expect(result.document.layout.minHeight).toBe(900);
  });

  it('rejects merge attempts across document versions', () => {
    const base = dashboard([]);
    const v2 = migrateDashboardV1ToV2(base, 1200);
    expect(() => mergeDashboardDocuments(base as unknown as typeof v2, v2, v2)).toThrow(/across document versions/);
  });
});

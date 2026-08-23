import { describe, expect, it } from 'vitest';
import { mergeDashboardDocuments } from './dashboard-conflict-resolver';
import { resolveDashboardV2Conflicts } from './dashboard-selective-conflict-resolution-v2';
import { migrateDashboardV1ToV2 } from './layout-model-v2';
import type { FrakonDashboardDocument } from './layout-model';

const v1: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 4,
  rowHeight: 50,
  gap: 10,
  items: [{ id: 'a', x: 0, y: 0, w: 1, h: 1, card: { type: 'custom:a' } }],
};

function threeItemV1(): FrakonDashboardDocument {
  return {
    ...v1,
    items: [
      { id: 'a', x: 0, y: 0, w: 1, h: 1, card: { type: 'custom:a' } },
      { id: 'b', x: 1, y: 0, w: 1, h: 1, card: { type: 'custom:b' } },
      { id: 'c', x: 2, y: 0, w: 1, h: 1, card: { type: 'custom:c' } },
    ],
  };
}

describe('resolveDashboardV2Conflicts', () => {
  it('resolves a selected canvas layout conflict', () => {
    const base = migrateDashboardV1ToV2(v1, 430);
    const local = { ...structuredClone(base), layout: { ...base.layout, minHeight: 700 } };
    const remote = { ...structuredClone(base), layout: { ...base.layout, minHeight: 900 } };
    const merge = mergeDashboardDocuments(base, local, remote);
    const resolved = resolveDashboardV2Conflicts(merge, { layout: 'remote' });
    expect(resolved.complete).toBe(true);
    expect(resolved.document.layout.minHeight).toBe(900);
  });

  it('rejects a complete layout/item choice that would place a frame outside the chosen canvas', () => {
    const base = migrateDashboardV1ToV2(v1, 430);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.items[0].frame.x = 300;
    remote.layout.width = 350;
    const merge = mergeDashboardDocuments(base, local, remote);
    expect(merge.conflicts.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(['layout', 'items.a']),
    );

    expect(() => resolveDashboardV2Conflicts(merge, {
      layout: 'remote',
      'items.a': 'local',
    })).toThrow(/non-canonical version 2/i);

    const valid = resolveDashboardV2Conflicts(merge, {
      layout: 'local',
      'items.a': 'local',
    });
    expect(valid.complete).toBe(true);
    expect(valid.document.layout.width).toBe(430);
    expect(valid.document.items[0].frame.x).toBe(300);
  });

  it('keeps unresolved canvas item conflicts explicit', () => {
    const base = migrateDashboardV1ToV2(v1, 430);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.items[0].frame.x = 20;
    remote.items[0].frame.x = 40;
    const merge = mergeDashboardDocuments(base, local, remote);
    const unresolved = resolveDashboardV2Conflicts(merge, {});
    expect(unresolved.complete).toBe(false);
    expect(unresolved.unresolved.map((entry) => entry.path)).toEqual(['items.a']);
    const resolved = resolveDashboardV2Conflicts(merge, { 'items.a': 'remote' });
    expect(resolved.complete).toBe(true);
    expect(resolved.document.items[0].frame.x).toBe(40);
  });

  it('resolves a concurrent layer-order conflict to the chosen side', () => {
    const base = migrateDashboardV1ToV2(threeItemV1(), 430);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.items = [local.items[1], local.items[2], local.items[0]];
    remote.items = [remote.items[2], remote.items[0], remote.items[1]];
    const merge = mergeDashboardDocuments(base, local, remote);
    expect(merge.conflicts.some((entry) => entry.path === 'itemOrder')).toBe(true);

    const remoteResolved = resolveDashboardV2Conflicts(merge, { itemOrder: 'remote' });
    expect(remoteResolved.complete).toBe(true);
    expect(remoteResolved.document.items.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('does not reorder all canvas items by geometry when resolving a single item conflict', () => {
    const base = migrateDashboardV1ToV2(threeItemV1(), 430);
    base.items = [base.items[2], base.items[0], base.items[1]];
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.items[1].frame.x += 10;
    remote.items[1].frame.x += 20;
    const merge = mergeDashboardDocuments(base, local, remote);
    const resolved = resolveDashboardV2Conflicts(merge, { 'items.a': 'remote' });
    expect(resolved.document.items.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });
});

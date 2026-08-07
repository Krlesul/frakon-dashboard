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
});

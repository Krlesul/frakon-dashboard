import { describe, expect, it } from 'vitest';
import { applyDashboardConstraintsToPointerPreview } from './dashboard-pointer-constraints';
import type { DashboardPointerPreview } from './dashboard-pointer-grid';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 8,
  rowHeight: 50,
  gap: 10,
  items: [
    { id: 'target', x: 1, y: 1, w: 2, h: 1, card: { type: 'custom:a' } },
    { id: 'source', x: 1, y: 3, w: 1, h: 1, card: { type: 'custom:b' } },
  ],
  constraints: [
    { id: 'align', kind: 'align-left', sourceId: 'source', targetId: 'target' },
    { id: 'below', kind: 'below', sourceId: 'source', targetId: 'target', gap: 1 },
  ],
};

function preview(items = document.items): DashboardPointerPreview {
  return { items: items.map((item) => ({ ...item })), collisionIds: [], hasCollisions: false };
}

describe('constraint-aware pointer previews', () => {
  it('re-solves dependent items after a manual pointer transform', () => {
    const movedTarget = document.items.map((item) => item.id === 'target' ? { ...item, x: 3, y: 2 } : item);
    const result = applyDashboardConstraintsToPointerPreview(document, preview(movedTarget));
    expect(result.items.find((item) => item.id === 'source')).toMatchObject({ x: 3, y: 4 });
    expect(result.appliedConstraintIds).toEqual(['align', 'below']);
  });

  it('recomputes collisions after constraints are applied', () => {
    const withBlocker: FrakonDashboardDocument = {
      ...document,
      items: [
        ...document.items,
        { id: 'blocker', x: 3, y: 4, w: 1, h: 1, card: { type: 'custom:c' } },
      ],
    };
    const movedTarget = withBlocker.items.map((item) => item.id === 'target' ? { ...item, x: 3, y: 2 } : item);
    const result = applyDashboardConstraintsToPointerPreview(withBlocker, {
      items: movedTarget.map((item) => ({ ...item })),
      collisionIds: [],
      hasCollisions: false,
    });
    expect(result.hasCollisions).toBe(true);
    expect(result.collisionIds).toEqual(['blocker', 'source']);
  });

  it('preserves ordinary preview behavior when no constraints exist', () => {
    const unconstrained = { ...document, constraints: [] };
    const base = preview(unconstrained.items);
    const result = applyDashboardConstraintsToPointerPreview(unconstrained, base);
    expect(result.items).toEqual(base.items);
    expect(result.appliedConstraintIds).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { dashboardPointerGuidelines } from './dashboard-pointer-guidelines';
import type { FrakonDashboardDocument } from './layout-model';

const doc: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 4,
  rowHeight: 50,
  gap: 10,
  items: [
    { id: 'a', x: 0, y: 0, w: 1, h: 1, card: { type: 'custom:a' } },
    { id: 'b', x: 2, y: 0, w: 1, h: 1, card: { type: 'custom:b' } },
  ],
};

describe('dashboard pointer guidelines', () => {
  it('reports aligned anchors in pixel space when cards share an axis', () => {
    const preview = [{ ...doc.items[0], x: 2 }, { ...doc.items[1] }];
    const guides = dashboardPointerGuidelines(doc, preview, ['a'], 430);
    expect(guides.some((guide) => guide.axis === 'y')).toBe(true);
  });

  it('does not use another member of the moving group as a stationary alignment target', () => {
    const groupDoc: FrakonDashboardDocument = {
      ...doc,
      items: [
        ...doc.items,
        { id: 'c', x: 3, y: 2, w: 1, h: 1, card: { type: 'custom:c' } },
      ],
    };
    const preview = groupDoc.items.map((item) => item.id === 'a' ? { ...item, x: 1 } : item);
    const guides = dashboardPointerGuidelines(groupDoc, preview, ['a', 'b'], 430);
    expect(guides.every((guide) => guide.targetId !== 'a' && guide.targetId !== 'b')).toBe(true);
  });

  it('returns no guides without stationary items', () => {
    expect(dashboardPointerGuidelines(doc, doc.items, ['a', 'b'], 430)).toEqual([]);
  });
});

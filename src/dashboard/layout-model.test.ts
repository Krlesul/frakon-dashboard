import { describe, expect, it } from 'vitest';
import { normalizeDashboard, updateGridItem, type FrakonDashboardDocument } from './layout-model';

const base: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  items: [{ id: 'a', card: { type: 'custom:frakon-card' }, x: 11, y: -2, w: 4, h: 0 }],
};

describe('dashboard layout model', () => {
  it('clamps items into the grid', () => {
    const result = normalizeDashboard(base);
    expect(result.items[0]).toMatchObject({ x: 8, y: 0, w: 4, h: 1 });
  });

  it('respects locked items', () => {
    const locked = { ...base, items: [{ ...base.items[0], locked: true, x: 0, y: 0, w: 2, h: 2 }] };
    expect(updateGridItem(locked, 'a', { w: 6 }).items[0].w).toBe(2);
  });

  it('updates unlocked item dimensions', () => {
    const result = updateGridItem({ ...base, items: [{ ...base.items[0], x: 0, y: 0, w: 2, h: 2 }] }, 'a', { w: 6, h: 4 });
    expect(result.items[0]).toMatchObject({ w: 6, h: 4 });
  });
});

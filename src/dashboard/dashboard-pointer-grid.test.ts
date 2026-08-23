import { describe, expect, it } from 'vitest';
import {
  dashboardGridMetrics,
  pointerDeltaToDashboardGrid,
  previewDashboardPointerMove,
  previewDashboardPointerResize,
} from './dashboard-pointer-grid';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
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

describe('dashboard pointer grid bridge', () => {
  it('converts pointer pixels into snapped grid deltas', () => {
    const metrics = dashboardGridMetrics(430, 4, 50, 10);
    expect(metrics).toEqual({ columnStep: 110, rowStep: 60 });
    expect(pointerDeltaToDashboardGrid({ x: 118, y: 65 }, metrics)).toEqual({ x: 1, y: 1 });
  });

  it('moves an item by pointer delta and reports collisions', () => {
    const preview = previewDashboardPointerMove(document, ['a'], { x: 220, y: 0 }, 430);
    expect(preview.items.find((item) => item.id === 'a')).toMatchObject({ x: 2, y: 0 });
    expect(preview.hasCollisions).toBe(true);
    expect(preview.collisionIds).toEqual(['a', 'b']);
  });

  it('clamps group movement at the dashboard right edge', () => {
    const preview = previewDashboardPointerMove(document, ['b'], { x: 999, y: 0 }, 430);
    expect(preview.items.find((item) => item.id === 'b')).toMatchObject({ x: 3, y: 0 });
  });

  it('does not move locked items', () => {
    const locked: FrakonDashboardDocument = {
      ...document,
      items: document.items.map((item) => item.id === 'a' ? { ...item, locked: true } : item),
    };
    const preview = previewDashboardPointerMove(locked, ['a'], { x: 220, y: 60 }, 430);
    expect(preview.items.find((item) => item.id === 'a')).toMatchObject({ x: 0, y: 0 });
  });

  it('resizes from a pointer handle, keeps the item inside columns and detects overlap', () => {
    const preview = previewDashboardPointerResize(document, 'a', 'e', { x: 220, y: 0 }, 430);
    expect(preview.items.find((item) => item.id === 'a')).toMatchObject({ x: 0, y: 0, w: 3, h: 1 });
    expect(preview.collisionIds).toEqual(['a', 'b']);
  });

  it('does not resize locked items', () => {
    const locked: FrakonDashboardDocument = {
      ...document,
      items: document.items.map((item) => item.id === 'a' ? { ...item, locked: true } : item),
    };
    const preview = previewDashboardPointerResize(locked, 'a', 'se', { x: 220, y: 120 }, 430);
    expect(preview.items.find((item) => item.id === 'a')).toMatchObject({ x: 0, y: 0, w: 1, h: 1 });
  });
});

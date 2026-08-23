import { describe, expect, it } from 'vitest';
import {
  canvasPlacementToGridItem,
  canvasPlacementWithinBounds,
  projectDashboardGridToCanvas,
} from './dashboard-canvas-placement';
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
    { id: 'a', x: 1, y: 2, w: 2, h: 3, card: { type: 'custom:a' } },
    { id: 'hidden', x: 0, y: 8, w: 1, h: 1, hidden: true, card: { type: 'custom:hidden' } },
  ],
};

describe('dashboard canvas placement projection', () => {
  it('projects version-1 visible grid items into exact pixel rectangles', () => {
    const projection = projectDashboardGridToCanvas(document, 430);
    expect(projection.columnWidth).toBe(100);
    expect(projection.columnStep).toBe(110);
    expect(projection.rowStep).toBe(60);
    expect(projection.items.map((item) => item.id)).toEqual(['a']);
    expect(projection.items[0]).toMatchObject({ x: 110, y: 120, width: 210, height: 170 });
  });

  it('never produces a render/interact placement for hidden v1 layers', () => {
    const projection = projectDashboardGridToCanvas(document, 430);
    expect(projection.items.some((item) => item.id === 'hidden')).toBe(false);
    expect(document.items.find((item) => item.id === 'hidden')).toMatchObject({
      x: 0,
      y: 8,
      hidden: true,
    });
  });

  it('projects a canvas rectangle back into the legacy grid without changing the document schema', () => {
    const item = canvasPlacementToGridItem(
      document.items[0],
      { x: 220, y: 60, width: 100, height: 50 },
      document,
      430,
    );
    expect(item).toMatchObject({ x: 2, y: 1, w: 1, h: 1 });
  });

  it('clamps arbitrary canvas placements to horizontal and top bounds', () => {
    expect(canvasPlacementWithinBounds(
      { x: -20, y: -10, width: 500, height: 0 },
      430,
    )).toEqual({ x: 0, y: 0, width: 430, height: 1 });
  });
});

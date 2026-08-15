import { describe, expect, it } from 'vitest';
import { updateDashboardItemGeometryExact } from './dashboard-item-geometry';
import type { FrakonDashboardDocument } from './layout-model';

const card = { type: 'custom:frakon-card' };
const base: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  items: [
    { id: 'a', card, x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, maxW: 6, maxH: 5 },
    { id: 'b', card, x: 6, y: 0, w: 3, h: 2 },
  ],
};

describe('exact dashboard item geometry', () => {
  it('updates position and size without moving other cards', () => {
    const result = updateDashboardItemGeometryExact(base, 'a', { x: 1, y: 3, w: 4, h: 3 });
    expect(result.status).toBe('committed');
    expect(result.document.items[0]).toMatchObject({ x: 1, y: 3, w: 4, h: 3 });
    expect(result.document.items[1]).toEqual(base.items[1]);
  });

  it('clamps requested geometry to item and grid constraints', () => {
    const result = updateDashboardItemGeometryExact(base, 'a', { x: 99, y: -3, w: 99, h: 1 });
    expect(result.status).toBe('committed');
    expect(result.document.items[0]).toMatchObject({ x: 6, y: 0, w: 6, h: 2 });
  });

  it('rejects geometry that collides with another card', () => {
    const result = updateDashboardItemGeometryExact(base, 'a', { x: 5 });
    expect(result.status).toBe('collision');
    expect(result.document).toEqual(base);
    expect(result.collisionIds).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('does not modify locked or hidden cards', () => {
    const locked = { ...base, items: [{ ...base.items[0], locked: true }, base.items[1]] };
    const hidden = { ...base, items: [{ ...base.items[0], hidden: true }, base.items[1]] };
    expect(updateDashboardItemGeometryExact(locked, 'a', { w: 5 }).status).toBe('unchanged');
    expect(updateDashboardItemGeometryExact(hidden, 'a', { w: 5 }).status).toBe('unchanged');
  });
});

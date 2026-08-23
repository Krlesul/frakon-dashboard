import { describe, expect, it } from 'vitest';
import type { FrakonGridItem } from '../src/dashboard/layout-model';
import { findNearestFreeGridPosition, gridPointFromPointer } from '../apps/studio/src/studio-shell-utils';

function item(id: string, x: number, y: number, w: number, h: number): FrakonGridItem {
  return { id, x, y, w, h, card: { type: 'custom:frakon-card', entity: 'sensor.test' } };
}

describe('FRAKON Studio shell placement helpers', () => {
  it('maps a pointer into the dashboard grid and clamps the card width', () => {
    expect(gridPointFromPointer({
      clientX: 950,
      clientY: 245,
      rect: { left: 100, top: 100, width: 1000 },
      columns: 12,
      rowHeight: 48,
      gap: 12,
      itemWidth: 4,
    })).toEqual({ x: 8, y: 2 });
  });

  it('never produces negative rows when dropping above the surface origin', () => {
    expect(gridPointFromPointer({
      clientX: 100,
      clientY: 20,
      rect: { left: 100, top: 100, width: 1200 },
      columns: 12,
      rowHeight: 48,
      gap: 12,
      itemWidth: 3,
    })).toEqual({ x: 0, y: 0 });
  });

  it('keeps the requested location when it is free', () => {
    const candidate = item('new', 0, 0, 3, 3);
    expect(findNearestFreeGridPosition(candidate, [item('existing', 0, 0, 3, 3)], 12, { x: 6, y: 0 }))
      .toEqual({ x: 6, y: 0 });
  });

  it('finds a nearby free location without moving existing cards', () => {
    const existing = [item('a', 3, 1, 3, 3), item('b', 6, 1, 3, 3)];
    const candidate = item('new', 0, 0, 3, 3);
    const position = findNearestFreeGridPosition(candidate, existing, 12, { x: 4, y: 1 });
    expect(position).toEqual({ x: 0, y: 1 });
    expect(existing).toEqual([item('a', 3, 1, 3, 3), item('b', 6, 1, 3, 3)]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  addGridItem,
  duplicateGridItem,
  findCollisions,
  itemsOverlap,
  normalizeAndCompactDashboard,
  normalizeDashboard,
  removeGridItem,
  setGridItemLocked,
  updateGridItem,
  updateGridItemCollisionSafe,
  type FrakonDashboardDocument,
} from './layout-model';

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
    expect(removeGridItem(locked, 'a').items).toHaveLength(1);
  });

  it('updates unlocked item dimensions', () => {
    const result = updateGridItem({ ...base, items: [{ ...base.items[0], x: 0, y: 0, w: 2, h: 2 }] }, 'a', { w: 6, h: 4 });
    expect(result.items[0]).toMatchObject({ w: 6, h: 4 });
  });

  it('adds, locks, unlocks and removes items', () => {
    const added = addGridItem({ ...base, items: [] }, { id: 'b', card: { type: 'custom:frakon-card' }, x: 0, y: 0, w: 3, h: 2 });
    const locked = setGridItemLocked(added, 'b', true);
    expect(locked.items[0].locked).toBe(true);
    const unlocked = setGridItemLocked(locked, 'b', false);
    expect(removeGridItem(unlocked, 'b').items).toHaveLength(0);
  });

  it('duplicates a card with independent configuration and a free position', () => {
    const source = {
      ...base,
      columns: 6,
      items: [{ id: 'a', card: { type: 'custom:frakon-card', name: 'Original' }, x: 0, y: 0, w: 3, h: 2, locked: true }],
    };
    const duplicated = duplicateGridItem(source, 'a', 'a-copy');
    const copy = duplicated.items.find((item) => item.id === 'a-copy');
    expect(copy).toMatchObject({ id: 'a-copy', locked: false, x: 3, y: 0, w: 3, h: 2 });
    expect(copy?.card).toEqual(source.items[0].card);
    expect(copy?.card).not.toBe(source.items[0].card);
  });

  it('rejects duplicate item ids', () => {
    expect(() => addGridItem(base, { ...base.items[0] })).toThrow(/Duplicate dashboard item id/);
    expect(() => duplicateGridItem(base, 'a', 'a')).toThrow(/Duplicate dashboard item id/);
  });

  it('detects overlapping rectangles', () => {
    const a = { ...base.items[0], x: 0, y: 0, w: 4, h: 3 };
    const b = { ...base.items[0], id: 'b', x: 3, y: 2, w: 4, h: 3 };
    expect(itemsOverlap(a, b)).toBe(true);
    expect(findCollisions([a, b])).toEqual([['a', 'b']]);
  });

  it('compacts overlapping cards into free positions', () => {
    const document = normalizeAndCompactDashboard({
      ...base,
      columns: 6,
      items: [
        { ...base.items[0], x: 0, y: 0, w: 3, h: 2 },
        { ...base.items[0], id: 'b', x: 0, y: 0, w: 3, h: 2 },
      ],
    });
    expect(findCollisions(document.items)).toHaveLength(0);
    expect(document.items[1]).toMatchObject({ x: 3, y: 0 });
  });

  it('preserves serialized layer order while resolving geometry', () => {
    const document = normalizeAndCompactDashboard({
      ...base,
      columns: 6,
      items: [
        { ...base.items[0], id: 'front', x: 3, y: 4, w: 3, h: 2 },
        { ...base.items[0], id: 'back', x: 0, y: 0, w: 3, h: 2 },
        { ...base.items[0], id: 'middle', x: 0, y: 0, w: 3, h: 2 },
      ],
    });
    expect(document.items.map((item) => item.id)).toEqual(['front', 'back', 'middle']);
    expect(findCollisions(document.items)).toHaveLength(0);
  });

  it('keeps locked cards fixed while resolving collisions', () => {
    const document = normalizeAndCompactDashboard({
      ...base,
      columns: 6,
      items: [
        { ...base.items[0], id: 'locked', locked: true, x: 0, y: 0, w: 3, h: 2 },
        { ...base.items[0], id: 'movable', x: 0, y: 0, w: 3, h: 2 },
      ],
    });
    expect(document.items.find((item) => item.id === 'locked')).toMatchObject({ x: 0, y: 0 });
    expect(document.items.find((item) => item.id === 'movable')).toMatchObject({ x: 3, y: 0 });
  });

  it('resolves collisions after resizing', () => {
    const document: FrakonDashboardDocument = {
      ...base,
      columns: 6,
      items: [
        { ...base.items[0], x: 0, y: 0, w: 2, h: 2 },
        { ...base.items[0], id: 'b', x: 2, y: 0, w: 2, h: 2 },
      ],
    };
    const updated = updateGridItemCollisionSafe(document, 'a', { w: 4 });
    expect(findCollisions(updated.items)).toHaveLength(0);
  });
});

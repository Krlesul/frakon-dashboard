import { describe, expect, it } from 'vitest';
import {
  addGridItem,
  duplicateGridItem,
  findCollisions,
  itemsOverlap,
  normalizeAndCompactDashboard,
  normalizeDashboard,
  removeGridItem,
  setGridItemHidden,
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

  it('does not mutate hidden item geometry through the generic update path', () => {
    const hidden = {
      ...base,
      items: [{ ...base.items[0], hidden: true, x: 0, y: 0, w: 2, h: 2 }],
    };
    expect(updateGridItem(hidden, 'a', { x: 4, w: 6 }).items[0]).toMatchObject({ x: 0, w: 2, hidden: true });
  });

  it('updates unlocked visible item dimensions', () => {
    const result = updateGridItem({ ...base, items: [{ ...base.items[0], x: 0, y: 0, w: 2, h: 2 }] }, 'a', { w: 6, h: 4 });
    expect(result.items[0]).toMatchObject({ w: 6, h: 4 });
  });

  it('adds, hides, shows, locks, unlocks and removes items', () => {
    const added = addGridItem({ ...base, items: [] }, { id: 'b', card: { type: 'custom:frakon-card' }, x: 0, y: 0, w: 3, h: 2 });
    const hidden = setGridItemHidden(added, 'b', true);
    expect(hidden.items[0].hidden).toBe(true);
    const shown = setGridItemHidden(hidden, 'b', false);
    expect(shown.items[0].hidden).toBe(false);
    const locked = setGridItemLocked(shown, 'b', true);
    expect(locked.items[0].locked).toBe(true);
    const unlocked = setGridItemLocked(locked, 'b', false);
    expect(removeGridItem(unlocked, 'b').items).toHaveLength(0);
  });

  it('duplicates a hidden/locked card as a visible unlocked independent copy', () => {
    const source = {
      ...base,
      columns: 6,
      items: [{ id: 'a', card: { type: 'custom:frakon-card', name: 'Original' }, x: 0, y: 0, w: 3, h: 2, locked: true, hidden: true }],
    };
    const duplicated = duplicateGridItem(source, 'a', 'a-copy');
    const copy = duplicated.items.find((item) => item.id === 'a-copy');
    expect(copy).toMatchObject({ id: 'a-copy', locked: false, hidden: false, x: 3, y: 0, w: 3, h: 2 });
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

  it('compacts overlapping visible cards into free positions', () => {
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

  it('preserves exact non-colliding geometry instead of packing valid layouts', () => {
    const source: FrakonDashboardDocument = {
      ...base,
      columns: 12,
      items: [
        { ...base.items[0], id: 'late', x: 8, y: 9, w: 3, h: 2 },
        { ...base.items[0], id: 'middle', x: 4, y: 4, w: 2, h: 2 },
        { ...base.items[0], id: 'early', x: 0, y: 0, w: 2, h: 2 },
      ],
    };
    const resolved = normalizeAndCompactDashboard(source);
    expect(resolved.items).toEqual(source.items);
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
        { ...base.items[0], id: 'movable', x: 0, y: 0, w: 3, h: 2 },
        { ...base.items[0], id: 'locked', locked: true, x: 0, y: 0, w: 3, h: 2 },
      ],
    });
    expect(document.items.map((item) => item.id)).toEqual(['movable', 'locked']);
    expect(document.items.find((item) => item.id === 'locked')).toMatchObject({ x: 0, y: 0 });
    expect(document.items.find((item) => item.id === 'movable')).toMatchObject({ x: 3, y: 0 });
  });

  it('keeps hidden cards fixed while resolving collisions and preserves z-order', () => {
    const source: FrakonDashboardDocument = {
      ...base,
      columns: 6,
      items: [
        { ...base.items[0], id: 'visible', x: 0, y: 0, w: 3, h: 2 },
        { ...base.items[0], id: 'hidden', hidden: true, x: 0, y: 0, w: 3, h: 2 },
        { ...base.items[0], id: 'later-layer', x: 0, y: 2, w: 3, h: 2 },
      ],
    };
    const compacted = normalizeAndCompactDashboard(source);

    expect(compacted.items.map((item) => item.id)).toEqual(['visible', 'hidden', 'later-layer']);
    expect(compacted.items.find((item) => item.id === 'hidden')).toMatchObject({
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      hidden: true,
    });
    expect(compacted.items.find((item) => item.id === 'visible')).not.toMatchObject({ x: 0, y: 0 });
    expect(findCollisions(compacted.items)).toHaveLength(0);
  });

  it('resolves collisions after resizing a visible item without moving hidden obstacles', () => {
    const document: FrakonDashboardDocument = {
      ...base,
      columns: 6,
      items: [
        { ...base.items[0], id: 'a', x: 0, y: 2, w: 2, h: 2 },
        { ...base.items[0], id: 'hidden', hidden: true, x: 2, y: 0, w: 2, h: 2 },
        { ...base.items[0], id: 'b', x: 4, y: 0, w: 2, h: 2 },
      ],
    };
    const updated = updateGridItemCollisionSafe(document, 'a', { y: 0, w: 4 });
    expect(findCollisions(updated.items)).toHaveLength(0);
    expect(updated.items.find((item) => item.id === 'hidden')).toMatchObject({ x: 2, y: 0, hidden: true });
  });
});

import { describe, expect, it } from 'vitest';
import { collisionIds, moveItems, previewMove, type MoveItem } from './move';

const items: MoveItem[] = [
  { id: 'a', x: 0, y: 0, width: 100, height: 80 },
  { id: 'b', x: 140, y: 0, width: 100, height: 80 },
  { id: 'locked', x: 0, y: 120, width: 100, height: 80, locked: true },
];

describe('moveItems', () => {
  it('moves selected items and preserves unselected items', () => {
    const moved = moveItems(items, ['a'], { x: 20, y: 30 });
    expect(moved.find((item) => item.id === 'a')).toMatchObject({ x: 20, y: 30 });
    expect(moved.find((item) => item.id === 'b')).toMatchObject({ x: 140, y: 0 });
  });

  it('moves a multi-selection by the same delta', () => {
    const moved = moveItems(items, ['a', 'b'], { x: 30, y: 10 });
    expect(moved.find((item) => item.id === 'a')).toMatchObject({ x: 30, y: 10 });
    expect(moved.find((item) => item.id === 'b')).toMatchObject({ x: 170, y: 10 });
  });

  it('keeps locked items in place', () => {
    const moved = moveItems(items, ['locked'], { x: 50, y: 50 });
    expect(moved.find((item) => item.id === 'locked')).toMatchObject({ x: 0, y: 120 });
  });

  it('snaps movement and prevents moving beyond minimum bounds', () => {
    const moved = moveItems(items, ['a'], { x: -200, y: 27 }, {
      minX: 0,
      minY: 0,
      gridX: 20,
      gridY: 20,
    });
    expect(moved.find((item) => item.id === 'a')).toMatchObject({ x: 0, y: 20 });
  });
});

describe('collision preview', () => {
  it('returns both colliding object ids', () => {
    expect(collisionIds([
      { id: 'a', x: 0, y: 0, width: 100, height: 100 },
      { id: 'b', x: 50, y: 50, width: 100, height: 100 },
    ])).toEqual(['a', 'b']);
  });

  it('reports collisions after a proposed move', () => {
    const preview = previewMove(items, ['a'], { x: 80, y: 0 });
    expect(preview.hasCollisions).toBe(true);
    expect(preview.collisionIds).toEqual(['a', 'b']);
  });

  it('reports a valid collision-free move', () => {
    const preview = previewMove(items, ['a'], { x: 0, y: 240 });
    expect(preview.hasCollisions).toBe(false);
    expect(preview.collisionIds).toEqual([]);
  });
});

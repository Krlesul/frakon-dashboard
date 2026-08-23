import type { TransformRect } from './resize';

export interface MoveItem extends TransformRect {
  id: string;
  locked?: boolean;
}

export interface MoveDelta {
  x: number;
  y: number;
}

export interface MoveConstraints {
  minX?: number;
  minY?: number;
  gridX?: number;
  gridY?: number;
}

export interface MovePreview {
  items: MoveItem[];
  collisionIds: string[];
  hasCollisions: boolean;
}

function snap(value: number, step?: number): number {
  if (!step || step <= 0) return value;
  return Math.round(value / step) * step;
}

export function moveItems(
  items: MoveItem[],
  selectedIds: Iterable<string>,
  delta: MoveDelta,
  constraints: MoveConstraints = {},
): MoveItem[] {
  const selected = new Set(selectedIds);
  const minX = constraints.minX ?? Number.NEGATIVE_INFINITY;
  const minY = constraints.minY ?? Number.NEGATIVE_INFINITY;

  const movable = items.filter((item) => selected.has(item.id) && !item.locked);
  if (movable.length === 0) return items.map((item) => ({ ...item }));

  const left = Math.min(...movable.map((item) => item.x));
  const top = Math.min(...movable.map((item) => item.y));
  const constrainedDeltaX = Math.max(delta.x, minX - left);
  const constrainedDeltaY = Math.max(delta.y, minY - top);
  const snappedDeltaX = snap(constrainedDeltaX, constraints.gridX);
  const snappedDeltaY = snap(constrainedDeltaY, constraints.gridY);

  return items.map((item) => {
    if (!selected.has(item.id) || item.locked) return { ...item };
    return {
      ...item,
      x: item.x + snappedDeltaX,
      y: item.y + snappedDeltaY,
    };
  });
}

export function rectsOverlap(a: TransformRect, b: TransformRect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

export function collisionIds(items: MoveItem[]): string[] {
  const collisions = new Set<string>();
  for (let index = 0; index < items.length; index += 1) {
    for (let other = index + 1; other < items.length; other += 1) {
      if (!rectsOverlap(items[index], items[other])) continue;
      collisions.add(items[index].id);
      collisions.add(items[other].id);
    }
  }
  return [...collisions].sort();
}

export function previewMove(
  items: MoveItem[],
  selectedIds: Iterable<string>,
  delta: MoveDelta,
  constraints: MoveConstraints = {},
): MovePreview {
  const moved = moveItems(items, selectedIds, delta, constraints);
  const collisions = collisionIds(moved);
  return {
    items: moved,
    collisionIds: collisions,
    hasCollisions: collisions.length > 0,
  };
}

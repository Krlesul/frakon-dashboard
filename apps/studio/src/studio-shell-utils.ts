import { itemsOverlap, type FrakonGridItem } from '../../../src/dashboard/layout-model';

export interface StudioDropRect {
  left: number;
  top: number;
  width: number;
}

export interface StudioDropPointInput {
  clientX: number;
  clientY: number;
  rect: StudioDropRect;
  columns: number;
  rowHeight: number;
  gap: number;
  itemWidth: number;
}

export interface StudioGridPoint {
  x: number;
  y: number;
}

export function gridPointFromPointer(input: StudioDropPointInput): StudioGridPoint {
  const columns = Math.max(1, Math.round(input.columns));
  const itemWidth = Math.min(columns, Math.max(1, Math.round(input.itemWidth)));
  const usableWidth = Math.max(1, input.rect.width);
  const normalizedX = Math.min(0.999999, Math.max(0, (input.clientX - input.rect.left) / usableWidth));
  const rawX = Math.floor(normalizedX * columns);
  const x = Math.min(Math.max(0, rawX), Math.max(0, columns - itemWidth));
  const rowPitch = Math.max(1, Math.round(input.rowHeight) + Math.max(0, Math.round(input.gap)));
  const y = Math.max(0, Math.floor((input.clientY - input.rect.top) / rowPitch));
  return { x, y };
}

function candidateFits(
  candidate: FrakonGridItem,
  items: FrakonGridItem[],
): boolean {
  return !items.some((existing) => itemsOverlap(candidate, existing));
}

export function findNearestFreeGridPosition(
  item: FrakonGridItem,
  items: FrakonGridItem[],
  columns: number,
  preferred: StudioGridPoint,
): StudioGridPoint {
  const safeColumns = Math.max(1, Math.round(columns));
  const width = Math.min(safeColumns, Math.max(1, Math.round(item.w)));
  const maxX = Math.max(0, safeColumns - width);
  const startX = Math.min(maxX, Math.max(0, Math.round(preferred.x)));
  const startY = Math.max(0, Math.round(preferred.y));

  for (let rowOffset = 0; rowOffset < 10000; rowOffset += 1) {
    const y = startY + rowOffset;
    const orderedXs: number[] = [];
    for (let distance = 0; distance <= maxX; distance += 1) {
      const left = startX - distance;
      const right = startX + distance;
      if (left >= 0 && !orderedXs.includes(left)) orderedXs.push(left);
      if (right <= maxX && !orderedXs.includes(right)) orderedXs.push(right);
    }
    for (const x of orderedXs) {
      if (candidateFits({ ...item, x, y, w: width }, items)) return { x, y };
    }
  }

  return {
    x: 0,
    y: items.reduce((maximum, existing) => Math.max(maximum, existing.y + existing.h), 0),
  };
}

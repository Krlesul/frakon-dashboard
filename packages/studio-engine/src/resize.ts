export type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export interface TransformRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeConstraints {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  lockAspectRatio?: boolean;
}

export interface ResizeDelta {
  x: number;
  y: number;
}

export interface GroupTransformItem extends TransformRect {
  id: string;
  locked?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeTransformRect(rect: TransformRect): TransformRect {
  const x2 = rect.x + rect.width;
  const y2 = rect.y + rect.height;
  return {
    x: Math.min(rect.x, x2),
    y: Math.min(rect.y, y2),
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
}

export function boundsForItems(items: TransformRect[]): TransformRect {
  if (items.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const normalized = items.map(normalizeTransformRect);
  const left = Math.min(...normalized.map((item) => item.x));
  const top = Math.min(...normalized.map((item) => item.y));
  const right = Math.max(...normalized.map((item) => item.x + item.width));
  const bottom = Math.max(...normalized.map((item) => item.y + item.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function resizeRect(
  source: TransformRect,
  handle: ResizeHandle,
  delta: ResizeDelta,
  constraints: ResizeConstraints = {},
): TransformRect {
  const rect = normalizeTransformRect(source);
  const minWidth = Math.max(1, constraints.minWidth ?? 1);
  const minHeight = Math.max(1, constraints.minHeight ?? 1);
  const maxWidth = Math.max(minWidth, constraints.maxWidth ?? Number.POSITIVE_INFINITY);
  const maxHeight = Math.max(minHeight, constraints.maxHeight ?? Number.POSITIVE_INFINITY);

  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  if (handle.includes('w')) left += delta.x;
  if (handle.includes('e')) right += delta.x;
  if (handle.includes('n')) top += delta.y;
  if (handle.includes('s')) bottom += delta.y;

  let width = right - left;
  let height = bottom - top;

  if (constraints.lockAspectRatio && rect.height > 0) {
    const ratio = rect.width / rect.height;
    const horizontal = handle === 'e' || handle === 'w';
    const vertical = handle === 'n' || handle === 's';
    if (horizontal) height = width / ratio;
    else if (vertical) width = height * ratio;
    else if (Math.abs(delta.x) >= Math.abs(delta.y)) height = width / ratio;
    else width = height * ratio;

    if (handle.includes('w')) left = right - width;
    else right = left + width;
    if (handle.includes('n')) top = bottom - height;
    else bottom = top + height;
  }

  width = clamp(width, minWidth, maxWidth);
  height = clamp(height, minHeight, maxHeight);

  if (handle.includes('w')) left = right - width;
  else right = left + width;
  if (handle.includes('n')) top = bottom - height;
  else bottom = top + height;

  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function resizeGroup(
  items: GroupTransformItem[],
  handle: ResizeHandle,
  delta: ResizeDelta,
  constraints: ResizeConstraints = {},
): GroupTransformItem[] {
  const movable = items.filter((item) => !item.locked);
  if (movable.length === 0) return items.map((item) => ({ ...item }));

  const sourceBounds = boundsForItems(movable);
  const targetBounds = resizeRect(sourceBounds, handle, delta, constraints);
  const scaleX = sourceBounds.width === 0 ? 1 : targetBounds.width / sourceBounds.width;
  const scaleY = sourceBounds.height === 0 ? 1 : targetBounds.height / sourceBounds.height;

  return items.map((item) => {
    if (item.locked) return { ...item };
    return {
      ...item,
      x: targetBounds.x + (item.x - sourceBounds.x) * scaleX,
      y: targetBounds.y + (item.y - sourceBounds.y) * scaleY,
      width: item.width * scaleX,
      height: item.height * scaleY,
    };
  });
}

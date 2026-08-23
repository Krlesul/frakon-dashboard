import { findCollisions, type FrakonDashboardDocument, type FrakonGridItem } from './layout-model';

export type DashboardSelectionLayoutAction =
  | 'align-left'
  | 'align-center-x'
  | 'align-right'
  | 'align-top'
  | 'align-center-y'
  | 'align-bottom'
  | 'distribute-horizontal'
  | 'distribute-vertical';

export interface DashboardSelectionLayoutResult {
  status: 'committed' | 'collision' | 'unchanged';
  document: FrakonDashboardDocument;
  collisionIds: string[];
}

function selectionItems(document: FrakonDashboardDocument, selectedIds: Iterable<string>): FrakonGridItem[] {
  const selected = new Set(selectedIds);
  return document.items.filter((item) => selected.has(item.id) && !item.hidden);
}

function selectionBounds(items: FrakonGridItem[]) {
  const left = Math.min(...items.map((item) => item.x));
  const top = Math.min(...items.map((item) => item.y));
  const right = Math.max(...items.map((item) => item.x + item.w));
  const bottom = Math.max(...items.map((item) => item.y + item.h));
  return { left, top, right, bottom };
}

function alignItem(item: FrakonGridItem, action: DashboardSelectionLayoutAction, bounds: ReturnType<typeof selectionBounds>): FrakonGridItem {
  switch (action) {
    case 'align-left': return { ...item, x: bounds.left };
    case 'align-center-x': return { ...item, x: Math.round((bounds.left + bounds.right - item.w) / 2) };
    case 'align-right': return { ...item, x: bounds.right - item.w };
    case 'align-top': return { ...item, y: bounds.top };
    case 'align-center-y': return { ...item, y: Math.round((bounds.top + bounds.bottom - item.h) / 2) };
    case 'align-bottom': return { ...item, y: bounds.bottom - item.h };
    default: return item;
  }
}

function distributedPositions(items: FrakonGridItem[], axis: 'x' | 'y'): Map<string, number> {
  const sorted = [...items].sort((first, second) => axis === 'x'
    ? first.x - second.x || first.y - second.y
    : first.y - second.y || first.x - second.x);
  const first = sorted[0];
  const last = sorted.at(-1);
  const positions = new Map<string, number>();
  if (!first || !last || sorted.length < 3) return positions;

  if (axis === 'x') {
    const start = first.x;
    const end = last.x + last.w;
    const occupied = sorted.reduce((sum, item) => sum + item.w, 0);
    const gap = (end - start - occupied) / (sorted.length - 1);
    let cursor = start;
    for (const item of sorted) {
      positions.set(item.id, Math.round(cursor));
      cursor += item.w + gap;
    }
  } else {
    const start = first.y;
    const end = last.y + last.h;
    const occupied = sorted.reduce((sum, item) => sum + item.h, 0);
    const gap = (end - start - occupied) / (sorted.length - 1);
    let cursor = start;
    for (const item of sorted) {
      positions.set(item.id, Math.round(cursor));
      cursor += item.h + gap;
    }
  }
  return positions;
}

export function applyDashboardSelectionLayout(
  document: FrakonDashboardDocument,
  selectedIds: Iterable<string>,
  action: DashboardSelectionLayoutAction,
): DashboardSelectionLayoutResult {
  const selected = selectionItems(document, selectedIds);
  const movable = selected.filter((item) => !item.locked);
  if (selected.length < 2 || movable.length === 0) {
    return { status: 'unchanged', document: structuredClone(document), collisionIds: [] };
  }

  const byId = new Map<string, FrakonGridItem>();
  if (action.startsWith('align-')) {
    const bounds = selectionBounds(selected);
    for (const item of movable) byId.set(item.id, alignItem(item, action, bounds));
  } else {
    if (movable.length < 3) {
      return { status: 'unchanged', document: structuredClone(document), collisionIds: [] };
    }
    const axis = action === 'distribute-horizontal' ? 'x' : 'y';
    const positions = distributedPositions(movable, axis);
    for (const item of movable) {
      const position = positions.get(item.id);
      if (position === undefined) continue;
      byId.set(item.id, axis === 'x' ? { ...item, x: position } : { ...item, y: position });
    }
  }

  const items = document.items.map((item) => structuredClone(byId.get(item.id) ?? item));
  const changed = items.some((item, index) => item.x !== document.items[index]?.x || item.y !== document.items[index]?.y);
  if (!changed) return { status: 'unchanged', document: structuredClone(document), collisionIds: [] };

  const collisionIds = new Set<string>();
  for (const [first, second] of findCollisions(items)) {
    collisionIds.add(first);
    collisionIds.add(second);
  }
  if (collisionIds.size > 0) {
    return { status: 'collision', document: structuredClone(document), collisionIds: [...collisionIds] };
  }

  return { status: 'committed', document: { ...document, items }, collisionIds: [] };
}

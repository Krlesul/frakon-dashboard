import type { SurfaceStyle } from '../../packages/design-system/src/surface-style';
import type { LayoutConstraint } from '../../packages/studio-engine/src/constraints';

export type FrakonBreakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export interface FrakonGridItem {
  id: string;
  card: Record<string, unknown>;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  locked?: boolean;
  hidden?: boolean;
  surface?: SurfaceStyle;
}

export interface FrakonDashboardDocument {
  version: 1;
  id: string;
  title: string;
  breakpoint: FrakonBreakpoint;
  columns: number;
  rowHeight: number;
  gap: number;
  surface?: SurfaceStyle;
  cardSurface?: SurfaceStyle;
  constraints?: LayoutConstraint[];
  items: FrakonGridItem[];
}

export function clampGridItem(item: FrakonGridItem, columns: number): FrakonGridItem {
  const minW = Math.max(1, item.minW ?? 1);
  const minH = Math.max(1, item.minH ?? 1);
  const maxW = Math.min(columns, Math.max(minW, item.maxW ?? columns));
  const maxH = Math.max(minH, item.maxH ?? 24);
  const w = Math.min(maxW, Math.max(minW, Math.round(item.w)));
  const h = Math.min(maxH, Math.max(minH, Math.round(item.h)));
  const x = Math.min(Math.max(0, Math.round(item.x)), Math.max(0, columns - w));
  const y = Math.max(0, Math.round(item.y));
  return { ...item, x, y, w, h };
}

export function itemsOverlap(a: FrakonGridItem, b: FrakonGridItem): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function findCollisions(items: FrakonGridItem[]): Array<[string, string]> {
  const collisions: Array<[string, string]> = [];
  for (let index = 0; index < items.length; index += 1) {
    for (let other = index + 1; other < items.length; other += 1) {
      if (itemsOverlap(items[index], items[other])) collisions.push([items[index].id, items[other].id]);
    }
  }
  return collisions;
}

function firstFreePosition(item: FrakonGridItem, placed: FrakonGridItem[], columns: number): Pick<FrakonGridItem, 'x' | 'y'> {
  const maxX = Math.max(0, columns - item.w);
  for (let y = 0; y < 10000; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const candidate = { ...item, x, y };
      if (!placed.some((existing) => itemsOverlap(candidate, existing))) return { x, y };
    }
  }
  return { x: 0, y: placed.reduce((maximum, existing) => Math.max(maximum, existing.y + existing.h), 0) };
}

/**
 * Resolve collisions without changing serialized layer order or repacking a
 * layout that is already valid. Locked and hidden cards are fixed obstacles.
 * Visible movable cards keep their accepted geometry unless that exact frame
 * collides with a fixed/earlier resolved card.
 */
export function compactItems(items: FrakonGridItem[], columns: number): FrakonGridItem[] {
  const clamped = items.map((item) => clampGridItem(item, columns));
  const fixed = clamped
    .filter((item) => item.locked || item.hidden)
    .sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const movable = clamped
    .filter((item) => !item.locked && !item.hidden)
    .sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const placed = [...fixed];
  const resolved = new Map<string, FrakonGridItem>(fixed.map((item) => [item.id, item]));

  for (const item of movable) {
    const collides = placed.some((existing) => itemsOverlap(item, existing));
    const next = collides
      ? { ...item, ...firstFreePosition(item, placed, columns) }
      : item;
    placed.push(next);
    resolved.set(item.id, next);
  }

  // items[] is also the persisted z-order, so geometry solving maps positions
  // back onto the canonical source order instead of sorting the array.
  return clamped.map((item) => resolved.get(item.id) ?? item);
}

function normalizeConstraints(
  constraints: LayoutConstraint[] | undefined,
  items: FrakonGridItem[],
): LayoutConstraint[] | undefined {
  if (!constraints) return undefined;
  const ids = new Set(items.map((item) => item.id));
  const unique = new Map<string, LayoutConstraint>();
  for (const constraint of constraints) {
    if (!constraint.id || !ids.has(constraint.sourceId) || !ids.has(constraint.targetId)) continue;
    unique.set(constraint.id, structuredClone(constraint));
  }
  return [...unique.values()];
}

export function normalizeDashboard(document: FrakonDashboardDocument): FrakonDashboardDocument {
  const columns = Math.max(1, Math.round(document.columns));
  const items = document.items.map((item) => clampGridItem(item, columns));
  return {
    ...document,
    version: 1,
    columns,
    rowHeight: Math.max(24, Math.round(document.rowHeight)),
    gap: Math.max(0, Math.round(document.gap)),
    constraints: normalizeConstraints(document.constraints, items),
    items,
  };
}

export function normalizeAndCompactDashboard(document: FrakonDashboardDocument): FrakonDashboardDocument {
  const normalized = normalizeDashboard(document);
  return { ...normalized, items: compactItems(normalized.items, normalized.columns) };
}

export function updateGridItem(
  document: FrakonDashboardDocument,
  id: string,
  patch: Partial<Pick<FrakonGridItem, 'x' | 'y' | 'w' | 'h'>>,
): FrakonDashboardDocument {
  return normalizeDashboard({
    ...document,
    items: document.items.map((item) => (
      item.id === id && !item.locked && !item.hidden ? { ...item, ...patch } : item
    )),
  });
}

export function updateGridItemCollisionSafe(
  document: FrakonDashboardDocument,
  id: string,
  patch: Partial<Pick<FrakonGridItem, 'x' | 'y' | 'w' | 'h'>>,
): FrakonDashboardDocument {
  const updated = updateGridItem(document, id, patch);
  return normalizeAndCompactDashboard(updated);
}

export function addGridItem(document: FrakonDashboardDocument, item: FrakonGridItem): FrakonDashboardDocument {
  if (document.items.some((existing) => existing.id === item.id)) throw new Error(`Duplicate dashboard item id: ${item.id}`);
  return normalizeDashboard({ ...document, items: [...document.items, item] });
}

export function duplicateGridItem(
  document: FrakonDashboardDocument,
  sourceId: string,
  duplicateId: string,
): FrakonDashboardDocument {
  if (document.items.some((item) => item.id === duplicateId)) throw new Error(`Duplicate dashboard item id: ${duplicateId}`);
  const source = document.items.find((item) => item.id === sourceId);
  if (!source) return document;
  const duplicate: FrakonGridItem = {
    ...structuredClone(source),
    id: duplicateId,
    x: source.x,
    y: source.y,
    locked: false,
    hidden: false,
  };
  return normalizeAndCompactDashboard({ ...document, items: [...document.items, duplicate] });
}

export function removeGridItem(document: FrakonDashboardDocument, id: string): FrakonDashboardDocument {
  const target = document.items.find((item) => item.id === id);
  if (target?.locked) return document;
  return normalizeDashboard({
    ...document,
    constraints: document.constraints?.filter(
      (constraint) => constraint.sourceId !== id && constraint.targetId !== id,
    ),
    items: document.items.filter((item) => item.id !== id),
  });
}

export function setGridItemLocked(document: FrakonDashboardDocument, id: string, locked: boolean): FrakonDashboardDocument {
  return { ...document, items: document.items.map((item) => item.id === id ? { ...item, locked } : item) };
}

export function setGridItemHidden(document: FrakonDashboardDocument, id: string, hidden: boolean): FrakonDashboardDocument {
  return { ...document, items: document.items.map((item) => item.id === id ? { ...item, hidden } : item) };
}

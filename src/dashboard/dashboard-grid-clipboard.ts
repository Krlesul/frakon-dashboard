import type { LayoutConstraint } from '../../packages/studio-engine/src/constraints';
import {
  findCollisions,
  normalizeDashboard,
  type FrakonDashboardDocument,
  type FrakonGridItem,
} from './layout-model';

export interface DashboardGridClipboardPayload {
  items: FrakonGridItem[];
  constraints: LayoutConstraint[];
}

export interface DashboardGridPasteResult {
  status: 'committed' | 'invalid';
  document: FrakonDashboardDocument;
  selectedIds: string[];
  reason?: string;
}

function uniqueId(base: string, used: Set<string>): string {
  const stem = `${base}-copy`;
  if (!used.has(stem)) {
    used.add(stem);
    return stem;
  }
  let index = 2;
  while (used.has(`${stem}-${index}`)) index += 1;
  const id = `${stem}-${index}`;
  used.add(id);
  return id;
}

export function copyDashboardGridSelection(
  document: FrakonDashboardDocument,
  selectedIds: Iterable<string>,
): DashboardGridClipboardPayload | undefined {
  const selected = new Set(selectedIds);
  const items = document.items
    .filter((item) => selected.has(item.id) && !item.locked)
    .map((item) => structuredClone(item));
  if (!items.length) return undefined;

  const copiedIds = new Set(items.map((item) => item.id));
  const constraints = (document.constraints ?? [])
    .filter((constraint) => copiedIds.has(constraint.sourceId) && copiedIds.has(constraint.targetId))
    .map((constraint) => structuredClone(constraint));
  return { items, constraints };
}

function placedItemsForOffset(
  document: FrakonDashboardDocument,
  payload: DashboardGridClipboardPayload,
  idMap: Map<string, string>,
  dx: number,
  dy: number,
): FrakonGridItem[] | undefined {
  const items = payload.items.map((item) => ({
    ...structuredClone(item),
    id: idMap.get(item.id)!,
    x: item.x + dx,
    y: item.y + dy,
    locked: false,
  }));
  if (items.some((item) => item.x < 0 || item.y < 0 || item.x + item.w > document.columns)) return undefined;
  if (findCollisions([...document.items, ...items]).length > 0) return undefined;
  return items;
}

export function pasteDashboardGridClipboard(
  document: FrakonDashboardDocument,
  payload: DashboardGridClipboardPayload | undefined,
): DashboardGridPasteResult {
  if (!payload?.items.length) {
    return {
      status: 'invalid',
      document: structuredClone(document),
      selectedIds: [],
      reason: 'Clipboard is empty.',
    };
  }

  const usedItemIds = new Set(document.items.map((item) => item.id));
  const idMap = new Map<string, string>();
  for (const item of payload.items) idMap.set(item.id, uniqueId(item.id, usedItemIds));

  let pasted: FrakonGridItem[] | undefined;
  for (let offset = 1; offset <= 24; offset += 1) {
    pasted = placedItemsForOffset(document, payload, idMap, offset, offset);
    if (pasted) break;
  }
  if (!pasted) {
    const maxBottom = Math.max(0, ...document.items.map((item) => item.y + item.h));
    const minTop = Math.min(...payload.items.map((item) => item.y));
    pasted = placedItemsForOffset(document, payload, idMap, 0, maxBottom + 1 - minTop);
  }
  if (!pasted) {
    return {
      status: 'invalid',
      document: structuredClone(document),
      selectedIds: [],
      reason: 'Copied items cannot fit inside the dashboard columns.',
    };
  }

  const usedConstraintIds = new Set((document.constraints ?? []).map((constraint) => constraint.id));
  const constraints = payload.constraints.flatMap((constraint) => {
    const sourceId = idMap.get(constraint.sourceId);
    const targetId = idMap.get(constraint.targetId);
    if (!sourceId || !targetId) return [];
    return [{
      ...structuredClone(constraint),
      id: uniqueId(constraint.id, usedConstraintIds),
      sourceId,
      targetId,
    }];
  });

  return {
    status: 'committed',
    document: normalizeDashboard({
      ...document,
      items: [...document.items, ...pasted],
      constraints: [...(document.constraints ?? []), ...constraints],
    }),
    selectedIds: pasted.map((item) => item.id),
  };
}

import type { LayoutConstraint } from '../../packages/studio-engine/src/constraints';
import { canvasV2CollisionIds } from './dashboard-canvas-v2-session';
import { normalizeDashboardV2, type FrakonCanvasItem, type FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2ClipboardSnapshot {
  version: 1;
  items: FrakonCanvasItem[];
  constraints: LayoutConstraint[];
  origin: { x: number; y: number };
}

export interface DashboardCanvasV2ClipboardPasteResult {
  status: 'committed' | 'invalid';
  document: FrakonDashboardDocumentV2;
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

export function copyDashboardCanvasV2Selection(
  document: FrakonDashboardDocumentV2,
  selectedIds: Iterable<string>,
): DashboardCanvasV2ClipboardSnapshot | undefined {
  const selected = new Set(selectedIds);
  const items = document.items.filter((item) => selected.has(item.id) && !item.locked);
  if (!items.length) return undefined;

  const itemIds = new Set(items.map((item) => item.id));
  const origin = {
    x: Math.min(...items.map((item) => item.frame.x)),
    y: Math.min(...items.map((item) => item.frame.y)),
  };

  return {
    version: 1,
    origin,
    items: items.map((item) => ({
      ...structuredClone(item),
      frame: {
        ...item.frame,
        x: item.frame.x - origin.x,
        y: item.frame.y - origin.y,
      },
    })),
    constraints: (document.constraints ?? [])
      .filter((constraint) => itemIds.has(constraint.sourceId) && itemIds.has(constraint.targetId))
      .map((constraint) => structuredClone(constraint)),
  };
}

function candidateCollidesWithInserted(
  document: FrakonDashboardDocumentV2,
  insertedIds: Set<string>,
): boolean {
  return canvasV2CollisionIds(document.items).some((id) => insertedIds.has(id));
}

export function pasteDashboardCanvasV2Clipboard(
  document: FrakonDashboardDocumentV2,
  clipboard: DashboardCanvasV2ClipboardSnapshot | undefined,
  target?: { x: number; y: number },
): DashboardCanvasV2ClipboardPasteResult {
  if (!clipboard || clipboard.version !== 1 || !clipboard.items.length) {
    return {
      status: 'invalid',
      document: structuredClone(document),
      selectedIds: [],
      reason: 'Clipboard does not contain FRAKON canvas items.',
    };
  }

  const usedItemIds = new Set(document.items.map((item) => item.id));
  const itemIdMap = new Map<string, string>();
  for (const item of clipboard.items) itemIdMap.set(item.id, uniqueId(item.id, usedItemIds));

  const usedConstraintIds = new Set((document.constraints ?? []).map((constraint) => constraint.id));
  const copiedConstraints = clipboard.constraints.flatMap((constraint) => {
    const sourceId = itemIdMap.get(constraint.sourceId);
    const targetId = itemIdMap.get(constraint.targetId);
    if (!sourceId || !targetId) return [];
    return [{
      ...structuredClone(constraint),
      id: uniqueId(constraint.id, usedConstraintIds),
      sourceId,
      targetId,
    }];
  });

  const step = Math.max(1, document.layout.snap.size) * 2;
  const defaultAnchor = {
    x: clipboard.origin.x + step,
    y: clipboard.origin.y + step,
  };
  const requestedAnchor = target ?? defaultAnchor;

  const build = (anchorX: number, anchorY: number): FrakonCanvasItem[] => clipboard.items.map((item) => ({
    ...structuredClone(item),
    id: itemIdMap.get(item.id)!,
    locked: false,
    frame: {
      ...item.frame,
      x: anchorX + item.frame.x,
      y: anchorY + item.frame.y,
    },
  }));

  let inserted: FrakonCanvasItem[] | undefined;
  for (let attempt = 0; attempt <= 12; attempt += 1) {
    const items = build(requestedAnchor.x + step * attempt, requestedAnchor.y + step * attempt);
    const insertedIds = new Set(items.map((item) => item.id));
    const candidate = normalizeDashboardV2({
      ...document,
      constraints: [...(document.constraints ?? []), ...copiedConstraints],
      items: [...document.items, ...items],
    });
    if (!candidateCollidesWithInserted(candidate, insertedIds)) {
      inserted = candidate.items.filter((item) => insertedIds.has(item.id));
      break;
    }
  }

  if (!inserted) {
    const maxBottom = Math.max(document.layout.minHeight, ...document.items.map((item) => item.frame.y + item.frame.height));
    inserted = build(0, maxBottom + step);
  }

  const insertedIds = new Set(inserted.map((item) => item.id));
  const next = normalizeDashboardV2({
    ...document,
    layout: {
      ...document.layout,
      minHeight: Math.max(document.layout.minHeight, ...inserted.map((item) => item.frame.y + item.frame.height)),
    },
    constraints: [...(document.constraints ?? []), ...copiedConstraints],
    items: [...document.items, ...inserted],
  });

  if (candidateCollidesWithInserted(next, insertedIds)) {
    return {
      status: 'invalid',
      document: structuredClone(document),
      selectedIds: [],
      reason: 'Clipboard items could not be pasted without a collision.',
    };
  }

  return {
    status: 'committed',
    document: next,
    selectedIds: next.items.filter((item) => insertedIds.has(item.id)).map((item) => item.id),
  };
}

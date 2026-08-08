import { canvasV2CollisionIds } from './dashboard-canvas-v2-session';
import { normalizeDashboardV2, type FrakonCanvasItem, type FrakonDashboardDocumentV2 } from './layout-model-v2';

export type DashboardCanvasV2ItemAction = 'duplicate' | 'delete';

export interface DashboardCanvasV2ItemActionResult {
  status: 'committed' | 'invalid';
  document: FrakonDashboardDocumentV2;
  selectedIds: string[];
  reason?: string;
}

function uniqueId(base: string, used: Set<string>): string {
  const stem = `${base}-copy`;
  if (!used.has(stem)) { used.add(stem); return stem; }
  let index = 2;
  while (used.has(`${stem}-${index}`)) index += 1;
  const id = `${stem}-${index}`;
  used.add(id);
  return id;
}

function duplicateSelection(document: FrakonDashboardDocumentV2, selected: Set<string>): DashboardCanvasV2ItemActionResult {
  const originals = document.items.filter((item) => selected.has(item.id) && !item.locked);
  if (!originals.length) return { status: 'invalid', document: structuredClone(document), selectedIds: [], reason: 'At least one unlocked selected item is required.' };

  const usedIds = new Set(document.items.map((item) => item.id));
  const idMap = new Map<string, string>();
  for (const item of originals) idMap.set(item.id, uniqueId(item.id, usedIds));

  const step = Math.max(1, document.layout.snap.size) * 2;
  const maxBottom = Math.max(document.layout.minHeight, ...document.items.map((item) => item.frame.y + item.frame.height));

  const build = (dx: number, dy: number): FrakonCanvasItem[] => originals.map((item) => ({
    ...structuredClone(item),
    id: idMap.get(item.id)!,
    locked: false,
    frame: { ...item.frame, x: item.frame.x + dx, y: item.frame.y + dy },
  }));

  let duplicates: FrakonCanvasItem[] | undefined;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const candidateDuplicates = build(step * attempt, step * attempt);
    const candidate = normalizeDashboardV2({ ...document, items: [...document.items, ...candidateDuplicates] });
    if (!canvasV2CollisionIds(candidate.items).length) { duplicates = candidate.items.slice(document.items.length); break; }
  }
  if (!duplicates) {
    const minTop = Math.min(...originals.map((item) => item.frame.y));
    duplicates = build(0, maxBottom + step - minTop);
  }

  const duplicateIds = new Set(duplicates.map((item) => item.id));
  const constraintIds = new Set((document.constraints ?? []).map((constraint) => constraint.id));
  const copiedConstraints = (document.constraints ?? []).flatMap((constraint) => {
    const sourceId = idMap.get(constraint.sourceId);
    const targetId = idMap.get(constraint.targetId);
    if (!sourceId || !targetId || !duplicateIds.has(sourceId) || !duplicateIds.has(targetId)) return [];
    const id = uniqueId(constraint.id, constraintIds);
    return [{ ...structuredClone(constraint), id, sourceId, targetId }];
  });

  const minHeight = Math.max(document.layout.minHeight, ...duplicates.map((item) => item.frame.y + item.frame.height));
  const next = normalizeDashboardV2({
    ...document,
    layout: { ...document.layout, minHeight },
    constraints: [...(document.constraints ?? []), ...copiedConstraints],
    items: [...document.items, ...duplicates],
  });
  return { status: 'committed', document: next, selectedIds: duplicates.map((item) => item.id) };
}

function deleteSelection(document: FrakonDashboardDocumentV2, selected: Set<string>): DashboardCanvasV2ItemActionResult {
  const removable = new Set(document.items.filter((item) => selected.has(item.id) && !item.locked).map((item) => item.id));
  if (!removable.size) return { status: 'invalid', document: structuredClone(document), selectedIds: [], reason: 'At least one unlocked selected item is required.' };
  const next = normalizeDashboardV2({
    ...document,
    items: document.items.filter((item) => !removable.has(item.id)),
    constraints: (document.constraints ?? []).filter((constraint) => !removable.has(constraint.sourceId) && !removable.has(constraint.targetId)),
  });
  return { status: 'committed', document: next, selectedIds: [] };
}

export function applyDashboardCanvasV2ItemAction(
  document: FrakonDashboardDocumentV2,
  selectedIds: Iterable<string>,
  action: DashboardCanvasV2ItemAction,
): DashboardCanvasV2ItemActionResult {
  const selected = new Set(selectedIds);
  return action === 'duplicate' ? duplicateSelection(document, selected) : deleteSelection(document, selected);
}

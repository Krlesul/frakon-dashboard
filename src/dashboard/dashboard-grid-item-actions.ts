import { findCollisions, normalizeDashboard, type FrakonDashboardDocument, type FrakonGridItem } from './layout-model';

export type DashboardGridItemAction = 'duplicate' | 'delete';

export interface DashboardGridItemActionResult {
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

function duplicateFits(
  document: FrakonDashboardDocument,
  originals: FrakonGridItem[],
  idMap: Map<string, string>,
  dx: number,
  dy: number,
): FrakonGridItem[] | undefined {
  const duplicates = originals.map((item) => ({
    ...structuredClone(item),
    id: idMap.get(item.id)!,
    x: item.x + dx,
    y: item.y + dy,
    locked: false,
    hidden: false,
  }));
  if (duplicates.some((item) => item.x < 0 || item.y < 0 || item.x + item.w > document.columns)) return undefined;
  if (findCollisions([...document.items, ...duplicates]).length > 0) return undefined;
  return duplicates;
}

function duplicateSelection(
  document: FrakonDashboardDocument,
  selected: Set<string>,
): DashboardGridItemActionResult {
  const originals = document.items.filter((item) => selected.has(item.id) && !item.locked);
  if (!originals.length) {
    return {
      status: 'invalid',
      document: structuredClone(document),
      selectedIds: [],
      reason: 'At least one unlocked selected item is required.',
    };
  }

  const usedIds = new Set(document.items.map((item) => item.id));
  const idMap = new Map<string, string>();
  for (const item of originals) idMap.set(item.id, uniqueId(item.id, usedIds));

  let duplicates: FrakonGridItem[] | undefined;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    duplicates = duplicateFits(document, originals, idMap, attempt, attempt);
    if (duplicates) break;
  }

  if (!duplicates) {
    const maxBottom = Math.max(0, ...document.items.map((item) => item.y + item.h));
    const minTop = Math.min(...originals.map((item) => item.y));
    const dy = maxBottom + 1 - minTop;
    duplicates = originals.map((item) => ({
      ...structuredClone(item),
      id: idMap.get(item.id)!,
      x: item.x,
      y: item.y + dy,
      locked: false,
      hidden: false,
    }));
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

  const next = normalizeDashboard({
    ...document,
    constraints: [...(document.constraints ?? []), ...copiedConstraints],
    items: [...document.items, ...duplicates],
  });
  return {
    status: 'committed',
    document: next,
    selectedIds: duplicates.map((item) => item.id),
  };
}

function deleteSelection(
  document: FrakonDashboardDocument,
  selected: Set<string>,
): DashboardGridItemActionResult {
  const removable = new Set(
    document.items
      .filter((item) => selected.has(item.id) && !item.locked)
      .map((item) => item.id),
  );
  if (!removable.size) {
    return {
      status: 'invalid',
      document: structuredClone(document),
      selectedIds: [],
      reason: 'At least one unlocked selected item is required.',
    };
  }

  const next = normalizeDashboard({
    ...document,
    items: document.items.filter((item) => !removable.has(item.id)),
    constraints: (document.constraints ?? []).filter(
      (constraint) => !removable.has(constraint.sourceId) && !removable.has(constraint.targetId),
    ),
  });
  return { status: 'committed', document: next, selectedIds: [] };
}

export function applyDashboardGridItemAction(
  document: FrakonDashboardDocument,
  selectedIds: Iterable<string>,
  action: DashboardGridItemAction,
): DashboardGridItemActionResult {
  const selected = new Set(selectedIds);
  return action === 'duplicate'
    ? duplicateSelection(document, selected)
    : deleteSelection(document, selected);
}

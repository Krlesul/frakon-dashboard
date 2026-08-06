import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

export interface DashboardMergeConflict {
  path: string;
  base: unknown;
  local: unknown;
  remote: unknown;
}

export interface DashboardMergeResult {
  document: FrakonDashboardDocument;
  conflicts: DashboardMergeConflict[];
  clean: boolean;
}

export function mergeDashboardDocuments(
  base: FrakonDashboardDocument,
  local: FrakonDashboardDocument,
  remote: FrakonDashboardDocument,
): DashboardMergeResult {
  const conflicts: DashboardMergeConflict[] = [];
  const document: FrakonDashboardDocument = {
    ...structuredClone(base),
    title: mergeValue('title', base.title, local.title, remote.title, conflicts),
    breakpoint: mergeValue('breakpoint', base.breakpoint, local.breakpoint, remote.breakpoint, conflicts),
    columns: mergeValue('columns', base.columns, local.columns, remote.columns, conflicts),
    rowHeight: mergeValue('rowHeight', base.rowHeight, local.rowHeight, remote.rowHeight, conflicts),
    gap: mergeValue('gap', base.gap, local.gap, remote.gap, conflicts),
    surface: mergeValue('surface', base.surface, local.surface, remote.surface, conflicts),
    cardSurface: mergeValue('cardSurface', base.cardSurface, local.cardSurface, remote.cardSurface, conflicts),
    constraints: mergeValue('constraints', base.constraints, local.constraints, remote.constraints, conflicts),
    items: mergeItems(base.items, local.items, remote.items, conflicts),
  };
  return { document, conflicts, clean: conflicts.length === 0 };
}

function mergeItems(
  baseItems: FrakonGridItem[],
  localItems: FrakonGridItem[],
  remoteItems: FrakonGridItem[],
  conflicts: DashboardMergeConflict[],
): FrakonGridItem[] {
  const base = new Map(baseItems.map((item) => [item.id, item]));
  const local = new Map(localItems.map((item) => [item.id, item]));
  const remote = new Map(remoteItems.map((item) => [item.id, item]));
  const ids = new Set([...base.keys(), ...local.keys(), ...remote.keys()]);
  const merged: FrakonGridItem[] = [];

  for (const id of ids) {
    const item = mergeValue(`items.${id}`, base.get(id), local.get(id), remote.get(id), conflicts);
    if (item) merged.push(item);
  }
  return merged.sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
}

function mergeValue<T>(
  path: string,
  base: T,
  local: T,
  remote: T,
  conflicts: DashboardMergeConflict[],
): T {
  if (equal(local, remote)) return structuredClone(local);
  if (equal(local, base)) return structuredClone(remote);
  if (equal(remote, base)) return structuredClone(local);
  conflicts.push({
    path,
    base: structuredClone(base),
    local: structuredClone(local),
    remote: structuredClone(remote),
  });
  return structuredClone(local);
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

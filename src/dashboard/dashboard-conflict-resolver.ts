import type { FrakonDashboardAnyDocument } from './dashboard-document-codec';
import type { FrakonCanvasItem, FrakonDashboardDocumentV2 } from './layout-model-v2';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

export interface DashboardMergeConflict {
  path: string;
  base: unknown;
  local: unknown;
  remote: unknown;
}

export interface DashboardMergeResult<
  TDocument extends FrakonDashboardAnyDocument = FrakonDashboardDocument,
> {
  document: TDocument;
  conflicts: DashboardMergeConflict[];
  clean: boolean;
}

export function mergeDashboardDocuments<TDocument extends FrakonDashboardAnyDocument>(
  base: TDocument,
  local: TDocument,
  remote: TDocument,
): DashboardMergeResult<TDocument> {
  if (base.version !== local.version || base.version !== remote.version) {
    throw new Error('Cannot merge dashboard conflicts across document versions. Migrate all revisions first.');
  }

  return base.version === 2
    ? mergeV2(
        base as FrakonDashboardDocumentV2,
        local as FrakonDashboardDocumentV2,
        remote as FrakonDashboardDocumentV2,
      ) as DashboardMergeResult<TDocument>
    : mergeV1(
        base as FrakonDashboardDocument,
        local as FrakonDashboardDocument,
        remote as FrakonDashboardDocument,
      ) as DashboardMergeResult<TDocument>;
}

function mergeV1(
  base: FrakonDashboardDocument,
  local: FrakonDashboardDocument,
  remote: FrakonDashboardDocument,
): DashboardMergeResult<FrakonDashboardDocument> {
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
    items: mergeItems(base.items, local.items, remote.items, conflicts, sortGridItems),
  };
  return { document, conflicts, clean: conflicts.length === 0 };
}

function mergeV2(
  base: FrakonDashboardDocumentV2,
  local: FrakonDashboardDocumentV2,
  remote: FrakonDashboardDocumentV2,
): DashboardMergeResult<FrakonDashboardDocumentV2> {
  const conflicts: DashboardMergeConflict[] = [];
  const document: FrakonDashboardDocumentV2 = {
    ...structuredClone(base),
    title: mergeValue('title', base.title, local.title, remote.title, conflicts),
    breakpoint: mergeValue('breakpoint', base.breakpoint, local.breakpoint, remote.breakpoint, conflicts),
    layout: mergeValue('layout', base.layout, local.layout, remote.layout, conflicts),
    surface: mergeValue('surface', base.surface, local.surface, remote.surface, conflicts),
    cardSurface: mergeValue('cardSurface', base.cardSurface, local.cardSurface, remote.cardSurface, conflicts),
    constraints: mergeValue('constraints', base.constraints, local.constraints, remote.constraints, conflicts),
    items: mergeItems(base.items, local.items, remote.items, conflicts, sortCanvasItems),
  };
  return { document, conflicts, clean: conflicts.length === 0 };
}

function mergeItems<TItem extends { id: string }>(
  baseItems: TItem[],
  localItems: TItem[],
  remoteItems: TItem[],
  conflicts: DashboardMergeConflict[],
  sort: (left: TItem, right: TItem) => number,
): TItem[] {
  const base = new Map(baseItems.map((item) => [item.id, item]));
  const local = new Map(localItems.map((item) => [item.id, item]));
  const remote = new Map(remoteItems.map((item) => [item.id, item]));
  const ids = new Set([...base.keys(), ...local.keys(), ...remote.keys()]);
  const merged: TItem[] = [];

  for (const id of ids) {
    const item = mergeValue(`items.${id}`, base.get(id), local.get(id), remote.get(id), conflicts);
    if (item) merged.push(item);
  }
  return merged.sort(sort);
}

function sortGridItems(left: FrakonGridItem, right: FrakonGridItem): number {
  return left.y - right.y || left.x - right.x || left.id.localeCompare(right.id);
}

function sortCanvasItems(left: FrakonCanvasItem, right: FrakonCanvasItem): number {
  return left.frame.y - right.frame.y
    || left.frame.x - right.frame.x
    || left.id.localeCompare(right.id);
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

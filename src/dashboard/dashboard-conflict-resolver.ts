import {
  isDashboardDocumentV1,
  type FrakonDashboardAnyDocument,
} from './dashboard-document-codec';
import { isDashboardDocumentV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';
import type { FrakonDashboardDocument } from './layout-model';

export interface DashboardMergeConflict {
  path: string;
  base: unknown;
  local: unknown;
  remote: unknown;
}

export interface DashboardMergeResult<TDocument extends FrakonDashboardAnyDocument = FrakonDashboardDocument> {
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
  if (base.version === 2) {
    if (!isDashboardDocumentV2(base) || !isDashboardDocumentV2(local) || !isDashboardDocumentV2(remote)) {
      throw new Error('Cannot merge invalid or non-canonical version 2 dashboard documents.');
    }
    return mergeV2(
      base as FrakonDashboardDocumentV2,
      local as FrakonDashboardDocumentV2,
      remote as FrakonDashboardDocumentV2,
    ) as DashboardMergeResult<TDocument>;
  }
  if (!isDashboardDocumentV1(base) || !isDashboardDocumentV1(local) || !isDashboardDocumentV1(remote)) {
    throw new Error('Cannot merge invalid or non-canonical version 1 dashboard documents.');
  }
  return mergeV1(
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
  const mergedItems = mergeItems(base.items, local.items, remote.items, conflicts);
  const itemOrder = mergeItemOrder(
    base.items.map((item) => item.id),
    local.items.map((item) => item.id),
    remote.items.map((item) => item.id),
    new Set(mergedItems.map((item) => item.id)),
    conflicts,
  );
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
    items: orderItems(mergedItems, itemOrder),
  };
  escalateV1IntegrityConflicts(base, local, remote, document, conflicts);
  return { document, conflicts, clean: conflicts.length === 0 };
}

function mergeV2(
  base: FrakonDashboardDocumentV2,
  local: FrakonDashboardDocumentV2,
  remote: FrakonDashboardDocumentV2,
): DashboardMergeResult<FrakonDashboardDocumentV2> {
  const conflicts: DashboardMergeConflict[] = [];
  const mergedItems = mergeItems(base.items, local.items, remote.items, conflicts);
  const itemOrder = mergeItemOrder(
    base.items.map((item) => item.id),
    local.items.map((item) => item.id),
    remote.items.map((item) => item.id),
    new Set(mergedItems.map((item) => item.id)),
    conflicts,
  );
  const document: FrakonDashboardDocumentV2 = {
    ...structuredClone(base),
    title: mergeValue('title', base.title, local.title, remote.title, conflicts),
    breakpoint: mergeValue('breakpoint', base.breakpoint, local.breakpoint, remote.breakpoint, conflicts),
    layout: mergeValue('layout', base.layout, local.layout, remote.layout, conflicts),
    surface: mergeValue('surface', base.surface, local.surface, remote.surface, conflicts),
    cardSurface: mergeValue('cardSurface', base.cardSurface, local.cardSurface, remote.cardSurface, conflicts),
    constraints: mergeValue('constraints', base.constraints, local.constraints, remote.constraints, conflicts),
    items: orderItems(mergedItems, itemOrder),
  };
  escalateV2IntegrityConflicts(base, local, remote, document, conflicts);
  return { document, conflicts, clean: conflicts.length === 0 };
}

function escalateV1IntegrityConflicts(
  base: FrakonDashboardDocument,
  local: FrakonDashboardDocument,
  remote: FrakonDashboardDocument,
  merged: FrakonDashboardDocument,
  conflicts: DashboardMergeConflict[],
): void {
  if (isDashboardDocumentV1(merged)) return;
  const before = conflicts.length;
  addIntegrityConflict('columns', base.columns, local.columns, remote.columns, conflicts);
  addIntegrityConflict('rowHeight', base.rowHeight, local.rowHeight, remote.rowHeight, conflicts);
  addIntegrityConflict('gap', base.gap, local.gap, remote.gap, conflicts);
  addIntegrityConflict('constraints', base.constraints, local.constraints, remote.constraints, conflicts);
  addItemIntegrityConflicts(base.items, local.items, remote.items, conflicts);
  if (conflicts.length === before) {
    throw new Error('Version 1 dashboard merge produced a non-canonical result without resolvable source differences.');
  }
}

function escalateV2IntegrityConflicts(
  base: FrakonDashboardDocumentV2,
  local: FrakonDashboardDocumentV2,
  remote: FrakonDashboardDocumentV2,
  merged: FrakonDashboardDocumentV2,
  conflicts: DashboardMergeConflict[],
): void {
  if (isDashboardDocumentV2(merged)) return;
  const before = conflicts.length;
  addIntegrityConflict('layout', base.layout, local.layout, remote.layout, conflicts);
  addIntegrityConflict('constraints', base.constraints, local.constraints, remote.constraints, conflicts);
  addItemIntegrityConflicts(base.items, local.items, remote.items, conflicts);
  if (conflicts.length === before) {
    throw new Error('Version 2 dashboard merge produced a non-canonical result without resolvable source differences.');
  }
}

function addItemIntegrityConflicts<TItem extends { id: string }>(
  baseItems: TItem[],
  localItems: TItem[],
  remoteItems: TItem[],
  conflicts: DashboardMergeConflict[],
): void {
  const base = new Map(baseItems.map((item) => [item.id, item]));
  const local = new Map(localItems.map((item) => [item.id, item]));
  const remote = new Map(remoteItems.map((item) => [item.id, item]));
  const ids = new Set([...base.keys(), ...local.keys(), ...remote.keys()]);
  for (const id of ids) {
    addIntegrityConflict(
      `items.${id}`,
      base.get(id),
      local.get(id),
      remote.get(id),
      conflicts,
    );
  }
}

function addIntegrityConflict(
  path: string,
  base: unknown,
  local: unknown,
  remote: unknown,
  conflicts: DashboardMergeConflict[],
): void {
  if (conflicts.some((conflict) => conflict.path === path)) return;
  if (equal(local, remote)) return;
  conflicts.push({
    path,
    base: structuredClone(base),
    local: structuredClone(local),
    remote: structuredClone(remote),
  });
}

function mergeItems<TItem extends { id: string }>(
  baseItems: TItem[],
  localItems: TItem[],
  remoteItems: TItem[],
  conflicts: DashboardMergeConflict[],
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
  return merged;
}

/**
 * Layer order is persisted in items[]. Add/remove operations must not be
 * misclassified as a reorder, while genuinely incompatible concurrent reorders
 * must become an explicit conflict instead of being silently sorted by geometry.
 */
function mergeItemOrder(
  baseIds: string[],
  localIds: string[],
  remoteIds: string[],
  mergedIds: Set<string>,
  conflicts: DashboardMergeConflict[],
): string[] {
  const baseSet = new Set(baseIds);
  const localSet = new Set(localIds);
  const remoteSet = new Set(remoteIds);

  const localBaseOrder = localIds.filter((id) => baseSet.has(id));
  const remoteBaseOrder = remoteIds.filter((id) => baseSet.has(id));
  const expectedLocalBaseOrder = baseIds.filter((id) => localSet.has(id));
  const expectedRemoteBaseOrder = baseIds.filter((id) => remoteSet.has(id));
  const localReordered = !equal(localBaseOrder, expectedLocalBaseOrder);
  const remoteReordered = !equal(remoteBaseOrder, expectedRemoteBaseOrder);

  let primary: string[];
  let secondarySequences: string[][];

  if (localReordered && remoteReordered) {
    const common = new Set(baseIds.filter((id) => localSet.has(id) && remoteSet.has(id)));
    const localCommon = localIds.filter((id) => common.has(id));
    const remoteCommon = remoteIds.filter((id) => common.has(id));
    if (!equal(localCommon, remoteCommon)) {
      conflicts.push({
        path: 'itemOrder',
        base: structuredClone(baseIds),
        local: structuredClone(localIds),
        remote: structuredClone(remoteIds),
      });
    }
    primary = localIds;
    secondarySequences = [remoteIds];
  } else if (localReordered) {
    primary = localIds;
    secondarySequences = [remoteIds];
  } else if (remoteReordered) {
    primary = remoteIds;
    secondarySequences = [localIds];
  } else {
    primary = baseIds;
    secondarySequences = [localIds, remoteIds];
  }

  const order = uniqueAllowed(primary, mergedIds);
  for (const sequence of secondarySequences) mergeMissingOrderIds(order, sequence, mergedIds);
  for (const id of mergedIds) if (!order.includes(id)) order.push(id);
  return order;
}

function uniqueAllowed(ids: string[], allowed: Set<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function mergeMissingOrderIds(order: string[], sequence: string[], allowed: Set<string>): void {
  for (let index = 0; index < sequence.length; index += 1) {
    const id = sequence[index];
    if (!allowed.has(id) || order.includes(id)) continue;

    let previous: string | undefined;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const candidate = sequence[cursor];
      if (allowed.has(candidate) && order.includes(candidate)) {
        previous = candidate;
        break;
      }
    }

    let next: string | undefined;
    for (let cursor = index + 1; cursor < sequence.length; cursor += 1) {
      const candidate = sequence[cursor];
      if (allowed.has(candidate) && order.includes(candidate)) {
        next = candidate;
        break;
      }
    }

    if (previous) {
      order.splice(order.indexOf(previous) + 1, 0, id);
    } else if (next) {
      order.splice(order.indexOf(next), 0, id);
    } else {
      order.push(id);
    }
  }
}

function orderItems<TItem extends { id: string }>(items: TItem[], order: string[]): TItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = order.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const included = new Set(ordered.map((item) => item.id));
  for (const item of items) if (!included.has(item.id)) ordered.push(item);
  return ordered;
}

function mergeValue<T>(path: string, base: T, local: T, remote: T, conflicts: DashboardMergeConflict[]): T {
  if (equal(local, remote)) return structuredClone(local);
  if (equal(local, base)) return structuredClone(remote);
  if (equal(remote, base)) return structuredClone(local);
  conflicts.push({ path, base: structuredClone(base), local: structuredClone(local), remote: structuredClone(remote) });
  return structuredClone(local);
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

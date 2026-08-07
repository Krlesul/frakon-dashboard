import type { DashboardConflictSession } from './dashboard-conflict-coordinator';
import {
  resolveDashboardConflicts,
  type DashboardConflictSelections,
} from './dashboard-selective-conflict-resolution';
import type { FrakonGridItem } from './layout-model';

export interface DashboardConflictPreviewCard {
  id: string;
  local?: FrakonGridItem;
  remote?: FrakonGridItem;
  resolved?: FrakonGridItem;
  selected?: 'local' | 'remote';
  conflicted: boolean;
}

export interface DashboardConflictPreview {
  cards: DashboardConflictPreviewCard[];
  unresolved: number;
  resolvedDocumentAvailable: boolean;
}

export function createDashboardConflictPreview(
  session: DashboardConflictSession,
  selections: DashboardConflictSelections = {},
): DashboardConflictPreview {
  const localById = new Map(session.comparison.local.document.items.map((item) => [item.id, item]));
  const remoteById = new Map(session.comparison.remote.document.items.map((item) => [item.id, item]));
  const mergedById = new Map(session.merge.document.items.map((item) => [item.id, item]));
  const conflictPaths = new Set(session.merge.conflicts.map((conflict) => conflict.path));
  const itemIds = new Set<string>();

  for (const path of conflictPaths) {
    const match = /^items\.(.+)$/.exec(path);
    if (match?.[1]) itemIds.add(match[1]);
  }

  const selective = resolveDashboardConflicts(session.merge, selections);
  const resolvedDocumentAvailable = selective.complete;

  const cards = [...itemIds].sort().map((id) => {
    const path = `items.${id}`;
    const selected = selections[path];
    const resolved = selected === 'local'
      ? localById.get(id)
      : selected === 'remote'
        ? remoteById.get(id)
        : mergedById.get(id);

    return {
      id,
      local: cloneItem(localById.get(id)),
      remote: cloneItem(remoteById.get(id)),
      resolved: cloneItem(resolved),
      selected,
      conflicted: conflictPaths.has(path),
    } satisfies DashboardConflictPreviewCard;
  });

  return {
    cards,
    unresolved: selective.unresolved.length,
    resolvedDocumentAvailable,
  };
}

function cloneItem(item: FrakonGridItem | undefined): FrakonGridItem | undefined {
  return item ? structuredClone(item) : undefined;
}

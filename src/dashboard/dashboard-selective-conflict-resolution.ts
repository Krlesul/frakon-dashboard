import type { DashboardMergeConflict, DashboardMergeResult } from './dashboard-conflict-resolver';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

export type DashboardConflictSide = 'local' | 'remote';
export type DashboardConflictSelections = Record<string, DashboardConflictSide>;

export interface DashboardSelectiveResolution {
  document: FrakonDashboardDocument;
  unresolved: DashboardMergeConflict[];
  complete: boolean;
}

/** Resolves individual three-way merge conflicts without silently choosing a side. */
export function resolveDashboardConflicts(
  merge: DashboardMergeResult,
  selections: DashboardConflictSelections,
): DashboardSelectiveResolution {
  const document = structuredClone(merge.document);
  const unresolved: DashboardMergeConflict[] = [];

  for (const conflict of merge.conflicts) {
    const side = selections[conflict.path];
    if (!side) {
      unresolved.push(structuredClone(conflict));
      continue;
    }
    applyConflictValue(document, conflict.path, structuredClone(conflict[side]));
  }

  return { document, unresolved, complete: unresolved.length === 0 };
}

function applyConflictValue(document: FrakonDashboardDocument, path: string, value: unknown): void {
  if (path.startsWith('items.')) {
    const id = path.slice('items.'.length);
    const index = document.items.findIndex((item) => item.id === id);
    if (value === undefined) {
      if (index >= 0) document.items.splice(index, 1);
      return;
    }
    const item = value as FrakonGridItem;
    if (index >= 0) document.items[index] = item;
    else document.items.push(item);
    document.items.sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
    return;
  }

  switch (path) {
    case 'title': document.title = value as FrakonDashboardDocument['title']; break;
    case 'breakpoint': document.breakpoint = value as FrakonDashboardDocument['breakpoint']; break;
    case 'columns': document.columns = value as number; break;
    case 'rowHeight': document.rowHeight = value as number; break;
    case 'gap': document.gap = value as number; break;
    case 'surface': document.surface = value as FrakonDashboardDocument['surface']; break;
    case 'cardSurface': document.cardSurface = value as FrakonDashboardDocument['cardSurface']; break;
    case 'constraints': document.constraints = value as FrakonDashboardDocument['constraints']; break;
    default: throw new Error(`Unsupported dashboard conflict path: ${path}`);
  }
}

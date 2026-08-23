import type { DashboardMergeConflict, DashboardMergeResult } from './dashboard-conflict-resolver';
import type { DashboardConflictSelections } from './dashboard-selective-conflict-resolution';
import { isDashboardDocumentV2, type FrakonCanvasItem, type FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardV2SelectiveResolution {
  document: FrakonDashboardDocumentV2;
  unresolved: DashboardMergeConflict[];
  complete: boolean;
}

export function resolveDashboardV2Conflicts(
  merge: DashboardMergeResult<FrakonDashboardDocumentV2>,
  selections: DashboardConflictSelections,
): DashboardV2SelectiveResolution {
  const document = structuredClone(merge.document);
  const unresolved: DashboardMergeConflict[] = [];

  for (const conflict of merge.conflicts) {
    const side = selections[conflict.path];
    if (!side) {
      unresolved.push(structuredClone(conflict));
      continue;
    }
    applyV2ConflictValue(document, conflict.path, structuredClone(conflict[side]));
  }

  const complete = unresolved.length === 0;
  if (complete && !isDashboardDocumentV2(document)) {
    throw new Error('Completed dashboard conflict selections produce a non-canonical version 2 document.');
  }
  return { document, unresolved, complete };
}

function reorderItems(document: FrakonDashboardDocumentV2, order: string[]): void {
  const rank = new Map(order.map((id, index) => [id, index]));
  document.items = [...document.items].sort((left, right) => {
    const leftRank = rank.get(left.id);
    const rightRank = rank.get(right.id);
    if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
    if (leftRank !== undefined) return -1;
    if (rightRank !== undefined) return 1;
    return 0;
  });
}

function applyV2ConflictValue(
  document: FrakonDashboardDocumentV2,
  path: string,
  value: unknown,
): void {
  if (path.startsWith('items.')) {
    const id = path.slice('items.'.length);
    const index = document.items.findIndex((item) => item.id === id);
    if (value === undefined) {
      if (index >= 0) document.items.splice(index, 1);
      return;
    }
    const item = value as FrakonCanvasItem;
    if (index >= 0) document.items[index] = item;
    else document.items.push(item);
    return;
  }

  switch (path) {
    case 'title': document.title = value as FrakonDashboardDocumentV2['title']; break;
    case 'breakpoint': document.breakpoint = value as FrakonDashboardDocumentV2['breakpoint']; break;
    case 'layout': document.layout = value as FrakonDashboardDocumentV2['layout']; break;
    case 'surface': document.surface = value as FrakonDashboardDocumentV2['surface']; break;
    case 'cardSurface': document.cardSurface = value as FrakonDashboardDocumentV2['cardSurface']; break;
    case 'constraints': document.constraints = value as FrakonDashboardDocumentV2['constraints']; break;
    case 'itemOrder': reorderItems(document, value as string[]); break;
    default: throw new Error(`Unsupported version 2 dashboard conflict path: ${path}`);
  }
}

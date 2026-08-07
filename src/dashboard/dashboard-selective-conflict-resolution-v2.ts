import type { DashboardMergeConflict, DashboardMergeResult } from './dashboard-conflict-resolver';
import type { DashboardConflictSelections } from './dashboard-selective-conflict-resolution';
import type { FrakonCanvasItem, FrakonDashboardDocumentV2 } from './layout-model-v2';

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

  return { document, unresolved, complete: unresolved.length === 0 };
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
    document.items.sort((left, right) => (
      left.frame.y - right.frame.y
      || left.frame.x - right.frame.x
      || left.id.localeCompare(right.id)
    ));
    return;
  }

  switch (path) {
    case 'title': document.title = value as FrakonDashboardDocumentV2['title']; break;
    case 'breakpoint': document.breakpoint = value as FrakonDashboardDocumentV2['breakpoint']; break;
    case 'layout': document.layout = value as FrakonDashboardDocumentV2['layout']; break;
    case 'surface': document.surface = value as FrakonDashboardDocumentV2['surface']; break;
    case 'cardSurface': document.cardSurface = value as FrakonDashboardDocumentV2['cardSurface']; break;
    case 'constraints': document.constraints = value as FrakonDashboardDocumentV2['constraints']; break;
    default: throw new Error(`Unsupported version 2 dashboard conflict path: ${path}`);
  }
}

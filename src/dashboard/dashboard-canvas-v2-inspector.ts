import type { FrakonCanvasItem, FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2InspectorSelection {
  ids: string[];
  count: number;
  single?: FrakonCanvasItem;
  lockedCount: number;
  constraintCount: number;
  snapEnabled: boolean;
  snapSize: number;
}

export function dashboardCanvasV2InspectorSelection(
  document: FrakonDashboardDocumentV2,
  selectedIds: Iterable<string>,
): DashboardCanvasV2InspectorSelection {
  const selected = new Set(selectedIds);
  const items = document.items.filter((item) => selected.has(item.id));
  const itemIds = new Set(items.map((item) => item.id));
  const constraintCount = (document.constraints ?? []).filter(
    (constraint) => itemIds.has(constraint.sourceId) || itemIds.has(constraint.targetId),
  ).length;

  return {
    ids: items.map((item) => item.id),
    count: items.length,
    single: items.length === 1 ? structuredClone(items[0]) : undefined,
    lockedCount: items.filter((item) => item.locked).length,
    constraintCount,
    snapEnabled: document.layout.snap.enabled,
    snapSize: document.layout.snap.size,
  };
}

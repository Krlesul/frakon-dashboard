import {
  clampGridItem,
  findCollisions,
  type FrakonDashboardDocument,
  type FrakonGridItem,
} from './layout-model';

export type DashboardItemGeometryPatch = Partial<Pick<FrakonGridItem, 'x' | 'y' | 'w' | 'h'>>;

export interface DashboardItemGeometryResult {
  status: 'committed' | 'collision' | 'unchanged';
  document: FrakonDashboardDocument;
  collisionIds: string[];
}

export function updateDashboardItemGeometryExact(
  document: FrakonDashboardDocument,
  itemId: string,
  patch: DashboardItemGeometryPatch,
): DashboardItemGeometryResult {
  const target = document.items.find((item) => item.id === itemId);
  if (!target || target.locked || target.hidden) {
    return { status: 'unchanged', document: structuredClone(document), collisionIds: [] };
  }

  const nextTarget = clampGridItem({ ...target, ...patch }, document.columns);
  const changed = nextTarget.x !== target.x
    || nextTarget.y !== target.y
    || nextTarget.w !== target.w
    || nextTarget.h !== target.h;
  if (!changed) {
    return { status: 'unchanged', document: structuredClone(document), collisionIds: [] };
  }

  const items = document.items.map((item) => item.id === itemId ? nextTarget : structuredClone(item));
  const collisionIds = new Set<string>();
  for (const [first, second] of findCollisions(items)) {
    if (first === itemId || second === itemId) {
      collisionIds.add(first);
      collisionIds.add(second);
    }
  }
  if (collisionIds.size > 0) {
    return { status: 'collision', document: structuredClone(document), collisionIds: [...collisionIds] };
  }

  return {
    status: 'committed',
    document: { ...document, items },
    collisionIds: [],
  };
}

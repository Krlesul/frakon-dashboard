import { collisionIds } from '../../packages/studio-engine/src/move';
import type { DashboardPointerPreview } from './dashboard-pointer-grid';
import { solveDashboardConstraints } from './constraint-solver';
import type { FrakonDashboardDocument } from './layout-model';

export interface DashboardPointerConstraintPreview extends DashboardPointerPreview {
  appliedConstraintIds: string[];
}

export function applyDashboardConstraintsToPointerPreview(
  source: FrakonDashboardDocument,
  preview: DashboardPointerPreview,
): DashboardPointerConstraintPreview {
  if (!source.constraints?.length) {
    return {
      ...preview,
      items: preview.items.map((item) => ({ ...item })),
      collisionIds: [...preview.collisionIds],
      appliedConstraintIds: [],
    };
  }

  const solved = solveDashboardConstraints({ ...source, items: preview.items.map((item) => ({ ...item })) });
  const collisions = collisionIds(solved.document.items.map((item) => ({
    id: item.id,
    x: item.x,
    y: item.y,
    width: item.w,
    height: item.h,
    locked: item.locked,
  })));

  return {
    items: solved.document.items.map((item) => ({ ...item })),
    collisionIds: collisions,
    hasCollisions: collisions.length > 0,
    appliedConstraintIds: solved.diagnostics
      .filter((diagnostic) => diagnostic.status === 'applied')
      .map((diagnostic) => diagnostic.constraintId),
  };
}

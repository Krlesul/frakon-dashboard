import { migrateDashboardV1ToV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';
import type { FrakonDashboardDocument } from './layout-model';

export type DashboardV2MigrationWarning =
  | 'locked-items-preserved'
  | 'constraints-preserved'
  | 'responsive-layout-needs-review';

export interface DashboardV2MigrationPreview {
  sourceVersion: 1;
  targetVersion: 2;
  safeToPersist: false;
  itemCount: number;
  lockedItemCount: number;
  constraintCount: number;
  canvasWidth: number;
  estimatedCanvasHeight: number;
  warnings: DashboardV2MigrationWarning[];
  candidate: FrakonDashboardDocumentV2;
}

export function createDashboardV2MigrationPreview(
  document: FrakonDashboardDocument,
  canvasWidth: number,
): DashboardV2MigrationPreview {
  const candidate = migrateDashboardV1ToV2(document, canvasWidth);
  const lockedItemCount = document.items.filter((item) => item.locked).length;
  const constraintCount = document.constraints?.length ?? 0;
  const warnings: DashboardV2MigrationWarning[] = ['responsive-layout-needs-review'];
  if (lockedItemCount > 0) warnings.unshift('locked-items-preserved');
  if (constraintCount > 0) warnings.unshift('constraints-preserved');

  return {
    sourceVersion: 1,
    targetVersion: 2,
    safeToPersist: false,
    itemCount: document.items.length,
    lockedItemCount,
    constraintCount,
    canvasWidth: candidate.layout.width,
    estimatedCanvasHeight: candidate.layout.minHeight,
    warnings,
    candidate,
  };
}

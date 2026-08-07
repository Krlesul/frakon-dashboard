import { computeSmartGuidelines, type Guideline } from '../../packages/studio-engine/src/guidelines';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export function dashboardCanvasV2Guidelines(
  document: FrakonDashboardDocumentV2,
  movingIds: Iterable<string>,
  threshold = 8,
): Guideline[] {
  return computeSmartGuidelines(
    document.items.map((item) => ({ id: item.id, ...item.frame })),
    movingIds,
    threshold,
  ).guidelines;
}

import { mergeSurfaceStyles, type SurfaceStyle } from '../../packages/design-system/src/surface-style';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';
import type { FrakonCanvasItem, FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface ResolvedDashboardSurfaces {
  dashboard: SurfaceStyle;
  card: SurfaceStyle;
}

export function resolveDashboardSurfaces(document: FrakonDashboardDocument | FrakonDashboardDocumentV2): ResolvedDashboardSurfaces {
  return {
    dashboard: mergeSurfaceStyles(undefined, document.surface),
    card: mergeSurfaceStyles(undefined, document.cardSurface),
  };
}

export function resolveGridItemSurface(
  document: FrakonDashboardDocument,
  item: FrakonGridItem,
): SurfaceStyle {
  return mergeSurfaceStyles(document.cardSurface, item.surface);
}

export function resolveCanvasItemSurface(
  document: FrakonDashboardDocumentV2,
  item: FrakonCanvasItem,
): SurfaceStyle {
  return mergeSurfaceStyles(document.cardSurface, item.surface);
}

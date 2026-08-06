import { mergeSurfaceStyles, type SurfaceStyle } from '../../packages/design-system/src/surface-style';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

export interface ResolvedDashboardSurfaces {
  dashboard: SurfaceStyle;
  card: SurfaceStyle;
}

export function resolveDashboardSurfaces(document: FrakonDashboardDocument): ResolvedDashboardSurfaces {
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

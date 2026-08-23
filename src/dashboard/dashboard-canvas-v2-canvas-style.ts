import { cssRecordToString, surfaceStyleToCss } from '../../packages/design-system/src/surface-style';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { resolveDashboardSurfaces } from './surface-style-resolver';

export function dashboardCanvasV2CanvasStyle(document: FrakonDashboardDocumentV2, height: number): string {
  const geometry = { height: `${Math.max(120, height)}px` };
  const surface = surfaceStyleToCss(resolveDashboardSurfaces(document).dashboard);
  return `${cssRecordToString(geometry)};${cssRecordToString(surface)}`;
}

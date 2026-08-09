import { cssRecordToString } from '../../packages/design-system/src/surface-style';
import type { FrakonCanvasItem, FrakonDashboardDocumentV2 } from './layout-model-v2';
import { resolveCanvasItemSurface } from './surface-style-resolver';

export function dashboardCanvasV2ItemStyle(
  document: FrakonDashboardDocumentV2,
  item: FrakonCanvasItem,
): string {
  const geometry = {
    left: `${item.frame.x}px`,
    top: `${item.frame.y}px`,
    width: `${item.frame.width}px`,
    height: `${item.frame.height}px`,
  };
  const surface = cssRecordToString(resolveCanvasItemSurface(document, item));
  return `${cssRecordToString(geometry)};${surface}`;
}

import type { Size, ViewportTransform } from '../../packages/studio-engine/src/viewport';
import type { FrakonCanvasItem, FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2VisibleItemsOptions {
  overscanPx?: number;
  retainIds?: Iterable<string>;
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function intersects(
  item: FrakonCanvasItem,
  left: number,
  top: number,
  right: number,
  bottom: number,
): boolean {
  const itemRight = item.frame.x + item.frame.width;
  const itemBottom = item.frame.y + item.frame.height;
  return itemRight >= left && item.frame.x <= right && itemBottom >= top && item.frame.y <= bottom;
}

export function dashboardCanvasV2VisibleItems(
  document: FrakonDashboardDocumentV2,
  viewport: ViewportTransform,
  viewportSize: Size,
  options: DashboardCanvasV2VisibleItemsOptions = {},
): FrakonCanvasItem[] {
  const zoom = viewport.zoom;
  if (!finitePositive(zoom) || !finitePositive(viewportSize.width) || !finitePositive(viewportSize.height)) {
    return document.items;
  }

  const overscanPx = Math.max(0, Number.isFinite(options.overscanPx ?? 200) ? options.overscanPx ?? 200 : 200);
  const retainIds = new Set(options.retainIds ?? []);
  const left = (-viewport.x - overscanPx) / zoom;
  const top = (-viewport.y - overscanPx) / zoom;
  const right = (viewportSize.width - viewport.x + overscanPx) / zoom;
  const bottom = (viewportSize.height - viewport.y + overscanPx) / zoom;

  return document.items.filter((item) => retainIds.has(item.id) || intersects(item, left, top, right, bottom));
}

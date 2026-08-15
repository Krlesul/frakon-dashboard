import { dashboardGridMetrics } from './dashboard-pointer-grid';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

export interface DashboardCanvasRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked?: boolean;
}

export interface DashboardCanvasProjection {
  width: number;
  columnWidth: number;
  columnStep: number;
  rowStep: number;
  items: DashboardCanvasRect[];
}

export interface DashboardCanvasPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Project only runtime-visible v1 items. Hidden layers keep their canonical grid
 * geometry in the source document, but the experimental canvas receives no
 * placement for them and therefore cannot render or interact with them.
 */
export function projectDashboardGridToCanvas(
  document: FrakonDashboardDocument,
  containerWidth: number,
): DashboardCanvasProjection {
  const metrics = dashboardGridMetrics(containerWidth, document.columns, document.rowHeight, document.gap);
  const columnWidth = Math.max(1, metrics.columnStep - document.gap);
  return {
    width: Math.max(1, containerWidth),
    columnWidth,
    columnStep: metrics.columnStep,
    rowStep: metrics.rowStep,
    items: document.items
      .filter((item) => item.hidden !== true)
      .map((item) => ({
        id: item.id,
        x: item.x * metrics.columnStep,
        y: item.y * metrics.rowStep,
        width: item.w * columnWidth + Math.max(0, item.w - 1) * document.gap,
        height: item.h * document.rowHeight + Math.max(0, item.h - 1) * document.gap,
        locked: item.locked,
      })),
  };
}

export function canvasPlacementToGridItem(
  item: FrakonGridItem,
  placement: DashboardCanvasPlacement,
  document: FrakonDashboardDocument,
  containerWidth: number,
): FrakonGridItem {
  const metrics = dashboardGridMetrics(containerWidth, document.columns, document.rowHeight, document.gap);
  const columnWidth = Math.max(1, metrics.columnStep - document.gap);
  const x = Math.max(0, Math.min(document.columns - 1, Math.round(placement.x / metrics.columnStep)));
  const y = Math.max(0, Math.round(placement.y / metrics.rowStep));
  const w = Math.max(1, Math.min(document.columns - x, Math.round((placement.width + document.gap) / (columnWidth + document.gap))));
  const h = Math.max(1, Math.round((placement.height + document.gap) / (document.rowHeight + document.gap)));
  return { ...item, x, y, w, h };
}

export function canvasPlacementWithinBounds(
  placement: DashboardCanvasPlacement,
  canvasWidth: number,
): DashboardCanvasPlacement {
  const width = Math.max(1, Math.min(Math.max(1, canvasWidth), placement.width));
  const x = Math.max(0, Math.min(Math.max(0, canvasWidth - width), placement.x));
  return {
    x,
    y: Math.max(0, placement.y),
    width,
    height: Math.max(1, placement.height),
  };
}

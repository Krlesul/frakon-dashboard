import { projectDashboardGridToCanvas } from './dashboard-canvas-placement';
import type { FrakonDashboardDocument } from './layout-model';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasRenderItem {
  id: string;
  card: Record<string, unknown>;
  x: number;
  y: number;
  width: number;
  height: number;
  locked?: boolean;
}

export interface DashboardCanvasRenderModel {
  sourceVersion: 1 | 2;
  title: string;
  minHeight: number;
  items: DashboardCanvasRenderItem[];
  editable: boolean;
}

export function dashboardCanvasRenderModel(
  document: FrakonDashboardDocument | FrakonDashboardDocumentV2,
  containerWidth: number,
): DashboardCanvasRenderModel {
  if (document.version === 2) {
    const scale = document.layout.width > 0 ? Math.max(1, containerWidth) / document.layout.width : 1;
    const items = document.items.map((item) => ({
      id: item.id,
      card: item.card,
      x: item.frame.x * scale,
      y: item.frame.y * scale,
      width: item.frame.width * scale,
      height: item.frame.height * scale,
      locked: item.locked,
    }));
    return {
      sourceVersion: 2,
      title: document.title,
      minHeight: Math.max(
        document.layout.minHeight * scale,
        ...items.map((item) => item.y + item.height + 12),
      ),
      items,
      editable: false,
    };
  }

  const projection = projectDashboardGridToCanvas(document, containerWidth);
  const byId = new Map(document.items.map((item) => [item.id, item]));
  const items = projection.items.map((placement) => ({
    id: placement.id,
    card: byId.get(placement.id)?.card ?? {},
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
    locked: placement.locked,
  }));
  return {
    sourceVersion: 1,
    title: document.title,
    minHeight: Math.max(
      document.rowHeight * 2,
      ...items.map((item) => item.y + item.height + 12),
    ),
    items,
    editable: true,
  };
}

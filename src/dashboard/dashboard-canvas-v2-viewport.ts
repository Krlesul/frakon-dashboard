import {
  fitRectToViewport,
  normalizeViewport,
  screenToCanvas,
  zoomViewportAt,
  type Point,
  type Size,
  type ViewportTransform,
} from '../../packages/studio-engine/src/viewport';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2ContentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function dashboardCanvasV2ContentRect(document: FrakonDashboardDocumentV2): DashboardCanvasV2ContentRect {
  if (!document.items.length) {
    return { x: 0, y: 0, width: document.layout.width, height: document.layout.minHeight };
  }
  const left = Math.min(0, ...document.items.map((item) => item.frame.x));
  const top = Math.min(0, ...document.items.map((item) => item.frame.y));
  const right = Math.max(document.layout.width, ...document.items.map((item) => item.frame.x + item.frame.width));
  const bottom = Math.max(document.layout.minHeight, ...document.items.map((item) => item.frame.y + item.frame.height));
  return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

export function fitDashboardCanvasV2Viewport(
  document: FrakonDashboardDocumentV2,
  viewportSize: Size,
  padding = 40,
): ViewportTransform {
  return fitRectToViewport(dashboardCanvasV2ContentRect(document), viewportSize, padding);
}

export function dashboardCanvasV2ScreenToDocument(point: Point, viewport: ViewportTransform): Point {
  return screenToCanvas(point, normalizeViewport(viewport));
}

export function zoomDashboardCanvasV2Viewport(
  viewport: ViewportTransform,
  anchor: Point,
  nextZoom: number,
): ViewportTransform {
  return zoomViewportAt(viewport, anchor, nextZoom);
}

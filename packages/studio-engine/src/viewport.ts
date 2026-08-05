export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

export interface ViewportTransform {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_VIEWPORT_ZOOM = 0.25;
export const MAX_VIEWPORT_ZOOM = 8;
export const DEFAULT_VIEWPORT: ViewportTransform = { x: 0, y: 0, zoom: 1 };

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(MAX_VIEWPORT_ZOOM, Math.max(MIN_VIEWPORT_ZOOM, zoom));
}

export function normalizeViewport(viewport: ViewportTransform): ViewportTransform {
  return {
    x: Number.isFinite(viewport.x) ? viewport.x : 0,
    y: Number.isFinite(viewport.y) ? viewport.y : 0,
    zoom: clampZoom(viewport.zoom),
  };
}

export function canvasToScreen(point: Point, viewport: ViewportTransform): Point {
  const normalized = normalizeViewport(viewport);
  return {
    x: point.x * normalized.zoom + normalized.x,
    y: point.y * normalized.zoom + normalized.y,
  };
}

export function screenToCanvas(point: Point, viewport: ViewportTransform): Point {
  const normalized = normalizeViewport(viewport);
  return {
    x: (point.x - normalized.x) / normalized.zoom,
    y: (point.y - normalized.y) / normalized.zoom,
  };
}

export function panViewport(viewport: ViewportTransform, delta: Point): ViewportTransform {
  const normalized = normalizeViewport(viewport);
  return {
    ...normalized,
    x: normalized.x + delta.x,
    y: normalized.y + delta.y,
  };
}

export function zoomViewportAt(
  viewport: ViewportTransform,
  screenAnchor: Point,
  nextZoom: number,
): ViewportTransform {
  const normalized = normalizeViewport(viewport);
  const canvasAnchor = screenToCanvas(screenAnchor, normalized);
  const zoom = clampZoom(nextZoom);
  return {
    zoom,
    x: screenAnchor.x - canvasAnchor.x * zoom,
    y: screenAnchor.y - canvasAnchor.y * zoom,
  };
}

export function fitRectToViewport(
  rect: Rect,
  viewportSize: Size,
  padding = 48,
): ViewportTransform {
  const safeWidth = Math.max(1, rect.width);
  const safeHeight = Math.max(1, rect.height);
  const availableWidth = Math.max(1, viewportSize.width - padding * 2);
  const availableHeight = Math.max(1, viewportSize.height - padding * 2);
  const zoom = clampZoom(Math.min(availableWidth / safeWidth, availableHeight / safeHeight));
  return {
    zoom,
    x: (viewportSize.width - safeWidth * zoom) / 2 - rect.x * zoom,
    y: (viewportSize.height - safeHeight * zoom) / 2 - rect.y * zoom,
  };
}

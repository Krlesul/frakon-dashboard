import {
  DEFAULT_VIEWPORT,
  normalizeViewport,
  panViewport,
  type Point,
  type Size,
  type ViewportTransform,
} from '../../packages/studio-engine/src/viewport';
import {
  dashboardCanvasV2ScreenToDocument,
  fitDashboardCanvasV2Viewport,
  zoomDashboardCanvasV2Viewport,
} from './dashboard-canvas-v2-viewport';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export class DashboardCanvasV2ViewportController {
  private transform: ViewportTransform;

  constructor(initial: ViewportTransform = DEFAULT_VIEWPORT) {
    this.transform = normalizeViewport(initial);
  }

  snapshot(): ViewportTransform {
    return { ...this.transform };
  }

  reset(): ViewportTransform {
    this.transform = { ...DEFAULT_VIEWPORT };
    return this.snapshot();
  }

  fit(document: FrakonDashboardDocumentV2, viewportSize: Size, padding = 40): ViewportTransform {
    this.transform = fitDashboardCanvasV2Viewport(document, viewportSize, padding);
    return this.snapshot();
  }

  zoomAt(screenAnchor: Point, nextZoom: number): ViewportTransform {
    this.transform = zoomDashboardCanvasV2Viewport(this.transform, screenAnchor, nextZoom);
    return this.snapshot();
  }

  panBy(delta: Point): ViewportTransform {
    this.transform = panViewport(this.transform, delta);
    return this.snapshot();
  }

  screenToDocument(point: Point): Point {
    return dashboardCanvasV2ScreenToDocument(point, this.transform);
  }
}

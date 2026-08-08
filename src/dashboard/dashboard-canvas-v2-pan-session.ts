import type { Point, ViewportTransform } from '../../packages/studio-engine/src/viewport';

export interface DashboardCanvasV2PanStart {
  point: Point;
  viewport: ViewportTransform;
}

export class DashboardCanvasV2PanSession {
  private readonly startPoint: Point;
  private readonly startViewport: ViewportTransform;

  constructor(start: DashboardCanvasV2PanStart) {
    this.startPoint = { ...start.point };
    this.startViewport = { ...start.viewport };
  }

  preview(point: Point): ViewportTransform {
    return {
      x: this.startViewport.x + point.x - this.startPoint.x,
      y: this.startViewport.y + point.y - this.startPoint.y,
      zoom: this.startViewport.zoom,
    };
  }
}

import type { Point, ViewportTransform } from '../../packages/studio-engine/src/viewport';
import { DashboardCanvasV2ViewportController } from './dashboard-canvas-v2-viewport-controller';

export interface DashboardCanvasV2PanStart {
  point: Point;
  viewport: ViewportTransform;
}

export class DashboardCanvasV2PanSession {
  private readonly controller: DashboardCanvasV2ViewportController;
  private readonly startPoint: Point;

  constructor(start: DashboardCanvasV2PanStart) {
    this.controller = new DashboardCanvasV2ViewportController(start.viewport);
    this.startPoint = { ...start.point };
  }

  preview(point: Point): ViewportTransform {
    return this.controller.snapshot().x === 0 && this.controller.snapshot().y === 0
      ? this.controller.panBy({ x: point.x - this.startPoint.x, y: point.y - this.startPoint.y })
      : this.fromInitial(point);
  }

  private fromInitial(point: Point): ViewportTransform {
    const current = this.controller.snapshot();
    const dx = point.x - this.startPoint.x;
    const dy = point.y - this.startPoint.y;
    return {
      x: current.x + dx,
      y: current.y + dy,
      zoom: current.zoom,
    };
  }
}

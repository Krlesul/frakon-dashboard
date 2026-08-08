import type { Point, ViewportTransform } from '../../packages/studio-engine/src/viewport';
import { DashboardCanvasV2ViewportController } from './dashboard-canvas-v2-viewport-controller';

export interface DashboardCanvasV2PinchStart {
  first: Point;
  second: Point;
  viewport: ViewportTransform;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export class DashboardCanvasV2PinchSession {
  private readonly startDistance: number;
  private readonly startViewport: ViewportTransform;
  private readonly startAnchorDocument: Point;

  constructor(start: DashboardCanvasV2PinchStart) {
    this.startDistance = Math.max(1, distance(start.first, start.second));
    this.startViewport = { ...start.viewport };
    const controller = new DashboardCanvasV2ViewportController(start.viewport);
    this.startAnchorDocument = controller.screenToDocument(midpoint(start.first, start.second));
  }

  preview(first: Point, second: Point): ViewportTransform {
    const currentDistance = Math.max(1, distance(first, second));
    const zoom = Math.min(4, Math.max(0.25, this.startViewport.zoom * (currentDistance / this.startDistance)));
    const anchor = midpoint(first, second);
    return {
      zoom,
      x: anchor.x - this.startAnchorDocument.x * zoom,
      y: anchor.y - this.startAnchorDocument.y * zoom,
    };
  }
}

import { describe, expect, it } from 'vitest';
import { DashboardCanvasV2ViewportController } from './dashboard-canvas-v2-viewport-controller';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const document: FrakonDashboardDocumentV2 = {
  version: 2,
  id: 'canvas',
  title: 'Canvas',
  breakpoint: 'desktop',
  layout: { mode: 'canvas', width: 1000, minHeight: 600, snap: { enabled: true, size: 8 } },
  items: [
    { id: 'a', card: { type: 'custom:a' }, frame: { x: 100, y: 80, width: 200, height: 120 } },
  ],
};

describe('DashboardCanvasV2ViewportController', () => {
  it('fits document content into a viewport', () => {
    const controller = new DashboardCanvasV2ViewportController();
    const fitted = controller.fit(document, { width: 500, height: 400 }, 20);
    expect(fitted.zoom).toBeGreaterThan(0);
    expect(fitted.zoom).toBeLessThanOrEqual(1);
  });

  it('zooms around a stable screen anchor', () => {
    const controller = new DashboardCanvasV2ViewportController();
    const before = controller.screenToDocument({ x: 200, y: 150 });
    controller.zoomAt({ x: 200, y: 150 }, 2);
    const after = controller.screenToDocument({ x: 200, y: 150 });
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it('pans without changing zoom', () => {
    const controller = new DashboardCanvasV2ViewportController();
    controller.zoomAt({ x: 0, y: 0 }, 1.5);
    const next = controller.panBy({ x: 30, y: -20 });
    expect(next.zoom).toBe(1.5);
    expect(next.x).toBe(30);
    expect(next.y).toBe(-20);
  });

  it('resets back to the default viewport', () => {
    const controller = new DashboardCanvasV2ViewportController({ x: 12, y: 20, zoom: 2 });
    expect(controller.reset()).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

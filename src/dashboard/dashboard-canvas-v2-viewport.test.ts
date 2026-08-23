import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2ContentRect, dashboardCanvasV2ScreenToDocument, fitDashboardCanvasV2Viewport, zoomDashboardCanvasV2Viewport } from './dashboard-canvas-v2-viewport';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'viewport',
    title: 'Viewport',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1200, minHeight: 800, snap: { enabled: true, size: 8 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 100, y: 120, width: 200, height: 160 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 900, y: 650, width: 220, height: 180 } },
    ],
  };
}

describe('dashboard canvas v2 viewport', () => {
  it('uses canvas bounds and overflowing content to calculate the content rect', () => {
    const source = doc();
    source.items[1].frame.y = 900;
    expect(dashboardCanvasV2ContentRect(source)).toEqual({ x: 0, y: 0, width: 1200, height: 1080 });
  });

  it('fits the full canvas into a viewport with padding', () => {
    const viewport = fitDashboardCanvasV2Viewport(doc(), { width: 800, height: 600 }, 40);
    expect(viewport.zoom).toBeGreaterThan(0.25);
    expect(viewport.zoom).toBeLessThanOrEqual(1);
  });

  it('round-trips screen coordinates through the viewport transform', () => {
    const viewport = { x: 120, y: 80, zoom: 2 };
    expect(dashboardCanvasV2ScreenToDocument({ x: 320, y: 280 }, viewport)).toEqual({ x: 100, y: 100 });
  });

  it('keeps the document point under the cursor stable while zooming', () => {
    const current = { x: 40, y: 30, zoom: 1 };
    const anchor = { x: 240, y: 180 };
    const before = dashboardCanvasV2ScreenToDocument(anchor, current);
    const next = zoomDashboardCanvasV2Viewport(current, anchor, 2);
    const after = dashboardCanvasV2ScreenToDocument(anchor, next);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });
});

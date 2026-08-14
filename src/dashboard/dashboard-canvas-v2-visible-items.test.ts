import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { dashboardCanvasV2VisibleItems } from './dashboard-canvas-v2-visible-items';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'performance',
    title: 'Performance',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 2400, minHeight: 2400, snap: { enabled: true, size: 8 } },
    items: [
      { id: 'near', card: { type: 'custom:near' }, frame: { x: 20, y: 20, width: 200, height: 120 } },
      { id: 'edge', card: { type: 'custom:edge' }, frame: { x: 950, y: 100, width: 200, height: 120 } },
      { id: 'far', card: { type: 'custom:far' }, frame: { x: 1900, y: 1800, width: 220, height: 140 } },
    ],
  };
}

describe('dashboard canvas v2 visible items', () => {
  it('returns only viewport and overscan items', () => {
    const visible = dashboardCanvasV2VisibleItems(
      document(),
      { x: 0, y: 0, zoom: 1 },
      { width: 800, height: 500 },
      { overscanPx: 200 },
    );
    expect(visible.map((item) => item.id)).toEqual(['near', 'edge']);
  });

  it('converts a panned and zoomed screen viewport back to document coordinates', () => {
    const visible = dashboardCanvasV2VisibleItems(
      document(),
      { x: -1700, y: -1600, zoom: 1 },
      { width: 700, height: 500 },
      { overscanPx: 0 },
    );
    expect(visible.map((item) => item.id)).toEqual(['far']);
  });

  it('keeps retained interaction items even when they are outside the viewport', () => {
    const visible = dashboardCanvasV2VisibleItems(
      document(),
      { x: 0, y: 0, zoom: 1 },
      { width: 600, height: 400 },
      { overscanPx: 0, retainIds: ['far'] },
    );
    expect(visible.map((item) => item.id)).toEqual(['near', 'far']);
  });

  it('fails open to all items for an invalid transform instead of hiding content', () => {
    const visible = dashboardCanvasV2VisibleItems(
      document(),
      { x: 0, y: 0, zoom: 0 },
      { width: 800, height: 500 },
    );
    expect(visible).toHaveLength(3);
  });
});

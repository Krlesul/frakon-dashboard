import { describe, expect, it } from 'vitest';
import { DashboardCanvasV2PanSession } from './dashboard-canvas-v2-pan-session';

describe('DashboardCanvasV2PanSession', () => {
  it('computes every preview from the initial viewport without drift', () => {
    const session = new DashboardCanvasV2PanSession({
      point: { x: 100, y: 80 },
      viewport: { x: 20, y: 30, zoom: 1.5 },
    });
    expect(session.preview({ x: 130, y: 100 })).toEqual({ x: 50, y: 50, zoom: 1.5 });
    expect(session.preview({ x: 140, y: 110 })).toEqual({ x: 60, y: 60, zoom: 1.5 });
  });

  it('preserves zoom while panning in any direction', () => {
    const session = new DashboardCanvasV2PanSession({
      point: { x: 50, y: 50 },
      viewport: { x: -10, y: 15, zoom: 0.75 },
    });
    expect(session.preview({ x: 20, y: 90 })).toEqual({ x: -40, y: 55, zoom: 0.75 });
  });
});

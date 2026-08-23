import { describe, expect, it } from 'vitest';
import { DashboardCanvasV2PinchSession } from './dashboard-canvas-v2-pinch-session';

describe('dashboard canvas v2 pinch session', () => {
  it('zooms around the gesture midpoint while preserving the anchored document point', () => {
    const session = new DashboardCanvasV2PinchSession({
      first: { x: 100, y: 100 },
      second: { x: 200, y: 100 },
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    const next = session.preview({ x: 50, y: 100 }, { x: 250, y: 100 });
    expect(next.zoom).toBeCloseTo(2, 6);
    expect(next.x).toBeCloseTo(-150, 6);
    expect(next.y).toBeCloseTo(-100, 6);
  });

  it('supports simultaneous pinch pan through midpoint movement', () => {
    const session = new DashboardCanvasV2PinchSession({
      first: { x: 100, y: 100 },
      second: { x: 200, y: 100 },
      viewport: { x: 20, y: 10, zoom: 1 },
    });
    const next = session.preview({ x: 120, y: 130 }, { x: 220, y: 130 });
    expect(next.zoom).toBeCloseTo(1, 6);
    expect(next.x).toBeCloseTo(40, 6);
    expect(next.y).toBeCloseTo(40, 6);
  });

  it('clamps pinch zoom to 25-400 percent', () => {
    const session = new DashboardCanvasV2PinchSession({
      first: { x: 0, y: 0 },
      second: { x: 100, y: 0 },
      viewport: { x: 0, y: 0, zoom: 4 },
    });
    expect(session.preview({ x: 0, y: 0 }, { x: 1000, y: 0 }).zoom).toBe(4);
  });
});

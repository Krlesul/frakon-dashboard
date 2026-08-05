import { describe, expect, it } from 'vitest';
import {
  MAX_VIEWPORT_ZOOM,
  MIN_VIEWPORT_ZOOM,
  canvasToScreen,
  clampZoom,
  fitRectToViewport,
  panViewport,
  screenToCanvas,
  zoomViewportAt,
} from './viewport';

describe('Studio viewport transforms', () => {
  it('clamps zoom to the supported 25–800% range', () => {
    expect(clampZoom(0.01)).toBe(MIN_VIEWPORT_ZOOM);
    expect(clampZoom(20)).toBe(MAX_VIEWPORT_ZOOM);
    expect(clampZoom(1.5)).toBe(1.5);
  });

  it('round-trips canvas and screen coordinates', () => {
    const viewport = { x: 120, y: -45, zoom: 2.5 };
    const canvas = { x: 38, y: 91 };
    const screen = canvasToScreen(canvas, viewport);
    expect(screenToCanvas(screen, viewport)).toEqual(canvas);
  });

  it('pans without changing zoom', () => {
    expect(panViewport({ x: 10, y: 20, zoom: 2 }, { x: -4, y: 9 }))
      .toEqual({ x: 6, y: 29, zoom: 2 });
  });

  it('keeps the canvas point under the cursor fixed while zooming', () => {
    const anchor = { x: 500, y: 300 };
    const before = { x: 100, y: 50, zoom: 1 };
    const canvasAnchor = screenToCanvas(anchor, before);
    const after = zoomViewportAt(before, anchor, 2.25);
    expect(canvasToScreen(canvasAnchor, after).x).toBeCloseTo(anchor.x);
    expect(canvasToScreen(canvasAnchor, after).y).toBeCloseTo(anchor.y);
  });

  it('fits content into a viewport with padding', () => {
    const fitted = fitRectToViewport(
      { x: 100, y: 200, width: 800, height: 400 },
      { width: 1200, height: 800 },
      100,
    );
    const topLeft = canvasToScreen({ x: 100, y: 200 }, fitted);
    const bottomRight = canvasToScreen({ x: 900, y: 600 }, fitted);
    expect(topLeft.x).toBeGreaterThanOrEqual(100);
    expect(topLeft.y).toBeGreaterThanOrEqual(100);
    expect(bottomRight.x).toBeLessThanOrEqual(1100);
    expect(bottomRight.y).toBeLessThanOrEqual(700);
  });
});

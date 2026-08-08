import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2WheelZoom } from './dashboard-canvas-v2-wheel-zoom';

describe('dashboard canvas v2 wheel zoom', () => {
  it('zooms only with ctrl or cmd modifiers', () => {
    expect(dashboardCanvasV2WheelZoom({ deltaY: -10, ctrlKey: false, metaKey: false, currentZoom: 1 })).toBeUndefined();
    expect(dashboardCanvasV2WheelZoom({ deltaY: -10, ctrlKey: true, metaKey: false, currentZoom: 1 })).toBeCloseTo(1.1, 6);
  });

  it('clamps zoom to the supported 25-400 percent range', () => {
    expect(dashboardCanvasV2WheelZoom({ deltaY: -10, ctrlKey: true, metaKey: false, currentZoom: 4 })).toBe(4);
    expect(dashboardCanvasV2WheelZoom({ deltaY: 10, ctrlKey: false, metaKey: true, currentZoom: 0.25 })).toBe(0.25);
  });
});

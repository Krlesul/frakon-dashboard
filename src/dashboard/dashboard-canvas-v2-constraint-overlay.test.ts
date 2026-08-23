import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2ConstraintOverlay } from './dashboard-canvas-v2-constraint-overlay';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'overlay',
    title: 'Overlay',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 800, minHeight: 500, snap: { enabled: true, size: 8 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 100, height: 80 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 220, y: 160, width: 140, height: 100 } },
      { id: 'c', card: { type: 'custom:c' }, frame: { x: 520, y: 40, width: 120, height: 90 } },
    ],
    constraints: [
      { id: 'b-below-a', kind: 'below', sourceId: 'b', targetId: 'a', gap: 20 },
      { id: 'c-right-b', kind: 'right-of', sourceId: 'c', targetId: 'b', gap: 12, enabled: false },
    ],
  };
}

describe('dashboard canvas v2 constraint overlay', () => {
  it('builds center-to-center overlay lines with readable gap labels', () => {
    const lines = dashboardCanvasV2ConstraintOverlay(doc());
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ constraintId: 'b-below-a', label: 'below · 20px', enabled: true });
    expect(lines[0].x1).toBe(290);
    expect(lines[0].y1).toBe(210);
    expect(lines[0].x2).toBe(70);
    expect(lines[0].y2).toBe(60);
  });

  it('marks disabled constraints without dropping them', () => {
    const lines = dashboardCanvasV2ConstraintOverlay(doc());
    expect(lines.find((line) => line.constraintId === 'c-right-b')?.enabled).toBe(false);
  });

  it('filters to constraints touching the current selection', () => {
    const lines = dashboardCanvasV2ConstraintOverlay(doc(), ['a']);
    expect(lines.map((line) => line.constraintId)).toEqual(['b-below-a']);
  });
});

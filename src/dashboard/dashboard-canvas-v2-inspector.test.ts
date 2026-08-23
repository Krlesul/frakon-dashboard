import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2InspectorSelection } from './dashboard-canvas-v2-inspector';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const document: FrakonDashboardDocumentV2 = {
  version: 2,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  layout: { mode: 'canvas', width: 600, minHeight: 300, snap: { enabled: true, size: 10 } },
  items: [
    { id: 'a', card: { type: 'custom:a' }, frame: { x: 10, y: 20, width: 100, height: 80 }, minWidth: 60 },
    { id: 'b', card: { type: 'custom:b' }, frame: { x: 160, y: 20, width: 120, height: 90 }, locked: true },
  ],
  constraints: [{ id: 'b-below-a', kind: 'below', sourceId: 'b', targetId: 'a', gap: 12 }],
};

describe('dashboardCanvasV2InspectorSelection', () => {
  it('returns full single-item geometry and canvas snap metadata', () => {
    const result = dashboardCanvasV2InspectorSelection(document, ['a']);
    expect(result.count).toBe(1);
    expect(result.single?.frame).toEqual({ x: 10, y: 20, width: 100, height: 80 });
    expect(result.single?.minWidth).toBe(60);
    expect(result.constraintCount).toBe(1);
    expect(result.snapEnabled).toBe(true);
    expect(result.snapSize).toBe(10);
  });

  it('summarizes multi-selection without pretending it is a single item', () => {
    const result = dashboardCanvasV2InspectorSelection(document, ['a', 'b', 'missing']);
    expect(result.ids).toEqual(['a', 'b']);
    expect(result.count).toBe(2);
    expect(result.single).toBeUndefined();
    expect(result.lockedCount).toBe(1);
    expect(result.constraintCount).toBe(1);
  });
});

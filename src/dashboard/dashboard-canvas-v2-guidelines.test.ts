import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2Guidelines } from './dashboard-canvas-v2-guidelines';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const document: FrakonDashboardDocumentV2 = {
  version: 2,
  id: 'canvas',
  title: 'Canvas',
  breakpoint: 'desktop',
  layout: { mode: 'canvas', width: 500, minHeight: 300, snap: { enabled: false, size: 8 } },
  items: [
    { id: 'a', card: {}, frame: { x: 0, y: 0, width: 100, height: 100 } },
    { id: 'b', card: {}, frame: { x: 104, y: 0, width: 100, height: 100 } },
    { id: 'c', card: {}, frame: { x: 260, y: 0, width: 100, height: 100 } },
  ],
};

describe('dashboardCanvasV2Guidelines', () => {
  it('returns alignment feedback near stationary canvas items', () => {
    const guidelines = dashboardCanvasV2Guidelines(document, ['a'], 8);
    expect(guidelines.some((guideline) => guideline.axis === 'x')).toBe(true);
  });

  it('does not use another moving item as a stationary alignment source', () => {
    const guidelines = dashboardCanvasV2Guidelines(document, ['a', 'b'], 8);
    expect(guidelines.some((guideline) => guideline.targetId === 'b')).toBe(false);
  });

  it('returns no guidelines when all items are moving', () => {
    expect(dashboardCanvasV2Guidelines(document, ['a', 'b', 'c'], 8)).toEqual([]);
  });
});

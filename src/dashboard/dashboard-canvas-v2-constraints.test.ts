import { describe, expect, it } from 'vitest';
import { applyDashboardCanvasV2Constraints } from './dashboard-canvas-v2-constraints';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'canvas',
    title: 'Canvas',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 500, minHeight: 300, snap: { enabled: false, size: 8 } },
    constraints: [
      { id: 'below-b', kind: 'below', sourceId: 'b', targetId: 'a', gap: 20 },
      { id: 'match-b', kind: 'match-width', sourceId: 'b', targetId: 'a' },
    ],
    items: [
      { id: 'a', card: {}, frame: { x: 20, y: 30, width: 140, height: 80 } },
      { id: 'b', card: {}, frame: { x: 220, y: 10, width: 90, height: 60 } },
    ],
  };
}

describe('applyDashboardCanvasV2Constraints', () => {
  it('applies Studio constraints directly to native canvas frames', () => {
    const result = applyDashboardCanvasV2Constraints(document());
    expect(result.document.items.find((item) => item.id === 'b')?.frame).toMatchObject({ y: 130, width: 140 });
    expect(result.diagnostics.every((entry) => entry.status === 'applied')).toBe(true);
  });

  it('respects locked source items', () => {
    const source = document();
    source.items[1].locked = true;
    const result = applyDashboardCanvasV2Constraints(source);
    expect(result.document.items.find((item) => item.id === 'b')?.frame).toMatchObject({ x: 220, y: 10, width: 90, height: 60 });
    expect(result.diagnostics.some((entry) => entry.status === 'locked')).toBe(true);
  });
});

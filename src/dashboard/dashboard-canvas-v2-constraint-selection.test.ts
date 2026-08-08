import { describe, expect, it } from 'vitest';
import { selectDashboardCanvasV2Constraint } from './dashboard-canvas-v2-constraint-selection';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'selection',
    title: 'Selection',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 600, minHeight: 300, snap: { enabled: true, size: 8 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 0, y: 0, width: 100, height: 80 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 200, y: 100, width: 100, height: 80 } },
    ],
    constraints: [{ id: 'b-below-a', kind: 'below', sourceId: 'b', targetId: 'a', gap: 20 }],
  };
}

describe('dashboard canvas v2 constraint selection', () => {
  it('selects the constraint source item and preserves the constraint id', () => {
    expect(selectDashboardCanvasV2Constraint(doc(), 'b-below-a')).toEqual({
      constraintId: 'b-below-a',
      selection: { ids: ['b'], anchorId: 'b' },
    });
  });

  it('returns undefined for a missing constraint', () => {
    expect(selectDashboardCanvasV2Constraint(doc(), 'missing')).toBeUndefined();
  });

  it('returns undefined when the constraint source item is stale', () => {
    const source = doc();
    source.items = source.items.filter((item) => item.id !== 'b');
    expect(selectDashboardCanvasV2Constraint(source, 'b-below-a')).toBeUndefined();
  });
});

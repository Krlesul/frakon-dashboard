import { describe, expect, it } from 'vitest';
import { applyDashboardCanvasV2LayerAction } from './dashboard-canvas-v2-layer-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'layers',
    title: 'Layers',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 600, minHeight: 300, snap: { enabled: true, size: 8 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 0, y: 0, width: 100, height: 80 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 20, y: 20, width: 100, height: 80 } },
      { id: 'c', card: { type: 'custom:c' }, frame: { x: 40, y: 40, width: 100, height: 80 } },
      { id: 'd', card: { type: 'custom:d' }, frame: { x: 60, y: 60, width: 100, height: 80 }, locked: true },
    ],
  };
}

describe('dashboard canvas v2 layer actions', () => {
  it('brings the selected items to the front while preserving their internal order', () => {
    const result = applyDashboardCanvasV2LayerAction(doc(), ['a', 'b'], 'bring-front');
    expect(result.status).toBe('committed');
    expect(result.document.items.map((item) => item.id)).toEqual(['c', 'd', 'a', 'b']);
  });

  it('sends selected items to the back', () => {
    const result = applyDashboardCanvasV2LayerAction(doc(), ['b', 'c'], 'send-back');
    expect(result.document.items.map((item) => item.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves selected items one layer forward without crossing one another', () => {
    const result = applyDashboardCanvasV2LayerAction(doc(), ['a', 'b'], 'bring-forward');
    expect(result.document.items.map((item) => item.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('moves selected items one layer backward without crossing one another', () => {
    const result = applyDashboardCanvasV2LayerAction(doc(), ['b', 'c'], 'send-backward');
    expect(result.document.items.map((item) => item.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('never reorders a locked selected item', () => {
    const result = applyDashboardCanvasV2LayerAction(doc(), ['d'], 'send-back');
    expect(result.status).toBe('invalid');
    expect(result.document.items.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

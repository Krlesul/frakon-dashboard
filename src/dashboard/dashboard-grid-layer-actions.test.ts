import { describe, expect, it } from 'vitest';
import { applyDashboardGridLayerAction } from './dashboard-grid-layer-actions';
import type { FrakonDashboardDocument } from './layout-model';

function doc(): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'layers',
    title: 'Layers',
    breakpoint: 'desktop',
    columns: 8,
    rowHeight: 48,
    gap: 10,
    items: [
      { id: 'a', x: 0, y: 0, w: 1, h: 1, card: { type: 'custom:a' } },
      { id: 'b', x: 2, y: 0, w: 1, h: 1, card: { type: 'custom:b' } },
      { id: 'locked', x: 4, y: 0, w: 1, h: 1, locked: true, card: { type: 'custom:locked' } },
      { id: 'd', x: 6, y: 0, w: 1, h: 1, card: { type: 'custom:d' } },
    ],
  };
}

describe('grid dashboard layer actions', () => {
  it('brings selected items to front while preserving their relative order', () => {
    const result = applyDashboardGridLayerAction(doc(), ['a', 'b'], 'bring-front');
    expect(result.status).toBe('committed');
    expect(result.document.items.map((item) => item.id)).toEqual(['locked', 'd', 'a', 'b']);
  });

  it('sends selected items to back while preserving their relative order', () => {
    const result = applyDashboardGridLayerAction(doc(), ['b', 'd'], 'send-back');
    expect(result.document.items.map((item) => item.id)).toEqual(['b', 'd', 'a', 'locked']);
  });

  it('moves a contiguous selected group one layer forward as a block', () => {
    const result = applyDashboardGridLayerAction(doc(), ['a', 'b'], 'bring-forward');
    expect(result.document.items.map((item) => item.id)).toEqual(['locked', 'a', 'b', 'd']);
  });

  it('moves one layer backward without jumping over selected peers', () => {
    const result = applyDashboardGridLayerAction(doc(), ['b', 'd'], 'send-backward');
    expect(result.document.items.map((item) => item.id)).toEqual(['b', 'a', 'd', 'locked']);
  });

  it('does not move a locked-only selection', () => {
    const result = applyDashboardGridLayerAction(doc(), ['locked'], 'bring-front');
    expect(result.status).toBe('invalid');
    expect(result.document.items.map((item) => item.id)).toEqual(['a', 'b', 'locked', 'd']);
  });

  it('returns unchanged when the requested layer position is already satisfied', () => {
    const result = applyDashboardGridLayerAction(doc(), ['d'], 'bring-front');
    expect(result.status).toBe('unchanged');
  });
});

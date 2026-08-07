import { describe, expect, it } from 'vitest';
import { applyDashboardCanvasV2SelectionAction } from './dashboard-canvas-v2-selection-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'canvas',
    title: 'Canvas',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 600, minHeight: 300, snap: { enabled: false, size: 10 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 100, height: 80 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 220, y: 130, width: 140, height: 60 } },
      { id: 'c', card: { type: 'custom:c' }, frame: { x: 430, y: 20, width: 100, height: 80 }, locked: true },
    ],
  };
}

describe('dashboard canvas v2 selection actions', () => {
  it('aligns selected unlocked items to the shared top edge', () => {
    const result = applyDashboardCanvasV2SelectionAction(doc(), ['a', 'b'], 'align-top');
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'b')?.frame.y).toBe(20);
  });

  it('matches width to the first selected item', () => {
    const result = applyDashboardCanvasV2SelectionAction(doc(), ['a', 'b'], 'match-width');
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'b')?.frame.width).toBe(100);
  });

  it('leaves locked selected items unchanged', () => {
    const result = applyDashboardCanvasV2SelectionAction(doc(), ['a', 'c'], 'align-left');
    expect(result.document.items.find((item) => item.id === 'c')?.frame.x).toBe(430);
  });

  it('rejects an action that would collide items', () => {
    const source = doc();
    source.items[1].frame = { x: 20, y: 130, width: 100, height: 60 };
    const result = applyDashboardCanvasV2SelectionAction(source, ['a', 'b'], 'align-top');
    expect(result.status).toBe('collision');
    expect(result.document.items.find((item) => item.id === 'b')?.frame.y).toBe(130);
  });

  it('requires at least two selected items', () => {
    const result = applyDashboardCanvasV2SelectionAction(doc(), ['a'], 'align-left');
    expect(result.status).toBe('invalid');
  });
});

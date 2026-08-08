import { describe, expect, it } from 'vitest';
import { applyDashboardCanvasV2ItemAction } from './dashboard-canvas-v2-item-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'items',
    title: 'Items',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 600, minHeight: 300, snap: { enabled: true, size: 10 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 100, height: 80 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 180, y: 20, width: 100, height: 80 } },
      { id: 'locked', card: { type: 'custom:locked' }, frame: { x: 340, y: 20, width: 100, height: 80 }, locked: true },
    ],
    constraints: [{ id: 'b-right-a', kind: 'right-of', sourceId: 'b', targetId: 'a', gap: 60 }],
  };
}

describe('dashboard canvas v2 item actions', () => {
  it('duplicates a group with unique ids and selects the new items', () => {
    const result = applyDashboardCanvasV2ItemAction(doc(), ['a', 'b'], 'duplicate');
    expect(result.status).toBe('committed');
    expect(result.selectedIds).toEqual(['a-copy', 'b-copy']);
    expect(result.document.items.map((item) => item.id)).toContain('a-copy');
    expect(result.document.items.map((item) => item.id)).toContain('b-copy');
  });

  it('copies internal constraints and remaps both endpoints', () => {
    const result = applyDashboardCanvasV2ItemAction(doc(), ['a', 'b'], 'duplicate');
    expect(result.document.constraints).toContainEqual(expect.objectContaining({ sourceId: 'b-copy', targetId: 'a-copy' }));
  });

  it('never duplicates a locked selected item', () => {
    const result = applyDashboardCanvasV2ItemAction(doc(), ['locked'], 'duplicate');
    expect(result.status).toBe('invalid');
    expect(result.document.items).toHaveLength(3);
  });

  it('deletes selected unlocked items and cleans related constraints', () => {
    const result = applyDashboardCanvasV2ItemAction(doc(), ['b'], 'delete');
    expect(result.status).toBe('committed');
    expect(result.document.items.map((item) => item.id)).toEqual(['a', 'locked']);
    expect(result.document.constraints).toEqual([]);
  });

  it('keeps locked selected items while deleting unlocked peers', () => {
    const result = applyDashboardCanvasV2ItemAction(doc(), ['a', 'locked'], 'delete');
    expect(result.status).toBe('committed');
    expect(result.document.items.map((item) => item.id)).toEqual(['b', 'locked']);
  });
});

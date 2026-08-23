import { describe, expect, it } from 'vitest';
import { patchDashboardCanvasV2Item, patchDashboardCanvasV2Snap } from './dashboard-canvas-v2-inspector-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 500, minHeight: 260, snap: { enabled: true, size: 10 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 100, height: 80 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 200, y: 20, width: 100, height: 80 } },
    ],
  };
}

describe('v2 inspector actions', () => {
  it('patches exact native canvas geometry and metadata', () => {
    const result = patchDashboardCanvasV2Item(document(), 'a', {
      x: 40,
      y: 50,
      width: 120,
      height: 90,
      minWidth: 70,
      maxWidth: 180,
      locked: true,
    });
    expect(result.status).toBe('committed');
    const item = result.document.items.find((candidate) => candidate.id === 'a');
    expect(item?.frame).toEqual({ x: 40, y: 50, width: 120, height: 90 });
    expect(item?.minWidth).toBe(70);
    expect(item?.maxWidth).toBe(180);
    expect(item?.locked).toBe(true);
  });

  it('blocks direct inspector edits that would collide', () => {
    const result = patchDashboardCanvasV2Item(document(), 'a', { x: 180 });
    expect(result.status).toBe('collision');
    expect(result.collisionIds.sort()).toEqual(['a', 'b']);
    expect(result.document.items.find((item) => item.id === 'a')?.frame.x).toBe(20);
  });

  it('normalizes impossible min/max limits and canvas bounds', () => {
    const source = document();
    source.items = [source.items[0]];
    const result = patchDashboardCanvasV2Item(source, 'a', { x: -100, width: 900, minWidth: 700, maxWidth: 20 });
    expect(result.status).toBe('committed');
    const item = result.document.items.find((candidate) => candidate.id === 'a');
    expect(item?.frame.x).toBe(0);
    expect(item?.frame.width).toBe(500);
    expect(item?.minWidth).toBe(500);
    expect(item?.maxWidth).toBe(500);
  });

  it('can clear optional limits explicitly', () => {
    const source = document();
    source.items[0].minWidth = 60;
    source.items[0].maxWidth = 180;
    const result = patchDashboardCanvasV2Item(source, 'a', { minWidth: null, maxWidth: null });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].minWidth).toBeUndefined();
    expect(result.document.items[0].maxWidth).toBeUndefined();
  });

  it('patches snap settings without touching item geometry', () => {
    const result = patchDashboardCanvasV2Snap(document(), { enabled: false, size: 16 });
    expect(result.status).toBe('committed');
    expect(result.document.layout.snap).toEqual({ enabled: false, size: 16 });
    expect(result.document.items[0].frame).toEqual(document().items[0].frame);
  });
});

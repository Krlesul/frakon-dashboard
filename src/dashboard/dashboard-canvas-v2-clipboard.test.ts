import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { copyDashboardCanvasV2Selection, pasteDashboardCanvasV2Clipboard } from './dashboard-canvas-v2-clipboard';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'canvas',
    title: 'Canvas',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 800, minHeight: 500, snap: { enabled: true, size: 10 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 40, y: 40, width: 120, height: 80 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 220, y: 40, width: 140, height: 80 } },
      { id: 'locked', card: { type: 'custom:locked' }, frame: { x: 440, y: 40, width: 120, height: 80 }, locked: true },
    ],
    constraints: [
      { id: 'b-right-a', kind: 'right-of', sourceId: 'b', targetId: 'a', gap: 60 },
      { id: 'locked-right-b', kind: 'right-of', sourceId: 'locked', targetId: 'b', gap: 80 },
    ],
  };
}

describe('dashboard canvas v2 clipboard', () => {
  it('copies only unlocked selected items and internal constraints with relative geometry', () => {
    const clipboard = copyDashboardCanvasV2Selection(doc(), ['a', 'b', 'locked'])!;
    expect(clipboard.items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(clipboard.items[0].frame.x).toBe(0);
    expect(clipboard.items[1].frame.x).toBe(180);
    expect(clipboard.constraints.map((constraint) => constraint.id)).toEqual(['b-right-a']);
  });

  it('pastes with new ids, preserves relative spacing and remaps internal constraints', () => {
    const source = doc();
    const clipboard = copyDashboardCanvasV2Selection(source, ['a', 'b'])!;
    const result = pasteDashboardCanvasV2Clipboard(source, clipboard, { x: 40, y: 180 });
    expect(result.status).toBe('committed');
    expect(result.selectedIds).toEqual(['a-copy', 'b-copy']);
    const a = result.document.items.find((item) => item.id === 'a-copy')!;
    const b = result.document.items.find((item) => item.id === 'b-copy')!;
    expect(b.frame.x - a.frame.x).toBe(180);
    expect(result.document.constraints).toContainEqual(expect.objectContaining({
      sourceId: 'b-copy',
      targetId: 'a-copy',
    }));
  });

  it('generates unique ids on repeated paste', () => {
    const source = doc();
    const clipboard = copyDashboardCanvasV2Selection(source, ['a'])!;
    const first = pasteDashboardCanvasV2Clipboard(source, clipboard, { x: 40, y: 180 });
    expect(first.status).toBe('committed');
    const second = pasteDashboardCanvasV2Clipboard(first.document, clipboard, { x: 40, y: 300 });
    expect(second.status).toBe('committed');
    expect(second.selectedIds).toEqual(['a-copy-2']);
  });

  it('returns invalid when clipboard contains no usable FRAKON canvas items', () => {
    const result = pasteDashboardCanvasV2Clipboard(doc(), undefined);
    expect(result.status).toBe('invalid');
    expect(result.selectedIds).toEqual([]);
  });
});

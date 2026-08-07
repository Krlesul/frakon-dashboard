import { describe, expect, it } from 'vitest';
import { DashboardCanvasV2Session } from './dashboard-canvas-v2-session';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'canvas',
    title: 'Canvas',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 500, minHeight: 240, snap: { enabled: true, size: 10 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 100, height: 80 }, minWidth: 60, minHeight: 40 },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 220, y: 20, width: 100, height: 80 } },
      { id: 'locked', card: { type: 'custom:locked' }, frame: { x: 20, y: 140, width: 100, height: 60 }, locked: true },
    ],
  };
}

describe('DashboardCanvasV2Session', () => {
  it('moves selected items directly in canvas pixels with snap', () => {
    const session = new DashboardCanvasV2Session(document(), { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 });
    const preview = session.preview({ x: 27, y: 34 });
    expect(preview.document.items.find((item) => item.id === 'a')?.frame).toMatchObject({ x: 50, y: 50 });
    expect(preview.hasCollisions).toBe(false);
  });

  it('moves a group atomically while leaving locked selected items untouched', () => {
    const session = new DashboardCanvasV2Session(document(), { kind: 'move', selectedIds: ['a', 'locked'] }, { x: 0, y: 0 });
    const result = session.commit({ x: 50, y: 20 });
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'a')?.frame.x).toBe(70);
    expect(result.document.items.find((item) => item.id === 'locked')?.frame.x).toBe(20);
  });

  it('clamps group movement to the left and top canvas bounds', () => {
    const session = new DashboardCanvasV2Session(document(), { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 });
    const preview = session.preview({ x: -200, y: -200 });
    expect(preview.document.items.find((item) => item.id === 'a')?.frame).toMatchObject({ x: 0, y: 0 });
  });

  it('blocks a commit when the resulting v2 frames collide', () => {
    const session = new DashboardCanvasV2Session(document(), { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 });
    const result = session.commit({ x: 200, y: 0 });
    expect(result.status).toBe('collision');
    expect(result.collisionIds.sort()).toEqual(['a', 'b']);
    expect(result.document.items.find((item) => item.id === 'a')?.frame.x).toBe(20);
  });

  it('resizes natively while respecting item minimum dimensions', () => {
    const session = new DashboardCanvasV2Session(document(), { kind: 'resize', itemId: 'a', handle: 'se' }, { x: 0, y: 0 });
    const preview = session.preview({ x: -90, y: -90 });
    expect(preview.document.items.find((item) => item.id === 'a')?.frame).toMatchObject({ width: 60, height: 40 });
  });

  it('does not resize locked items', () => {
    const session = new DashboardCanvasV2Session(document(), { kind: 'resize', itemId: 'locked', handle: 'se' }, { x: 0, y: 0 });
    const result = session.commit({ x: 100, y: 100 });
    expect(result.status).toBe('unchanged');
    expect(result.document.items.find((item) => item.id === 'locked')?.frame).toEqual({ x: 20, y: 140, width: 100, height: 60 });
  });

  it('applies document constraints before collision validation', () => {
    const source = document();
    source.layout.snap.enabled = false;
    source.constraints = [{ id: 'b-below-a', kind: 'below', sourceId: 'b', targetId: 'a', gap: 20 }];
    const session = new DashboardCanvasV2Session(source, { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 });
    const preview = session.preview({ x: 40, y: 40 });
    expect(preview.document.items.find((item) => item.id === 'a')?.frame).toMatchObject({ x: 60, y: 60 });
    expect(preview.document.items.find((item) => item.id === 'b')?.frame.y).toBe(160);
  });

  it('grows canvas minHeight when an item is moved below the current extent', () => {
    const session = new DashboardCanvasV2Session(document(), { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 });
    const result = session.commit({ x: 0, y: 400 });
    expect(result.status).toBe('committed');
    expect(result.document.layout.minHeight).toBeGreaterThanOrEqual(500);
  });

  it('returns an unchanged source for zero movement and cancel', () => {
    const source = document();
    const session = new DashboardCanvasV2Session(source, { kind: 'move', selectedIds: ['a'] }, { x: 10, y: 10 });
    expect(session.commit({ x: 10, y: 10 }).status).toBe('unchanged');
    expect(session.cancel()).toEqual(source);
  });
});

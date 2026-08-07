import { describe, expect, it } from 'vitest';
import { DashboardCanvasSession } from './dashboard-canvas-session';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 4,
  rowHeight: 50,
  gap: 10,
  items: [
    { id: 'a', x: 0, y: 0, w: 1, h: 1, card: { type: 'custom:a' } },
    { id: 'b', x: 2, y: 0, w: 1, h: 1, card: { type: 'custom:b' } },
    { id: 'locked', x: 0, y: 2, w: 1, h: 1, locked: true, card: { type: 'custom:c' } },
  ],
};

describe('DashboardCanvasSession', () => {
  it('provides free pixel movement during preview', () => {
    const session = new DashboardCanvasSession(document, { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 }, 430);
    const preview = session.preview({ x: 37, y: 23 });
    expect(preview.items.find((item) => item.id === 'a')).toMatchObject({ x: 37, y: 23 });
  });

  it('commits a free pixel move back to the compatible v1 grid only once', () => {
    const session = new DashboardCanvasSession(document, { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 }, 430);
    const result = session.commit({ x: 120, y: 65 });
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'a')).toMatchObject({ x: 1, y: 1 });
    expect(document.items.find((item) => item.id === 'a')).toMatchObject({ x: 0, y: 0 });
  });

  it('rejects a free-canvas collision before legacy-grid projection', () => {
    const session = new DashboardCanvasSession(document, { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 }, 430);
    const result = session.commit({ x: 220, y: 0 });
    expect(result.status).toBe('collision');
    expect(result.collisionIds).toEqual(['a', 'b']);
  });

  it('keeps locked members stationary during group movement', () => {
    const session = new DashboardCanvasSession(document, { kind: 'move', selectedIds: ['a', 'locked'] }, { x: 0, y: 0 }, 430);
    const preview = session.preview({ x: 35, y: 20 });
    expect(preview.items.find((item) => item.id === 'a')).toMatchObject({ x: 35, y: 20 });
    expect(preview.items.find((item) => item.id === 'locked')).toMatchObject({ x: 0, y: 120 });
  });

  it('supports free pixel resize preview and compatible grid commit', () => {
    const session = new DashboardCanvasSession(document, { kind: 'resize', itemId: 'a', handle: 'se' }, { x: 0, y: 0 }, 430);
    const preview = session.preview({ x: 45, y: 30 });
    const item = preview.items.find((candidate) => candidate.id === 'a');
    expect(item?.width).toBe(145);
    expect(item?.height).toBe(80);
    const result = session.commit({ x: 120, y: 70 });
    expect(result.status).toBe('committed');
    expect(result.document.items.find((candidate) => candidate.id === 'a')).toMatchObject({ w: 2, h: 2 });
  });

  it('cancels without mutating the source document', () => {
    const session = new DashboardCanvasSession(document, { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 }, 430);
    const cancelled = session.cancel();
    cancelled.items[0].x = 3;
    expect(document.items[0].x).toBe(0);
  });
});

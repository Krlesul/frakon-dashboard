import { describe, expect, it } from 'vitest';
import { DashboardPointerSession } from './dashboard-pointer-session';
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
  ],
};

describe('DashboardPointerSession', () => {
  it('commits one collision-free move from the original document', () => {
    const session = new DashboardPointerSession(document, { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 }, 430);
    const preview = session.preview({ x: 110, y: 60 });
    expect(preview.items.find((item) => item.id === 'a')).toMatchObject({ x: 1, y: 1 });
    const result = session.commit({ x: 110, y: 60 });
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'a')).toMatchObject({ x: 1, y: 1 });
    expect(document.items.find((item) => item.id === 'a')).toMatchObject({ x: 0, y: 0 });
  });

  it('rejects a colliding move without mutating the source', () => {
    const session = new DashboardPointerSession(document, { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 }, 430);
    const result = session.commit({ x: 220, y: 0 });
    expect(result.status).toBe('collision');
    expect(result.collisionIds).toEqual(['a', 'b']);
    expect(result.document.items.find((item) => item.id === 'a')).toMatchObject({ x: 0, y: 0 });
  });

  it('commits a resize as one atomic document change', () => {
    const session = new DashboardPointerSession(document, { kind: 'resize', itemId: 'a', handle: 's' }, { x: 0, y: 0 }, 430);
    const result = session.commit({ x: 0, y: 120 });
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'a')).toMatchObject({ w: 1, h: 3 });
  });

  it('re-solves layout constraints as part of the same pointer preview and commit', () => {
    const constrained: FrakonDashboardDocument = {
      ...document,
      columns: 8,
      items: [
        { id: 'target', x: 0, y: 0, w: 1, h: 1, card: { type: 'custom:a' } },
        { id: 'source', x: 0, y: 2, w: 1, h: 1, card: { type: 'custom:b' } },
      ],
      constraints: [
        { id: 'align', kind: 'align-left', sourceId: 'source', targetId: 'target' },
        { id: 'below', kind: 'below', sourceId: 'source', targetId: 'target', gap: 1 },
      ],
    };
    const session = new DashboardPointerSession(constrained, { kind: 'move', selectedIds: ['target'] }, { x: 0, y: 0 }, 870);
    const preview = session.preview({ x: 110, y: 60 });
    expect(preview.items.find((item) => item.id === 'target')).toMatchObject({ x: 1, y: 1 });
    expect(preview.items.find((item) => item.id === 'source')).toMatchObject({ x: 1, y: 3 });
    const result = session.commit({ x: 110, y: 60 });
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'source')).toMatchObject({ x: 1, y: 3 });
  });

  it('reports unchanged when the pointer did not cross a grid step', () => {
    const session = new DashboardPointerSession(document, { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 }, 430);
    expect(session.commit({ x: 20, y: 10 }).status).toBe('unchanged');
  });

  it('cancels back to a defensive copy of the source document', () => {
    const session = new DashboardPointerSession(document, { kind: 'move', selectedIds: ['a'] }, { x: 0, y: 0 }, 430);
    const cancelled = session.cancel();
    cancelled.items[0].x = 3;
    expect(document.items[0].x).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { applyDashboardSelectionLayout } from './dashboard-selection-layout';
import type { FrakonDashboardDocument } from './layout-model';

function document(items: FrakonDashboardDocument['items']): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 48,
    gap: 12,
    items,
  };
}

const card = { type: 'custom:frakon-card' };

describe('dashboard selection layout', () => {
  it('aligns visible unlocked items to the selection bounds', () => {
    const source = document([
      { id: 'a', card, x: 1, y: 0, w: 2, h: 2 },
      { id: 'b', card, x: 5, y: 4, w: 2, h: 2 },
    ]);
    const result = applyDashboardSelectionLayout(source, ['a', 'b'], 'align-left');
    expect(result.status).toBe('committed');
    expect(result.document.items.map((item) => item.x)).toEqual([1, 1]);
  });

  it('keeps locked items immutable while using them as alignment references', () => {
    const source = document([
      { id: 'locked', card, x: 0, y: 0, w: 2, h: 2, locked: true },
      { id: 'b', card, x: 6, y: 4, w: 2, h: 2 },
    ]);
    const result = applyDashboardSelectionLayout(source, ['locked', 'b'], 'align-left');
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'locked')).toMatchObject({ x: 0, y: 0 });
    expect(result.document.items.find((item) => item.id === 'b')).toMatchObject({ x: 0, y: 4 });
  });

  it('ignores hidden selected items', () => {
    const source = document([
      { id: 'a', card, x: 1, y: 0, w: 2, h: 2 },
      { id: 'hidden', card, x: 9, y: 9, w: 2, h: 2, hidden: true },
      { id: 'b', card, x: 5, y: 4, w: 2, h: 2 },
    ]);
    const result = applyDashboardSelectionLayout(source, ['a', 'hidden', 'b'], 'align-right');
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'hidden')).toMatchObject({ x: 9, y: 9 });
    expect(result.document.items.find((item) => item.id === 'a')?.x).toBe(5);
  });

  it('distributes three movable items horizontally', () => {
    const source = document([
      { id: 'a', card, x: 0, y: 0, w: 2, h: 2 },
      { id: 'b', card, x: 4, y: 4, w: 2, h: 2 },
      { id: 'c', card, x: 10, y: 0, w: 2, h: 2 },
    ]);
    const result = applyDashboardSelectionLayout(source, ['a', 'b', 'c'], 'distribute-horizontal');
    expect(result.status).toBe('committed');
    expect(result.document.items.map((item) => item.x)).toEqual([0, 5, 10]);
  });

  it('rejects a layout action that would create a collision', () => {
    const source = document([
      { id: 'a', card, x: 0, y: 0, w: 2, h: 2 },
      { id: 'b', card, x: 4, y: 4, w: 2, h: 2 },
      { id: 'blocker', card, x: 0, y: 4, w: 2, h: 2 },
    ]);
    const result = applyDashboardSelectionLayout(source, ['a', 'b'], 'align-left');
    expect(result.status).toBe('collision');
    expect(result.document).toEqual(source);
    expect(result.collisionIds).toEqual(expect.arrayContaining(['b', 'blocker']));
  });
});

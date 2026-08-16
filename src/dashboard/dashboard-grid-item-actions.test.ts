import { describe, expect, it } from 'vitest';
import { applyDashboardGridItemAction } from './dashboard-grid-item-actions';
import type { FrakonDashboardDocument } from './layout-model';

function doc(): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'grid-actions',
    title: 'Grid actions',
    breakpoint: 'desktop',
    columns: 8,
    rowHeight: 48,
    gap: 10,
    items: [
      { id: 'a', x: 0, y: 0, w: 2, h: 2, card: { type: 'custom:a' } },
      { id: 'b', x: 3, y: 0, w: 2, h: 2, card: { type: 'custom:b' } },
      { id: 'hidden', x: 0, y: 3, w: 2, h: 2, hidden: true, card: { type: 'custom:hidden' } },
      { id: 'locked', x: 6, y: 0, w: 1, h: 1, locked: true, card: { type: 'custom:locked' } },
    ],
    constraints: [
      { id: 'b-right-a', kind: 'right-of', sourceId: 'b', targetId: 'a', gap: 1, priority: 50 },
      { id: 'hidden-left-a', kind: 'align-left', sourceId: 'hidden', targetId: 'a', priority: 30 },
    ],
  };
}

describe('grid dashboard item actions', () => {
  it('duplicates unlocked selection with unique ids and selects visible unlocked copies', () => {
    const result = applyDashboardGridItemAction(doc(), ['a', 'b'], 'duplicate');
    expect(result.status).toBe('committed');
    expect(result.selectedIds).toEqual(['a-copy', 'b-copy']);
    expect(result.document.items.map((item) => item.id)).toEqual(expect.arrayContaining(['a-copy', 'b-copy']));
    expect(result.document.items.find((item) => item.id === 'a-copy')).toMatchObject({ locked: false, hidden: false });
  });

  it('duplicates an unlocked hidden layer as a visible discoverable copy', () => {
    const result = applyDashboardGridItemAction(doc(), ['hidden'], 'duplicate');
    expect(result.status).toBe('committed');
    expect(result.selectedIds).toEqual(['hidden-copy']);
    expect(result.document.items.find((item) => item.id === 'hidden-copy')).toMatchObject({
      locked: false,
      hidden: false,
    });
  });

  it('copies only constraints whose two endpoints are duplicated', () => {
    const result = applyDashboardGridItemAction(doc(), ['a', 'b', 'hidden'], 'duplicate');
    expect(result.document.constraints).toContainEqual(expect.objectContaining({
      sourceId: 'b-copy',
      targetId: 'a-copy',
    }));
    expect(result.document.constraints).toContainEqual(expect.objectContaining({
      sourceId: 'hidden-copy',
      targetId: 'a-copy',
    }));

    const partial = applyDashboardGridItemAction(doc(), ['a'], 'duplicate');
    expect(partial.document.constraints).toHaveLength(2);
  });

  it('uses another unique suffix when a copy id already exists', () => {
    const source = doc();
    source.items.push({ id: 'a-copy', x: 0, y: 6, w: 2, h: 2, card: { type: 'custom:a' } });
    const result = applyDashboardGridItemAction(source, ['a'], 'duplicate');
    expect(result.selectedIds).toEqual(['a-copy-2']);
  });

  it('never duplicates a locked-only selection', () => {
    const result = applyDashboardGridItemAction(doc(), ['locked'], 'duplicate');
    expect(result.status).toBe('invalid');
    expect(result.document.items).toHaveLength(4);
  });

  it('deletes unlocked hidden items and removes every attached constraint', () => {
    const result = applyDashboardGridItemAction(doc(), ['hidden'], 'delete');
    expect(result.status).toBe('committed');
    expect(result.document.items.map((item) => item.id)).toEqual(['a', 'b', 'locked']);
    expect((result.document.constraints ?? []).map((constraint) => constraint.id)).toEqual(['b-right-a']);
  });

  it('deletes unlocked selected items and removes their constraints', () => {
    const result = applyDashboardGridItemAction(doc(), ['b'], 'delete');
    expect(result.status).toBe('committed');
    expect(result.document.items.map((item) => item.id)).toEqual(['a', 'hidden', 'locked']);
    expect((result.document.constraints ?? []).map((constraint) => constraint.id)).toEqual(['hidden-left-a']);
  });

  it('keeps locked peers when deleting a mixed selection', () => {
    const result = applyDashboardGridItemAction(doc(), ['a', 'locked'], 'delete');
    expect(result.status).toBe('committed');
    expect(result.document.items.map((item) => item.id)).toEqual(['b', 'hidden', 'locked']);
    expect(result.document.constraints).toEqual([]);
  });
});

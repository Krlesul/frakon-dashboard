import { describe, expect, it } from 'vitest';
import {
  copyDashboardGridSelection,
  pasteDashboardGridClipboard,
} from './dashboard-grid-clipboard';
import type { FrakonDashboardDocument } from './layout-model';

function doc(): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'clipboard',
    title: 'Clipboard',
    breakpoint: 'desktop',
    columns: 8,
    rowHeight: 48,
    gap: 10,
    items: [
      { id: 'a', x: 0, y: 0, w: 2, h: 2, card: { type: 'custom:a', nested: { value: 1 } } },
      { id: 'b', x: 3, y: 0, w: 2, h: 2, card: { type: 'custom:b' } },
      { id: 'locked', x: 6, y: 0, w: 1, h: 1, locked: true, card: { type: 'custom:locked' } },
    ],
    constraints: [
      { id: 'a-left-b', kind: 'left-of', sourceId: 'a', targetId: 'b', gap: 1, priority: 50 },
    ],
  };
}

describe('grid dashboard clipboard', () => {
  it('copies only unlocked selected items and their internal constraints', () => {
    const payload = copyDashboardGridSelection(doc(), ['a', 'b', 'locked']);
    expect(payload?.items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(payload?.constraints).toHaveLength(1);
  });

  it('returns no payload for a locked-only selection', () => {
    expect(copyDashboardGridSelection(doc(), ['locked'])).toBeUndefined();
  });

  it('pastes independent deep copies at a collision-free position', () => {
    const source = doc();
    const payload = copyDashboardGridSelection(source, ['a', 'b']);
    const result = pasteDashboardGridClipboard(source, payload);

    expect(result.status).toBe('committed');
    expect(result.selectedIds).toEqual(['a-copy', 'b-copy']);
    expect(result.document.items).toHaveLength(5);
    expect(result.document.constraints).toContainEqual(expect.objectContaining({
      sourceId: 'a-copy',
      targetId: 'b-copy',
    }));

    const pasted = result.document.items.find((item) => item.id === 'a-copy');
    const original = source.items.find((item) => item.id === 'a');
    expect(pasted?.card).toEqual(original?.card);
    expect(pasted?.card).not.toBe(original?.card);
  });

  it('generates deterministic new ids on repeated paste', () => {
    const source = doc();
    const payload = copyDashboardGridSelection(source, ['a']);
    const first = pasteDashboardGridClipboard(source, payload);
    const second = pasteDashboardGridClipboard(first.document, payload);
    expect(first.selectedIds).toEqual(['a-copy']);
    expect(second.selectedIds).toEqual(['a-copy-2']);
  });

  it('does not mutate the clipboard payload while pasting', () => {
    const source = doc();
    const payload = copyDashboardGridSelection(source, ['a', 'b'])!;
    const before = structuredClone(payload);
    pasteDashboardGridClipboard(source, payload);
    expect(payload).toEqual(before);
  });

  it('fails closed for an empty clipboard', () => {
    const result = pasteDashboardGridClipboard(doc(), undefined);
    expect(result.status).toBe('invalid');
    expect(result.document).toEqual(doc());
  });
});

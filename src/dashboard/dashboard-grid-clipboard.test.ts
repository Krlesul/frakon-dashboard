import { describe, expect, it } from 'vitest';
import {
  copyDashboardGridSelection,
  pasteDashboardGridClipboard,
} from './dashboard-grid-clipboard';
import { applyDashboardGridItemAction } from './dashboard-grid-item-actions';
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
      { id: 'hidden', x: 0, y: 3, w: 2, h: 2, hidden: true, card: { type: 'custom:hidden' } },
      { id: 'locked', x: 6, y: 0, w: 1, h: 1, locked: true, card: { type: 'custom:locked' } },
    ],
    constraints: [
      { id: 'a-left-b', kind: 'left-of', sourceId: 'a', targetId: 'b', gap: 1, priority: 50 },
      { id: 'a-above-hidden', kind: 'align-left', sourceId: 'hidden', targetId: 'a', priority: 30 },
    ],
  };
}

describe('grid dashboard clipboard', () => {
  it('copies only unlocked selected items and constraints internal to the copied set', () => {
    const payload = copyDashboardGridSelection(doc(), ['a', 'b', 'hidden', 'locked']);
    expect(payload?.items.map((item) => item.id)).toEqual(['a', 'b', 'hidden']);
    expect(payload?.constraints.map((constraint) => constraint.id)).toEqual(['a-left-b', 'a-above-hidden']);
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
    expect(result.document.items).toHaveLength(6);
    expect(result.document.constraints).toContainEqual(expect.objectContaining({
      sourceId: 'a-copy',
      targetId: 'b-copy',
    }));

    const pasted = result.document.items.find((item) => item.id === 'a-copy');
    const original = source.items.find((item) => item.id === 'a');
    expect(pasted?.card).toEqual(original?.card);
    expect(pasted?.card).not.toBe(original?.card);
  });

  it('makes normal copied hidden layers visible and unlocked on paste', () => {
    const source = doc();
    const payload = copyDashboardGridSelection(source, ['a', 'hidden']);
    const result = pasteDashboardGridClipboard(source, payload);
    const pastedHidden = result.document.items.find((item) => item.id === 'hidden-copy');

    expect(result.status).toBe('committed');
    expect(pastedHidden).toMatchObject({ hidden: false, locked: false });
    expect(result.document.constraints).toContainEqual(expect.objectContaining({
      sourceId: 'hidden-copy',
      targetId: 'a-copy',
    }));
  });

  it('infers cut-style paste after source ids were removed and preserves hidden state', () => {
    const source = doc();
    const payload = copyDashboardGridSelection(source, ['hidden']);
    const afterCut: FrakonDashboardDocument = {
      ...source,
      items: source.items.filter((item) => item.id !== 'hidden'),
      constraints: source.constraints?.filter(
        (constraint) => constraint.sourceId !== 'hidden' && constraint.targetId !== 'hidden',
      ),
    };

    const result = pasteDashboardGridClipboard(afterCut, payload);
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'hidden-copy')).toMatchObject({
      hidden: true,
      locked: false,
    });
  });

  it('preserves visibility and remaps internal constraints through the exact Studio cut pipeline', () => {
    const source = doc();
    const selected = ['a', 'hidden'];
    const payload = copyDashboardGridSelection(source, selected);
    expect(payload?.constraints.map((constraint) => constraint.id)).toEqual(['a-above-hidden']);

    const deleted = applyDashboardGridItemAction(source, selected, 'delete');
    expect(deleted.status).toBe('committed');
    expect(deleted.document.items.some((item) => item.id === 'a')).toBe(false);
    expect(deleted.document.items.some((item) => item.id === 'hidden')).toBe(false);
    expect(deleted.document.constraints.some((constraint) => constraint.id === 'a-above-hidden')).toBe(false);

    const pasted = pasteDashboardGridClipboard(deleted.document, payload);
    expect(pasted.status).toBe('committed');
    expect(pasted.document.items.find((item) => item.id === 'a-copy')).toMatchObject({ hidden: false, locked: false });
    expect(pasted.document.items.find((item) => item.id === 'hidden-copy')).toMatchObject({ hidden: true, locked: false });
    expect(pasted.document.constraints).toContainEqual(expect.objectContaining({
      sourceId: 'hidden-copy',
      targetId: 'a-copy',
    }));
  });

  it('supports an explicit preserve-hidden override for non-standard clipboard callers', () => {
    const source = doc();
    const payload = copyDashboardGridSelection(source, ['hidden'], { preserveHiddenOnPaste: true });
    expect(payload?.preserveHiddenOnPaste).toBe(true);

    const result = pasteDashboardGridClipboard(source, payload);
    expect(result.status).toBe('committed');
    expect(result.document.items.find((item) => item.id === 'hidden-copy')).toMatchObject({
      hidden: true,
      locked: false,
    });
  });

  it('does not copy constraints with an endpoint outside the copied selection', () => {
    const payload = copyDashboardGridSelection(doc(), ['hidden']);
    expect(payload?.constraints).toEqual([]);
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

import { describe, expect, it } from 'vitest';
import {
  canvasV2MoveSelection,
  normalizeCanvasV2Selection,
  selectCanvasV2ByMarquee,
  selectCanvasV2Item,
} from './dashboard-canvas-v2-selection';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const document: FrakonDashboardDocumentV2 = {
  version: 2,
  id: 'canvas',
  title: 'Canvas',
  breakpoint: 'desktop',
  layout: { mode: 'canvas', width: 500, minHeight: 300, snap: { enabled: true, size: 10 } },
  items: [
    { id: 'a', card: {}, frame: { x: 0, y: 0, width: 100, height: 100 } },
    { id: 'b', card: {}, frame: { x: 150, y: 0, width: 100, height: 100 } },
    { id: 'locked', card: {}, frame: { x: 300, y: 0, width: 100, height: 100 }, locked: true },
  ],
};

describe('native v2 canvas selection', () => {
  it('supports replace, additive and toggle selection', () => {
    const first = selectCanvasV2Item({ ids: [] }, 'a');
    expect(first.ids).toEqual(['a']);
    const added = selectCanvasV2Item(first, 'b', { shiftKey: true });
    expect(added.ids).toEqual(['a', 'b']);
    const toggled = selectCanvasV2Item(added, 'a', { metaKey: true });
    expect(toggled.ids).toEqual(['b']);
  });

  it('selects intersecting frames with marquee and supports additive mode', () => {
    const selection = selectCanvasV2ByMarquee(document, { x: -10, y: -10, width: 270, height: 120 });
    expect(selection.ids).toEqual(['a', 'b']);
    const additive = selectCanvasV2ByMarquee(document, { x: 290, y: -10, width: 120, height: 120 }, { ids: ['a'], anchorId: 'a' }, true);
    expect(additive.ids).toEqual(['a', 'locked']);
  });

  it('excludes locked items from a group move without dropping their selection', () => {
    const state = { ids: ['a', 'locked'], anchorId: 'locked' };
    expect(canvasV2MoveSelection(state, 'a', document)).toEqual(['a']);
    expect(state.ids).toEqual(['a', 'locked']);
  });

  it('normalizes stale selection ids against the current document', () => {
    const normalized = normalizeCanvasV2Selection({ ids: ['a', 'missing'], anchorId: 'missing' }, document);
    expect(normalized.ids).toEqual(['a']);
    expect(normalized.anchorId).toBe('a');
  });
});

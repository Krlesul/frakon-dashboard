import { describe, expect, it } from 'vitest';
import {
  moveDashboardLayerAbove,
  moveDashboardLayerToBack,
  renameDashboardLayer,
  setDashboardLayerHidden,
  setDashboardLayerLocked,
} from './dashboard-layers';
import type { FrakonDashboardDocument } from './layout-model';

function doc(): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'layers',
    title: 'Layers',
    breakpoint: 'desktop',
    columns: 8,
    rowHeight: 48,
    gap: 10,
    items: [
      { id: 'a', x: 0, y: 0, w: 1, h: 1, card: { type: 'custom:a', name: 'Alpha' } },
      { id: 'b', x: 2, y: 0, w: 1, h: 1, card: { type: 'custom:b' } },
      { id: 'locked', x: 4, y: 0, w: 1, h: 1, locked: true, card: { type: 'custom:locked' } },
    ],
  };
}

describe('dashboard Layers model', () => {
  it('renames a layer through card.name and can clear the override', () => {
    const renamed = renameDashboardLayer(doc(), 'b', ' Kitchen ');
    expect(renamed.status).toBe('committed');
    expect(renamed.document.items[1].card.name).toBe('Kitchen');

    const cleared = renameDashboardLayer(renamed.document, 'b', '   ');
    expect(cleared.status).toBe('committed');
    expect(cleared.document.items[1].card.name).toBeUndefined();
  });

  it('persists lock and hidden flags independently', () => {
    const locked = setDashboardLayerLocked(doc(), 'b', true);
    expect(locked.document.items[1].locked).toBe(true);
    const hidden = setDashboardLayerHidden(locked.document, 'b', true);
    expect(hidden.document.items[1].locked).toBe(true);
    expect(hidden.document.items[1].hidden).toBe(true);
  });

  it('moves a layer immediately above the drop target in z-order', () => {
    const result = moveDashboardLayerAbove(doc(), 'a', 'locked');
    expect(result.status).toBe('committed');
    expect(result.document.items.map((item) => item.id)).toEqual(['b', 'locked', 'a']);
  });

  it('can move an unlocked layer to the very back', () => {
    const result = moveDashboardLayerToBack(doc(), 'b');
    expect(result.document.items.map((item) => item.id)).toEqual(['b', 'a', 'locked']);
  });

  it('never reorders a locked source layer', () => {
    const above = moveDashboardLayerAbove(doc(), 'locked', 'a');
    expect(above.status).toBe('invalid');
    expect(above.document.items.map((item) => item.id)).toEqual(['a', 'b', 'locked']);
    const back = moveDashboardLayerToBack(doc(), 'locked');
    expect(back.status).toBe('invalid');
  });

  it('returns unchanged for no-op mutations', () => {
    expect(renameDashboardLayer(doc(), 'a', 'Alpha').status).toBe('unchanged');
    expect(setDashboardLayerLocked(doc(), 'a', false).status).toBe('unchanged');
    expect(setDashboardLayerHidden(doc(), 'a', false).status).toBe('unchanged');
    expect(moveDashboardLayerToBack(doc(), 'a').status).toBe('unchanged');
  });
});

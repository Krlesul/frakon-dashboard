import { describe, expect, it } from 'vitest';
import type { LayoutConstraint } from '../../packages/studio-engine/src/constraints';
import { exportDashboard, importDashboard } from './layout-store';
import {
  normalizeDashboard,
  removeGridItem,
  setGridItemHidden,
  type FrakonDashboardDocument,
} from './layout-model';

function constraint(id: string, sourceId: string, targetId: string): LayoutConstraint {
  return { id, sourceId, targetId } as unknown as LayoutConstraint;
}

function fixture(): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'hidden-roundtrip',
    title: 'Hidden round-trip',
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 48,
    gap: 12,
    constraints: [constraint('visible-hidden', 'visible', 'hidden')],
    items: [
      { id: 'visible', card: { type: 'custom:frakon-card', name: 'Visible' }, x: 0, y: 0, w: 4, h: 3 },
      { id: 'hidden', card: { type: 'custom:frakon-room-card', name: 'Hidden' }, x: 4, y: 0, w: 4, h: 3, hidden: true },
    ],
  };
}

describe('hidden layer canonical document invariants', () => {
  it('keeps hidden layers and their constraints in canonical normalization', () => {
    const source = fixture();
    const normalized = normalizeDashboard(source);

    expect(normalized.items.find((item) => item.id === 'hidden')).toMatchObject({
      x: 4,
      y: 0,
      w: 4,
      h: 3,
      hidden: true,
    });
    expect(normalized.constraints?.map((entry) => entry.id)).toEqual(['visible-hidden']);
    expect(source.items.find((item) => item.id === 'hidden')).toMatchObject({ hidden: true });
  });

  it('hide/show changes visibility only and preserves geometry plus constraints', () => {
    const source = fixture();
    const shown = setGridItemHidden(source, 'hidden', false);
    const hiddenAgain = setGridItemHidden(shown, 'hidden', true);

    expect(shown.items.find((item) => item.id === 'hidden')).toMatchObject({
      x: 4,
      y: 0,
      w: 4,
      h: 3,
      hidden: false,
    });
    expect(hiddenAgain.items.find((item) => item.id === 'hidden')).toMatchObject({
      x: 4,
      y: 0,
      w: 4,
      h: 3,
      hidden: true,
    });
    expect(hiddenAgain.constraints).toEqual(source.constraints);
  });

  it('preserves hidden state, geometry and internal constraints through export/import', () => {
    const source = fixture();
    const exported = exportDashboard(source);
    const imported = importDashboard(exported);

    expect(imported.id).toBe(source.id);
    expect(imported.items.map((item) => item.id)).toEqual(['visible', 'hidden']);
    expect(imported.items.find((item) => item.id === 'hidden')).toMatchObject({
      x: 4,
      y: 0,
      w: 4,
      h: 3,
      hidden: true,
    });
    expect(imported.constraints?.map((entry) => entry.id)).toEqual(['visible-hidden']);
  });

  it('removes constraints that reference a deleted hidden layer', () => {
    const removed = removeGridItem(fixture(), 'hidden');
    expect(removed.items.map((item) => item.id)).toEqual(['visible']);
    expect(removed.constraints ?? []).toHaveLength(0);
  });
});

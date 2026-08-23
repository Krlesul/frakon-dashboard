import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocument } from './layout-model';
import { solveDashboardConstraints } from './constraint-solver';

const base: FrakonDashboardDocument = {
  version: 1,
  id: 'dashboard',
  title: 'Dashboard',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  items: [
    { id: 'weather', card: { type: 'weather' }, x: 1, y: 1, w: 4, h: 3 },
    { id: 'energy', card: { type: 'energy' }, x: 8, y: 8, w: 3, h: 2 },
  ],
};

describe('solveDashboardConstraints', () => {
  it('places a source card below its target', () => {
    const result = solveDashboardConstraints({
      ...base,
      constraints: [{
        id: 'energy-below-weather',
        kind: 'below',
        sourceId: 'energy',
        targetId: 'weather',
        gap: 1,
      }],
    });
    const energy = result.document.items.find((item) => item.id === 'energy');
    expect(energy?.y).toBe(5);
    expect(result.diagnostics[0]?.status).toBe('applied');
  });

  it('normalizes matched dimensions into the dashboard grid', () => {
    const result = solveDashboardConstraints({
      ...base,
      constraints: [{
        id: 'match-width',
        kind: 'match-width',
        sourceId: 'energy',
        targetId: 'weather',
      }],
    });
    expect(result.document.items.find((item) => item.id === 'energy')?.w).toBe(4);
  });

  it('preserves locked source cards and reports the reason', () => {
    const result = solveDashboardConstraints({
      ...base,
      items: base.items.map((item) => item.id === 'energy' ? { ...item, locked: true } : item),
      constraints: [{
        id: 'locked',
        kind: 'align-left',
        sourceId: 'energy',
        targetId: 'weather',
      }],
    });
    expect(result.document.items.find((item) => item.id === 'energy')?.x).toBe(8);
    expect(result.diagnostics[0]?.status).toBe('locked');
  });

  it('returns normalized input when no constraints exist', () => {
    const result = solveDashboardConstraints({ ...base, rowHeight: 10 });
    expect(result.document.rowHeight).toBe(24);
    expect(result.diagnostics).toEqual([]);
  });
});

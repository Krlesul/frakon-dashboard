import { describe, expect, it } from 'vitest';
import { resolveDashboardSurfaces, resolveGridItemSurface } from './surface-style-resolver';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  surface: { fill: 'transparent', border: 'none' },
  cardSurface: { fill: 'glass', border: 'none', borderRadius: 24, padding: 8 },
  items: [
    { id: 'light', x: 0, y: 0, w: 4, h: 3, card: { type: 'custom:frakon-light-card' } },
    { id: 'camera', x: 4, y: 0, w: 8, h: 5, card: { type: 'custom:frakon-camera-card' }, surface: { fill: 'transparent', padding: 0 } },
  ],
};

describe('dashboard surface inheritance', () => {
  it('resolves dashboard and default card surfaces independently', () => {
    const resolved = resolveDashboardSurfaces(document);
    expect(resolved.dashboard).toMatchObject({ fill: 'transparent', border: 'none' });
    expect(resolved.card).toMatchObject({ fill: 'glass', border: 'none', borderRadius: 24, padding: 8 });
  });

  it('inherits card defaults when no item override exists', () => {
    expect(resolveGridItemSurface(document, document.items[0])).toMatchObject({ fill: 'glass', borderRadius: 24, padding: 8 });
  });

  it('lets one card override only selected properties', () => {
    expect(resolveGridItemSurface(document, document.items[1])).toMatchObject({ fill: 'transparent', border: 'none', borderRadius: 24, padding: 0 });
  });
});

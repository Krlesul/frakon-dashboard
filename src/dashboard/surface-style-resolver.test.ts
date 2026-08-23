import { describe, expect, it } from 'vitest';
import { resolveCanvasItemSurface, resolveDashboardSurfaces, resolveGridItemSurface } from './surface-style-resolver';
import type { FrakonDashboardDocument } from './layout-model';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

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

const canvasDocument: FrakonDashboardDocumentV2 = {
  version: 2,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  layout: { mode: 'canvas', width: 1200, minHeight: 700, snap: { enabled: true, size: 8 } },
  cardSurface: { fill: 'glass', border: 'none', borderRadius: 28, padding: 10 },
  items: [
    { id: 'light', card: { type: 'custom:frakon-light-card' }, frame: { x: 20, y: 20, width: 240, height: 180 } },
    { id: 'camera', card: { type: 'custom:frakon-camera-card' }, frame: { x: 300, y: 20, width: 420, height: 240 }, surface: { fill: 'transparent', padding: 0 } },
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

  it('resolves the same inheritance model for canvas v2 items', () => {
    expect(resolveCanvasItemSurface(canvasDocument, canvasDocument.items[0])).toMatchObject({ fill: 'glass', borderRadius: 28, padding: 10 });
    expect(resolveCanvasItemSurface(canvasDocument, canvasDocument.items[1])).toMatchObject({ fill: 'transparent', border: 'none', borderRadius: 28, padding: 0 });
  });
});

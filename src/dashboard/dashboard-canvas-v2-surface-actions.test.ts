import { describe, expect, it } from 'vitest';
import { applyDashboardCanvasV2SurfaceStyle, clearDashboardCanvasV2SurfaceStyle } from './dashboard-canvas-v2-surface-actions';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'surface',
    title: 'Surface',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 900, minHeight: 500, snap: { enabled: true, size: 8 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 180, height: 120 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 240, y: 20, width: 180, height: 120 }, locked: true },
    ],
  };
}

describe('dashboard canvas v2 surface actions', () => {
  it('applies normalized dashboard surface', () => {
    const result = applyDashboardCanvasV2SurfaceStyle(doc(), { kind: 'dashboard' }, { fill: 'glass', backgroundOpacity: 2, backdropBlur: 120 });
    expect(result.status).toBe('committed');
    expect(result.document.surface).toMatchObject({ fill: 'glass', backgroundOpacity: 1, backdropBlur: 80 });
  });

  it('applies card defaults separately', () => {
    const result = applyDashboardCanvasV2SurfaceStyle(doc(), { kind: 'card-defaults' }, { borderRadius: 32, padding: 12 });
    expect(result.status).toBe('committed');
    expect(result.document.cardSurface).toMatchObject({ borderRadius: 32, padding: 12 });
    expect(result.document.surface).toBeUndefined();
  });

  it('applies item style only to unlocked selected cards', () => {
    const result = applyDashboardCanvasV2SurfaceStyle(doc(), { kind: 'items', ids: ['a', 'b'] }, { fill: 'solid', backgroundColor: '#101010' });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].surface?.fill).toBe('solid');
    expect(result.document.items[1].surface).toBeUndefined();
  });

  it('clears an item override back to inherited defaults', () => {
    const source = doc();
    source.items[0].surface = { fill: 'transparent' };
    const result = clearDashboardCanvasV2SurfaceStyle(source, { kind: 'items', ids: ['a'] });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].surface).toBeUndefined();
  });

  it('rejects empty item selection', () => {
    expect(applyDashboardCanvasV2SurfaceStyle(doc(), { kind: 'items', ids: [] }, {}).status).toBe('invalid');
    expect(clearDashboardCanvasV2SurfaceStyle(doc(), { kind: 'items', ids: [] }).status).toBe('invalid');
  });
});

import { describe, expect, it } from 'vitest';
import { patchDashboardCanvasV2CardConfig } from './dashboard-canvas-v2-card-config';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'canvas',
    title: 'Canvas',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1000, minHeight: 500, snap: { enabled: true, size: 8 } },
    items: [
      { id: 'light', card: { type: 'custom:frakon-light-card', entity: 'light.placeholder' }, frame: { x: 0, y: 0, width: 240, height: 220 } },
    ],
  };
}

describe('patchDashboardCanvasV2CardConfig', () => {
  it('updates entity without changing geometry or type', () => {
    const result = patchDashboardCanvasV2CardConfig(doc(), 'light', { entity: 'light.kitchen' });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].card).toMatchObject({ type: 'custom:frakon-light-card', entity: 'light.kitchen' });
    expect(result.document.items[0].frame).toEqual(doc().items[0].frame);
  });

  it('removes optional name/title when set to empty', () => {
    const source = doc();
    source.items[0].card.name = 'Kitchen';
    const result = patchDashboardCanvasV2CardConfig(source, 'light', { name: '' });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].card.name).toBeUndefined();
  });

  it('rejects unsafe arbitrary config keys', () => {
    const result = patchDashboardCanvasV2CardConfig(doc(), 'light', { type: 'custom:other' });
    expect(result.status).toBe('invalid');
    expect(result.document.items[0].card.type).toBe('custom:frakon-light-card');
  });
});

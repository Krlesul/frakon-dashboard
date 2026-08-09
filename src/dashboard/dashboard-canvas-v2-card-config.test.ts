import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2CardConfigFields, patchDashboardCanvasV2CardConfig } from './dashboard-canvas-v2-card-config';
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

  it('rejects a wrong entity domain for strict cards', () => {
    const result = patchDashboardCanvasV2CardConfig(doc(), 'light', { entity: 'sensor.kitchen' });
    expect(result.status).toBe('invalid');
    expect(result.reason).toContain('light.*');
    expect(result.document.items[0].card.entity).toBe('light.placeholder');
  });

  it('keeps universal cards domain-agnostic', () => {
    const source = doc();
    source.items[0].card = { type: 'custom:frakon-card', entity: 'sensor.old' };
    const result = patchDashboardCanvasV2CardConfig(source, 'light', { entity: 'switch.anything' });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].card.entity).toBe('switch.anything');
  });

  it('removes optional name/title when set to empty', () => {
    const source = doc();
    source.items[0].card.name = 'Kitchen';
    const result = patchDashboardCanvasV2CardConfig(source, 'light', { name: '' });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].card.name).toBeUndefined();
  });

  it('exposes generic plus type-specific fields', () => {
    const fields = dashboardCanvasV2CardConfigFields(doc().items[0].card);
    expect(fields.map((field) => field.key)).toEqual(['entity', 'name', 'title', 'show_brightness']);
  });

  it('allows the light brightness toggle', () => {
    const result = patchDashboardCanvasV2CardConfig(doc(), 'light', { show_brightness: true });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].card.show_brightness).toBe(true);
  });

  it('rejects another card type specific field', () => {
    const result = patchDashboardCanvasV2CardConfig(doc(), 'light', { show_volume: true });
    expect(result.status).toBe('invalid');
    expect(result.document.items[0].card.show_volume).toBeUndefined();
  });

  it('validates climate step range', () => {
    const source = doc();
    source.items[0].card = { type: 'custom:frakon-climate-card', entity: 'climate.home' };
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { step: 0.5 }).status).toBe('committed');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { step: 0 }).status).toBe('invalid');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { step: Number.NaN }).status).toBe('invalid');
  });

  it('validates camera aspect ratio against the explicit option set', () => {
    const source = doc();
    source.items[0].card = { type: 'custom:frakon-camera-card', entity: 'camera.front', aspect_ratio: '16 / 9' };
    const fields = dashboardCanvasV2CardConfigFields(source.items[0].card);
    expect(fields.find((field) => field.key === 'aspect_ratio')).toMatchObject({ kind: 'select', options: ['16 / 9', '4 / 3', '1 / 1'] });
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { aspect_ratio: '4 / 3' }).status).toBe('committed');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { aspect_ratio: '21 / 9' }).status).toBe('invalid');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { entity: 'light.front' }).status).toBe('invalid');
  });

  it('rejects unsafe arbitrary config keys', () => {
    const result = patchDashboardCanvasV2CardConfig(doc(), 'light', { type: 'custom:other' });
    expect(result.status).toBe('invalid');
    expect(result.document.items[0].card.type).toBe('custom:frakon-light-card');
  });
});

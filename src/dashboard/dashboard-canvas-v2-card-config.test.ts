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

  it('keeps the primary entity required', () => {
    const result = patchDashboardCanvasV2CardConfig(doc(), 'light', { entity: '' });
    expect(result.status).toBe('invalid');
    expect(result.document.items[0].card.entity).toBe('light.placeholder');
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

  it('exposes all light-specific fields', () => {
    const fields = dashboardCanvasV2CardConfigFields(doc().items[0].card);
    expect(fields.map((field) => field.key)).toEqual([
      'entity', 'name', 'title', 'show_brightness', 'show_color_temperature', 'compact',
    ]);
  });

  it('allows light toggles and rejects another card type field', () => {
    const result = patchDashboardCanvasV2CardConfig(doc(), 'light', { show_brightness: true, show_color_temperature: false, compact: true });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].card).toMatchObject({ show_brightness: true, show_color_temperature: false, compact: true });
    expect(patchDashboardCanvasV2CardConfig(doc(), 'light', { show_volume: true }).status).toBe('invalid');
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

  it('validates sensor precision and compact options', () => {
    const source = doc();
    source.items[0].card = { type: 'custom:frakon-sensor-card', entity: 'sensor.temperature' };
    expect(dashboardCanvasV2CardConfigFields(source.items[0].card).map((field) => field.key)).toEqual([
      'entity', 'name', 'title', 'precision', 'unit', 'compact',
    ]);
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { precision: 2, unit: '°C', compact: true }).status).toBe('committed');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { precision: 2.5 }).status).toBe('invalid');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { precision: 7 }).status).toBe('invalid');
  });

  it('validates room sensor and light entity domains', () => {
    const source = doc();
    source.items[0].card = { type: 'custom:frakon-room-card', entity: 'sensor.room' };
    const fields = dashboardCanvasV2CardConfigFields(source.items[0].card);
    expect(fields.find((field) => field.key === 'temperature_entity')).toMatchObject({ kind: 'entity', domains: ['sensor'] });
    expect(fields.find((field) => field.key === 'humidity_entity')).toMatchObject({ kind: 'entity', domains: ['sensor'] });

    const result = patchDashboardCanvasV2CardConfig(source, 'light', {
      temperature_entity: 'sensor.room_temperature',
      humidity_entity: 'sensor.room_humidity',
      light_entities: ['light.ceiling', 'light.ceiling', 'light.lamp'],
    });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].card.light_entities).toEqual(['light.ceiling', 'light.lamp']);
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { temperature_entity: 'switch.not_temperature' }).status).toBe('invalid');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { humidity_entity: 'light.not_humidity' }).status).toBe('invalid');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { light_entities: ['switch.not_light'] }).status).toBe('invalid');
  });

  it('supports vehicle references with sensor and switch domain guards', () => {
    const source = doc();
    source.items[0].card = { type: 'custom:frakon-vehicle-card', entity: 'sensor.car_battery' };
    const fields = dashboardCanvasV2CardConfigFields(source.items[0].card);
    expect(fields.find((field) => field.key === 'range_entity')).toMatchObject({ domains: ['sensor'] });
    expect(fields.find((field) => field.key === 'charging_power_entity')).toMatchObject({ domains: ['sensor'] });
    expect(fields.find((field) => field.key === 'charging_switch_entity')).toMatchObject({ domains: ['switch'] });

    const result = patchDashboardCanvasV2CardConfig(source, 'light', {
      range_entity: 'sensor.car_range',
      charging_power_entity: 'sensor.car_power',
      charging_switch_entity: 'switch.car_charging',
    });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].card).toMatchObject({
      range_entity: 'sensor.car_range',
      charging_power_entity: 'sensor.car_power',
      charging_switch_entity: 'switch.car_charging',
    });
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { range_entity: 'device_tracker.car' }).status).toBe('invalid');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { charging_power_entity: 'number.car_power' }).status).toBe('invalid');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { charging_switch_entity: 'sensor.car_charging' }).status).toBe('invalid');
  });

  it('constrains Energy secondary references to sensors', () => {
    const source = doc();
    source.items[0].card = { type: 'custom:frakon-energy-card', entity: 'sensor.grid_power' };
    const fields = dashboardCanvasV2CardConfigFields(source.items[0].card);
    expect(fields.find((field) => field.key === 'energy_entity')).toMatchObject({ domains: ['sensor'] });
    expect(fields.find((field) => field.key === 'price_entity')).toMatchObject({ domains: ['sensor'] });
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { energy_entity: 'sensor.daily_energy', price_entity: 'sensor.energy_price' }).status).toBe('committed');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { energy_entity: 'switch.daily_energy' }).status).toBe('invalid');
    expect(patchDashboardCanvasV2CardConfig(source, 'light', { price_entity: 'input_number.price' }).status).toBe('invalid');
  });

  it('rejects unsafe arbitrary config keys', () => {
    const result = patchDashboardCanvasV2CardConfig(doc(), 'light', { type: 'custom:other' });
    expect(result.status).toBe('invalid');
    expect(result.document.items[0].card.type).toBe('custom:frakon-light-card');
  });
});

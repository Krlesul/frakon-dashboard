import { describe, expect, it } from 'vitest';
import { frakonCardCatalog } from './card-catalog';
import { dashboardCanvasV2CardConfigFields } from './dashboard-canvas-v2-card-config';

const expectedFields: Record<string, string[]> = {
  'custom:frakon-card': ['entity', 'name', 'title'],
  'custom:frakon-sensor-card': ['entity', 'name', 'title', 'precision', 'unit', 'compact'],
  'custom:frakon-room-card': ['entity', 'name', 'title', 'temperature_entity', 'humidity_entity', 'light_entities'],
  'custom:frakon-light-card': ['entity', 'name', 'title', 'show_brightness', 'show_color_temperature', 'compact'],
  'custom:frakon-climate-card': ['entity', 'name', 'title', 'step'],
  'custom:frakon-cover-card': ['entity', 'name', 'title', 'show_position'],
  'custom:frakon-camera-card': ['entity', 'name', 'title', 'show_state', 'aspect_ratio'],
  'custom:frakon-media-player-card': ['entity', 'name', 'title', 'show_volume'],
  'custom:frakon-energy-card': ['entity', 'name', 'title', 'energy_entity', 'price_entity', 'compact'],
  'custom:frakon-vehicle-card': ['entity', 'name', 'title', 'range_entity', 'charging_power_entity', 'charging_switch_entity'],
};

describe('native v2 FRAKON card editor coverage', () => {
  it('keeps every catalog card explicitly represented in the schema-driven inspector', () => {
    expect(frakonCardCatalog.map((template) => template.type).sort()).toEqual(Object.keys(expectedFields).sort());
    for (const template of frakonCardCatalog) {
      const config = template.createConfig();
      expect(dashboardCanvasV2CardConfigFields(config).map((field) => field.key), template.type).toEqual(expectedFields[template.type]);
    }
  });
});

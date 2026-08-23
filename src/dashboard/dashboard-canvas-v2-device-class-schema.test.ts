import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2CardConfigFields } from './dashboard-canvas-v2-card-config';

function field(type: string, key: string) {
  return dashboardCanvasV2CardConfigFields({ type, entity: 'sensor.placeholder' }).find((entry) => entry.key === key);
}

describe('dashboard canvas v2 contextual entity fields', () => {
  it('describes Room sensor purposes with Home Assistant device classes', () => {
    expect(field('custom:frakon-room-card', 'temperature_entity')).toMatchObject({ domains: ['sensor'], deviceClasses: ['temperature'] });
    expect(field('custom:frakon-room-card', 'humidity_entity')).toMatchObject({ domains: ['sensor'], deviceClasses: ['humidity'] });
  });

  it('describes Vehicle range and charging power with contextual device classes', () => {
    expect(field('custom:frakon-vehicle-card', 'range_entity')).toMatchObject({ domains: ['sensor'], deviceClasses: ['distance'] });
    expect(field('custom:frakon-vehicle-card', 'charging_power_entity')).toMatchObject({ domains: ['sensor'], deviceClasses: ['power'] });
    expect(field('custom:frakon-vehicle-card', 'charging_switch_entity')).toMatchObject({ domains: ['switch'] });
  });

  it('describes Energy references with energy and monetary device classes', () => {
    expect(field('custom:frakon-energy-card', 'energy_entity')).toMatchObject({ domains: ['sensor'], deviceClasses: ['energy'] });
    expect(field('custom:frakon-energy-card', 'price_entity')).toMatchObject({ domains: ['sensor'], deviceClasses: ['monetary'] });
  });
});

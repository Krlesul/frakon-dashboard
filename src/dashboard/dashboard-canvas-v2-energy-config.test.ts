import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2CardConfigFields, patchDashboardCanvasV2CardConfig } from './dashboard-canvas-v2-card-config';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'energy',
    title: 'Energy',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1200, minHeight: 600, snap: { enabled: true, size: 8 } },
    items: [{
      id: 'energy-card',
      card: { type: 'custom:frakon-energy-card', entity: 'sensor.house_power' },
      frame: { x: 24, y: 24, width: 320, height: 220 },
    }],
  };
}

describe('native v2 Energy card config', () => {
  it('exposes all Energy-specific fields through the schema-driven inspector', () => {
    expect(dashboardCanvasV2CardConfigFields(document().items[0].card).map((field) => field.key)).toEqual([
      'entity', 'name', 'title', 'energy_entity', 'price_entity', 'compact',
    ]);
  });

  it('patches Energy metrics atomically without changing type or geometry', () => {
    const source = document();
    const result = patchDashboardCanvasV2CardConfig(source, 'energy-card', {
      energy_entity: 'sensor.house_energy_today',
      price_entity: 'sensor.energy_price',
      compact: true,
    });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].card).toMatchObject({
      type: 'custom:frakon-energy-card',
      entity: 'sensor.house_power',
      energy_entity: 'sensor.house_energy_today',
      price_entity: 'sensor.energy_price',
      compact: true,
    });
    expect(result.document.items[0].frame).toEqual(source.items[0].frame);
  });

  it('still rejects unrelated unsafe config keys', () => {
    const result = patchDashboardCanvasV2CardConfig(document(), 'energy-card', { show_volume: true });
    expect(result.status).toBe('invalid');
  });
});

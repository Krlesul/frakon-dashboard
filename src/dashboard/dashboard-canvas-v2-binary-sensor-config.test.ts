import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2CardConfigFields, patchDashboardCanvasV2CardConfig } from './dashboard-canvas-v2-card-config';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'security',
    title: 'Security',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1200, minHeight: 600, snap: { enabled: true, size: 8 } },
    items: [{
      id: 'door',
      card: { type: 'custom:frakon-binary-sensor-card', entity: 'binary_sensor.front_door', show_state: true },
      frame: { x: 0, y: 0, width: 260, height: 160 },
    }],
  };
}

describe('native v2 binary sensor card config', () => {
  it('exposes the binary_sensor entity and state visibility fields', () => {
    const fields = dashboardCanvasV2CardConfigFields(document().items[0].card);
    expect(fields.map((field) => field.key)).toEqual(['entity', 'name', 'title', 'show_state']);
    expect(fields[0]).toMatchObject({ kind: 'entity', required: true, domains: ['binary_sensor'] });
  });

  it('accepts binary_sensor entities and rejects other domains', () => {
    expect(patchDashboardCanvasV2CardConfig(document(), 'door', { entity: 'binary_sensor.window' }).status).toBe('committed');
    const invalid = patchDashboardCanvasV2CardConfig(document(), 'door', { entity: 'sensor.window' });
    expect(invalid.status).toBe('invalid');
    expect(invalid.reason).toContain('binary_sensor.*');
  });

  it('allows show_state as the only binary-sensor-specific option', () => {
    expect(patchDashboardCanvasV2CardConfig(document(), 'door', { show_state: false }).status).toBe('committed');
    expect(patchDashboardCanvasV2CardConfig(document(), 'door', { show_volume: true }).status).toBe('invalid');
  });
});

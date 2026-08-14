import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2CardConfigFields, patchDashboardCanvasV2CardConfig } from './dashboard-canvas-v2-card-config';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'climate',
    title: 'Climate',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1200, minHeight: 600, snap: { enabled: true, size: 8 } },
    items: [{
      id: 'fan',
      card: { type: 'custom:frakon-fan-card', entity: 'fan.office', show_percentage: true },
      frame: { x: 0, y: 0, width: 260, height: 180 },
    }],
  };
}

describe('native v2 fan card config', () => {
  it('requires a fan entity and exposes the percentage option', () => {
    const fields = dashboardCanvasV2CardConfigFields(document().items[0].card);
    expect(fields[0]).toMatchObject({ key: 'entity', kind: 'entity', required: true, domains: ['fan'] });
    expect(fields).toContainEqual({ key: 'show_percentage', kind: 'boolean' });
    expect(patchDashboardCanvasV2CardConfig(document(), 'fan', { entity: 'fan.bedroom' }).status).toBe('committed');
    const hidden = patchDashboardCanvasV2CardConfig(document(), 'fan', { show_percentage: false });
    expect(hidden.status).toBe('committed');
    expect(hidden.document.items[0].card.show_percentage).toBe(false);
  });

  it('rejects other entity domains and non-boolean percentage flags', () => {
    const invalidEntity = patchDashboardCanvasV2CardConfig(document(), 'fan', { entity: 'switch.fan' });
    expect(invalidEntity.status).toBe('invalid');
    expect(invalidEntity.reason).toContain('fan.*');

    const invalidFlag = patchDashboardCanvasV2CardConfig(document(), 'fan', { show_percentage: 'yes' });
    expect(invalidFlag.status).toBe('invalid');
    expect(invalidFlag.reason).toContain('boolean');
  });
});

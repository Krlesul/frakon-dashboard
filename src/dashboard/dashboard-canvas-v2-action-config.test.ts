import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2CardConfigFields, patchDashboardCanvasV2CardConfig } from './dashboard-canvas-v2-card-config';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'actions',
    title: 'Actions',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1200, minHeight: 600, snap: { enabled: true, size: 8 } },
    items: [{
      id: 'action',
      card: { type: 'custom:frakon-action-card', entity: 'button.restart', show_state: false },
      frame: { x: 0, y: 0, width: 260, height: 160 },
    }],
  };
}

describe('native v2 action card config', () => {
  it('advertises only the supported action entity domains', () => {
    const fields = dashboardCanvasV2CardConfigFields(document().items[0].card);
    expect(fields[0]).toMatchObject({
      key: 'entity',
      kind: 'entity',
      required: true,
      domains: ['button', 'input_button', 'script', 'scene'],
    });
    expect(fields.map((field) => field.key)).toEqual(['entity', 'name', 'title', 'show_state']);
  });

  it('accepts supported action domains', () => {
    const cases = [
      ['button.restart', 'unchanged'],
      ['input_button.good_night', 'committed'],
      ['script.movie', 'committed'],
      ['scene.evening', 'committed'],
    ] as const;
    for (const [entity, status] of cases) {
      expect(patchDashboardCanvasV2CardConfig(document(), 'action', { entity }).status).toBe(status);
    }
  });

  it('rejects domains with different control semantics', () => {
    const result = patchDashboardCanvasV2CardConfig(document(), 'action', { entity: 'switch.pump' });
    expect(result.status).toBe('invalid');
    expect(result.reason).toContain('button.*');
  });
});

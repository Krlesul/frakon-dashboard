import { describe, expect, it } from 'vitest';
import { frakonCardCatalog } from './card-catalog';
import { dashboardCanvasV2CardConfigFields, patchDashboardCanvasV2CardConfig } from './dashboard-canvas-v2-card-config';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function document(type: string, entity: string): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1000, minHeight: 500, snap: { enabled: true, size: 8 } },
    items: [{ id: 'item', card: { type, entity }, frame: { x: 0, y: 0, width: 240, height: 160 } }],
  };
}

describe('Switch and Lock card catalog integration', () => {
  it('exposes both cards in relevant palette categories', () => {
    expect(frakonCardCatalog.find((entry) => entry.type === 'custom:frakon-switch-card')).toMatchObject({ category: 'general' });
    expect(frakonCardCatalog.find((entry) => entry.type === 'custom:frakon-lock-card')).toMatchObject({ category: 'security' });
  });

  it('uses strict primary domains and a typed show-state option', () => {
    const switchFields = dashboardCanvasV2CardConfigFields({ type: 'custom:frakon-switch-card', entity: 'switch.pump' });
    const lockFields = dashboardCanvasV2CardConfigFields({ type: 'custom:frakon-lock-card', entity: 'lock.front_door' });
    expect(switchFields.find((field) => field.key === 'entity')).toMatchObject({ domains: ['switch'], required: true });
    expect(lockFields.find((field) => field.key === 'entity')).toMatchObject({ domains: ['lock'], required: true });
    expect(switchFields.find((field) => field.key === 'show_state')).toMatchObject({ kind: 'boolean' });
    expect(lockFields.find((field) => field.key === 'show_state')).toMatchObject({ kind: 'boolean' });
  });

  it('rejects cross-domain entity assignments', () => {
    expect(patchDashboardCanvasV2CardConfig(document('custom:frakon-switch-card', 'switch.pump'), 'item', { entity: 'lock.front_door' }).status).toBe('invalid');
    expect(patchDashboardCanvasV2CardConfig(document('custom:frakon-lock-card', 'lock.front_door'), 'item', { entity: 'switch.pump' }).status).toBe('invalid');
  });
});

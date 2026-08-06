import { describe, expect, it } from 'vitest';
import { buildDashboardIntelligenceContextFromHass, extractDashboardItemEntityIds } from './dashboard-intelligence-signal-bridge';
import type { FrakonDashboardDocument } from '../dashboard/layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 80,
  gap: 12,
  items: [
    {
      id: 'gate',
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      card: {
        type: 'custom:frakon-cover-card',
        entity: 'cover.gate',
        entities: [{ entity: 'binary_sensor.gate_contact' }],
      },
    },
  ],
};

describe('Home Assistant Dashboard Intelligence signal bridge', () => {
  it('extracts nested entity identifiers from card configuration', () => {
    expect(extractDashboardItemEntityIds(document.items[0]!)).toEqual([
      'binary_sensor.gate_contact',
      'cover.gate',
    ]);
  });

  it('builds an urgent automatic context from live hass states and interactions', () => {
    const now = new Date(2026, 7, 6, 20, 0, 0).getTime();
    const context = buildDashboardIntelligenceContextFromHass(document, {
      states: {
        'cover.gate': {
          entity_id: 'cover.gate',
          state: 'open',
          attributes: {},
        },
      },
    }, {
      device: 'tablet',
      now,
      tracker: {
        snapshot: () => [
          { itemId: 'gate', timestamp: now - 1000 },
          { itemId: 'gate', timestamp: now - 2000 },
        ],
      },
    });

    expect(context.device).toBe('tablet');
    expect(context.daypart).toBe('evening');
    expect(context.usage).toEqual([
      expect.objectContaining({ itemId: 'gate', interactions30d: 2, urgent: true }),
    ]);
  });
});

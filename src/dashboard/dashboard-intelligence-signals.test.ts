import { describe, expect, it } from 'vitest';
import {
  buildAutomaticDashboardIntelligenceContext,
  countDashboardInteractions,
  deriveDashboardDaypart,
  deriveDashboardItemUrgency,
} from './dashboard-intelligence-signals';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 80,
  gap: 12,
  items: [
    { id: 'gate', x: 0, y: 0, w: 3, h: 2, card: { type: 'custom:frakon-cover-card', entity: 'cover.gate' } },
    { id: 'battery', x: 3, y: 0, w: 3, h: 2, card: { type: 'custom:frakon-sensor-card', entity: 'sensor.lock_battery' } },
  ],
};

describe('Dashboard Intelligence automatic signals', () => {
  it('derives a deterministic daypart from local time', () => {
    expect(deriveDashboardDaypart(new Date(2026, 7, 6, 7, 0).getTime())).toBe('morning');
    expect(deriveDashboardDaypart(new Date(2026, 7, 6, 14, 0).getTime())).toBe('day');
    expect(deriveDashboardDaypart(new Date(2026, 7, 6, 20, 0).getTime())).toBe('evening');
    expect(deriveDashboardDaypart(new Date(2026, 7, 6, 2, 0).getTime())).toBe('night');
  });

  it('counts only interactions from the last thirty days', () => {
    const now = 1_000_000_000;
    const signals = countDashboardInteractions([
      { itemId: 'gate', timestamp: now - 1_000 },
      { itemId: 'gate', timestamp: now - 2_000 },
      { itemId: 'gate', timestamp: now - 31 * 24 * 60 * 60 * 1000 },
      { itemId: 'camera', timestamp: now - 500 },
      { itemId: 'future', timestamp: now + 1 },
    ], now);

    expect(signals).toEqual([
      { itemId: 'camera', interactions30d: 1, lastUsedAt: now - 500 },
      { itemId: 'gate', interactions30d: 2, lastUsedAt: now - 1_000 },
    ]);
  });

  it('marks safety, availability and battery states as urgent', () => {
    expect(deriveDashboardItemUrgency(document.items[0]!, {
      'cover.gate': { entity_id: 'cover.gate', state: 'open' },
    }).urgent).toBe(true);

    const battery = deriveDashboardItemUrgency(document.items[1]!, {
      'sensor.lock_battery': {
        entity_id: 'sensor.lock_battery',
        state: '12',
        attributes: { device_class: 'battery', unit_of_measurement: '%' },
      },
    });
    expect(battery.urgent).toBe(true);
    expect(battery.reasons[0]).toContain('low battery');
  });

  it('keeps the critical reason and source entity for Emergency Focus', () => {
    const smokeItem = { id: 'smoke', x: 0, y: 0, w: 3, h: 2, card: { type: 'custom:frakon-sensor-card', entity: 'binary_sensor.kitchen_smoke' } };
    const urgency = deriveDashboardItemUrgency(smokeItem, {
      'binary_sensor.kitchen_smoke': {
        entity_id: 'binary_sensor.kitchen_smoke',
        state: 'on',
        attributes: { device_class: 'smoke' },
      },
    });

    expect(urgency.severity).toBe('critical');
    expect(urgency.sourceEntityIds).toEqual(['binary_sensor.kitchen_smoke']);
    expect(urgency.reasons[0]).toContain('active smoke condition');
  });

  it('builds a complete context from interaction and entity signals', () => {
    const now = new Date(2026, 7, 6, 20, 0).getTime();
    const context = buildAutomaticDashboardIntelligenceContext(document, {
      device: 'wall',
      now,
      interactions: [
        { itemId: 'gate', timestamp: now - 1_000 },
        { itemId: 'gate', timestamp: now - 2_000 },
      ],
      states: {
        'cover.gate': { entity_id: 'cover.gate', state: 'open' },
        'sensor.lock_battery': { entity_id: 'sensor.lock_battery', state: '80', attributes: { device_class: 'battery' } },
      },
    });

    expect(context.daypart).toBe('evening');
    expect(context.usage).toEqual([
      expect.objectContaining({ itemId: 'gate', interactions30d: 2, urgent: true, sourceEntityIds: ['cover.gate'] }),
      expect.objectContaining({ itemId: 'battery', interactions30d: 0, urgent: false }),
    ]);
  });
});

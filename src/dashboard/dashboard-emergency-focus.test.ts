import { describe, expect, it } from 'vitest';
import { createDashboardEmergencyFocusState } from './dashboard-emergency-focus';
import type { DashboardIntelligenceContext } from './dashboard-intelligence';
import type { FrakonDashboardDocument } from './layout-model';

const document = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  items: [
    { id: 'smoke', x: 4, y: 2, w: 4, h: 3, card: { type: 'sensor' } },
    { id: 'gate', x: 0, y: 0, w: 4, h: 2, card: { type: 'cover' } },
  ],
} satisfies FrakonDashboardDocument;

it('focuses only active critical cards without changing the document', () => {
  const context: DashboardIntelligenceContext = {
    device: 'wall',
    usage: [
      { itemId: 'smoke', urgent: true, severity: 'critical' },
      { itemId: 'gate', urgent: true, severity: 'warning' },
    ],
  };
  const state = createDashboardEmergencyFocusState(document, context);
  expect(state.active).toBe(true);
  expect(state.targets.map((target) => target.itemId)).toEqual(['smoke']);
  expect(state.primary?.item).not.toBe(document.items[0]);
  expect(document.items[0]?.x).toBe(4);
});

describe('inactive focus', () => {
  it('returns no target when no critical signal is active', () => {
    expect(createDashboardEmergencyFocusState(document, { device: 'desktop', usage: [] })).toEqual({ active: false, targets: [], primary: undefined });
  });
});

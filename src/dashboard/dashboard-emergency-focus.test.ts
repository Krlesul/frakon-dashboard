import { describe, expect, it } from 'vitest';
import {
  createDashboardEmergencyFocusState,
  dashboardEmergencyFocusIndex,
  dashboardEmergencyFocusTargetAt,
  nextDashboardEmergencyFocusTarget,
} from './dashboard-emergency-focus';
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
    { id: 'water', x: 8, y: 0, w: 4, h: 2, card: { type: 'sensor' } },
  ],
} satisfies FrakonDashboardDocument;

it('focuses only active critical cards without changing the document', () => {
  const context: DashboardIntelligenceContext = {
    device: 'wall',
    usage: [
      { itemId: 'smoke', urgent: true, severity: 'critical' },
      { itemId: 'gate', urgent: true, severity: 'warning' },
      { itemId: 'water', urgent: true, severity: 'critical' },
    ],
  };
  const state = createDashboardEmergencyFocusState(document, context);
  expect(state.active).toBe(true);
  expect(state.targets.map((target) => target.itemId)).toEqual(['water', 'smoke']);
  expect(state.primary?.itemId).toBe('water');
  expect(state.primary?.item).not.toBe(document.items[2]);
  expect(document.items[0]?.x).toBe(4);
});

describe('Emergency Focus navigation', () => {
  const focus = createDashboardEmergencyFocusState(document, {
    device: 'wall',
    usage: [
      { itemId: 'smoke', urgent: true, severity: 'critical' },
      { itemId: 'water', urgent: true, severity: 'critical' },
    ],
  });

  it('resolves the current focus index and falls back to the primary target', () => {
    expect(dashboardEmergencyFocusIndex(focus, 'smoke')).toBe(1);
    expect(dashboardEmergencyFocusIndex(focus, 'missing')).toBe(0);
    expect(dashboardEmergencyFocusIndex(focus, undefined)).toBe(0);
  });

  it('wraps target lookup in both directions', () => {
    expect(dashboardEmergencyFocusTargetAt(focus, 0)?.itemId).toBe('water');
    expect(dashboardEmergencyFocusTargetAt(focus, 2)?.itemId).toBe('water');
    expect(dashboardEmergencyFocusTargetAt(focus, -1)?.itemId).toBe('smoke');
  });

  it('moves to the previous and next critical target', () => {
    expect(nextDashboardEmergencyFocusTarget(focus, 'water', 1)?.itemId).toBe('smoke');
    expect(nextDashboardEmergencyFocusTarget(focus, 'water', -1)?.itemId).toBe('smoke');
    expect(nextDashboardEmergencyFocusTarget(focus, 'smoke', 1)?.itemId).toBe('water');
  });
});

describe('inactive focus', () => {
  it('returns no target when no critical signal is active', () => {
    expect(createDashboardEmergencyFocusState(document, { device: 'desktop', usage: [] })).toEqual({ active: false, targets: [], primary: undefined });
    expect(dashboardEmergencyFocusIndex(undefined, undefined)).toBe(-1);
    expect(dashboardEmergencyFocusTargetAt(undefined, 0)).toBeUndefined();
    expect(nextDashboardEmergencyFocusTarget(undefined, undefined)).toBeUndefined();
  });
});

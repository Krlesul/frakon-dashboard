import { describe, expect, it } from 'vitest';
import { createDashboardEmergencyFocusState, dashboardEmergencyFocusSignature } from './dashboard-emergency-focus';
import { acknowledgeDashboardEmergencyHistory, dashboardEmergencyDuration, updateDashboardEmergencyHistory } from './dashboard-emergency-history';
import type { DashboardIntelligenceContext } from './dashboard-intelligence';
import type { FrakonDashboardDocument } from './layout-model';

const document = {
  version: 1, id: 'home', title: 'Home', breakpoint: 'desktop', columns: 12, rowHeight: 48, gap: 12,
  items: [{ id: 'smoke', x: 0, y: 0, w: 4, h: 2, card: { type: 'sensor' } }],
} satisfies FrakonDashboardDocument;

const criticalContext: DashboardIntelligenceContext = {
  device: 'wall',
  usage: [{ itemId: 'smoke', urgent: true, severity: 'critical', urgencyReasons: ['binary_sensor.smoke reports an active smoke condition'], sourceEntityIds: ['binary_sensor.smoke'], sourceEntityLabels: { 'binary_sensor.smoke': 'Kouřové čidlo kuchyň' } }],
};

describe('Emergency Focus history', () => {
  it('records start, acknowledgement, end and duration', () => {
    const focus = createDashboardEmergencyFocusState(document, criticalContext);
    const signature = dashboardEmergencyFocusSignature(focus.targets[0]!);
    let history = updateDashboardEmergencyHistory({ active: [], recent: [] }, focus, 1_000);
    expect(history.active[0]?.startedAt).toBe(1_000);
    expect(history.active[0]?.sourceEntityLabels).toEqual({ 'binary_sensor.smoke': 'Kouřové čidlo kuchyň' });

    history = acknowledgeDashboardEmergencyHistory(history, signature, 1_500);
    expect(history.active[0]?.acknowledgedAt).toBe(1_500);

    history = updateDashboardEmergencyHistory(history, { active: false, targets: [] }, 4_000);
    expect(history.active).toHaveLength(0);
    expect(history.recent[0]).toMatchObject({ startedAt: 1_000, acknowledgedAt: 1_500, endedAt: 4_000, durationMs: 3_000, sourceEntityLabels: { 'binary_sensor.smoke': 'Kouřové čidlo kuchyň' } });
  });

  it('does not restart the same live event on repeated updates', () => {
    const focus = createDashboardEmergencyFocusState(document, criticalContext);
    let history = updateDashboardEmergencyHistory({ active: [], recent: [] }, focus, 1_000);
    history = updateDashboardEmergencyHistory(history, focus, 2_000);
    expect(history.active[0]?.startedAt).toBe(1_000);
    expect(dashboardEmergencyDuration(history.active[0]!, 2_500)).toBe(1_500);
  });
});

import { describe, expect, it } from 'vitest';
import { exportDashboardEmergencyHistory, filterDashboardEmergencyHistory } from './dashboard-emergency-history-tools';
import type { DashboardEmergencyHistoryState } from './dashboard-emergency-history';

const history: DashboardEmergencyHistoryState = {
  active: [
    { signature:'smoke', itemId:'smoke', sourceEntityIds:['binary_sensor.smoke'], reasons:['binary_sensor.smoke reports an active smoke condition'], startedAt:100, acknowledgedAt:120 },
  ],
  recent: [
    { signature:'water', itemId:'water', sourceEntityIds:['binary_sensor.water'], reasons:['binary_sensor.water reports an active moisture condition'], startedAt:10, endedAt:40, durationMs:30 },
    { signature:'alarm', itemId:'alarm', sourceEntityIds:['alarm_control_panel.home'], reasons:['alarm_control_panel.home is in alarm state triggered'], startedAt:50, acknowledgedAt:55, endedAt:80, durationMs:30 },
  ],
};

describe('Emergency Focus history tools', () => {
  it('filters by kind and acknowledgement state', () => {
    expect(filterDashboardEmergencyHistory(history, { kind:'water' }).recent.map((entry)=>entry.itemId)).toEqual(['water']);
    const acknowledged = filterDashboardEmergencyHistory(history, { acknowledgement:'acknowledged' });
    expect([...acknowledged.active, ...acknowledged.recent].map((entry)=>entry.itemId)).toEqual(['smoke','alarm']);
  });

  it('filters by time range using event end or start time', () => {
    expect(filterDashboardEmergencyHistory(history, { from:45, to:90 }).recent.map((entry)=>entry.itemId)).toEqual(['alarm']);
  });

  it('exports a versioned sanitized audit payload', () => {
    expect(exportDashboardEmergencyHistory(history, 999)).toMatchObject({ format:'frakon-dashboard-emergency-history', version:1, exportedAt:999 });
  });
});

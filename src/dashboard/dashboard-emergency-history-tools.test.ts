import { describe, expect, it } from 'vitest';
import {
  exportDashboardEmergencyHistory,
  filterDashboardEmergencyHistory,
  mergeDashboardEmergencyHistory,
  parseDashboardEmergencyHistoryImport,
  serializeDashboardEmergencyHistoryExport,
} from './dashboard-emergency-history-tools';
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

  it('rejects invalid JSON and unsupported versions', () => {
    expect(parseDashboardEmergencyHistoryImport('{', history)).toEqual({ ok:false, error:'invalid-json' });
    expect(parseDashboardEmergencyHistoryImport(JSON.stringify({ format:'other', version:1, history:{} }), history)).toEqual({ ok:false, error:'invalid-format' });
    expect(parseDashboardEmergencyHistoryImport(JSON.stringify({ format:'frakon-dashboard-emergency-history', version:2, history:{} }), history)).toEqual({ ok:false, error:'unsupported-version' });
  });

  it('imports exported history without replacing live active events', () => {
    const imported: DashboardEmergencyHistoryState = {
      active: [
        { signature:'smoke', itemId:'old-smoke', sourceEntityIds:['binary_sensor.old_smoke'], reasons:['old'], startedAt:1 },
        { signature:'gas', itemId:'gas', sourceEntityIds:['binary_sensor.gas'], reasons:['binary_sensor.gas reports an active gas condition'], startedAt:5 },
      ],
      recent: [
        { signature:'water', itemId:'water-imported', sourceEntityIds:['binary_sensor.water'], reasons:['binary_sensor.water reports an active moisture condition'], startedAt:20, endedAt:90, durationMs:70 },
      ],
    };
    const result = parseDashboardEmergencyHistoryImport(serializeDashboardEmergencyHistoryExport(imported, 500), history, 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.history.active).toEqual(history.active);
    expect(result.history.recent.some((entry)=>entry.signature==='gas' && entry.endedAt===5)).toBe(true);
    expect(result.history.recent.find((entry)=>entry.signature==='water')?.itemId).toBe('water-imported');
    expect(result.history.recent.some((entry)=>entry.signature==='smoke')).toBe(false);
  });

  it('deduplicates imported and local recent entries by signature', () => {
    const merged = mergeDashboardEmergencyHistory(history, {
      active: [],
      recent: [
        { signature:'alarm', itemId:'new-alarm', sourceEntityIds:[], reasons:['alarm_control_panel.home is in alarm state triggered'], startedAt:60, endedAt:120, durationMs:60 },
      ],
    });
    expect(merged.recent.filter((entry)=>entry.signature==='alarm')).toHaveLength(1);
    expect(merged.recent.find((entry)=>entry.signature==='alarm')?.itemId).toBe('new-alarm');
  });
});

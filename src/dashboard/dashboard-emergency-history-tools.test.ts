import { describe, expect, it } from 'vitest';
import {
  buildDashboardEmergencyTimeline,
  calculateDashboardEmergencyHistoryStats,
  calculateDashboardEmergencyHistoryTrend,
  calculateDashboardEmergencyKindBreakdown,
  exportDashboardEmergencyHistory,
  filterDashboardEmergencyHistory,
  mergeDashboardEmergencyHistory,
  parseDashboardEmergencyHistoryImport,
  selectDashboardEmergencyHistoryDetails,
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

  it('selects drill-down details by type, time range and their combination', () => {
    expect(selectDashboardEmergencyHistoryDetails(history, { kind:'smoke' }).map((entry)=>entry.itemId)).toEqual(['smoke']);
    expect(selectDashboardEmergencyHistoryDetails(history, { startAt:40, endAt:101 }).map((entry)=>entry.itemId)).toEqual(['smoke','alarm']);
    expect(selectDashboardEmergencyHistoryDetails(history, { kind:'alarm', startAt:40, endAt:60 }).map((entry)=>entry.itemId)).toEqual(['alarm']);
  });

  it('calculates audit statistics including acknowledgement latency', () => {
    expect(calculateDashboardEmergencyHistoryStats(history, 130)).toEqual({
      totalEvents:3,
      activeEvents:1,
      closedEvents:2,
      acknowledgedEvents:2,
      acknowledgementRate:2/3,
      mostFrequentKind:'alarm',
      mostFrequentKindCount:1,
      averageDurationMs:30,
      averageAcknowledgementMs:12.5,
    });
  });

  it('returns empty-safe audit statistics', () => {
    expect(calculateDashboardEmergencyHistoryStats({ active:[], recent:[] }, 100)).toEqual({
      totalEvents:0,
      activeEvents:0,
      closedEvents:0,
      acknowledgedEvents:0,
      acknowledgementRate:0,
      mostFrequentKind:undefined,
      mostFrequentKindCount:0,
      averageDurationMs:undefined,
      averageAcknowledgementMs:undefined,
    });
  });

  it('calculates improving and worsening period trends', () => {
    const day = 24 * 60 * 60 * 1000;
    const now = 100 * day;
    const trendHistory: DashboardEmergencyHistoryState = {
      active: [],
      recent: [
        { signature:'a', itemId:'a', sourceEntityIds:[], reasons:['generic'], startedAt:now-day, endedAt:now-day+1 },
        { signature:'b', itemId:'b', sourceEntityIds:[], reasons:['generic'], startedAt:now-2*day, endedAt:now-2*day+1 },
        { signature:'c', itemId:'c', sourceEntityIds:[], reasons:['generic'], startedAt:now-8*day, endedAt:now-8*day+1 },
        { signature:'d', itemId:'d', sourceEntityIds:[], reasons:['generic'], startedAt:now-9*day, endedAt:now-9*day+1 },
        { signature:'e', itemId:'e', sourceEntityIds:[], reasons:['generic'], startedAt:now-10*day, endedAt:now-10*day+1 },
      ],
    };
    expect(calculateDashboardEmergencyHistoryTrend(trendHistory, 7, now)).toMatchObject({ currentCount:2, previousCount:3, change:-1, direction:'improving' });
    expect(calculateDashboardEmergencyHistoryTrend(trendHistory, 14, now)).toMatchObject({ currentCount:5, previousCount:0, change:5, changeRate:undefined, direction:'worsening' });
  });

  it('uses deterministic boundaries for trend windows', () => {
    const day = 24 * 60 * 60 * 1000;
    const now = 20 * day;
    const trendHistory: DashboardEmergencyHistoryState = {
      active: [],
      recent: [
        { signature:'current-edge', itemId:'current-edge', sourceEntityIds:[], reasons:['generic'], startedAt:now-7*day, endedAt:now-7*day },
        { signature:'previous-edge', itemId:'previous-edge', sourceEntityIds:[], reasons:['generic'], startedAt:now-14*day, endedAt:now-14*day },
      ],
    };
    expect(calculateDashboardEmergencyHistoryTrend(trendHistory, 7, now)).toMatchObject({ currentCount:1, previousCount:1, change:0, changeRate:0, direction:'stable' });
  });

  it('builds a sorted event-kind breakdown with shares', () => {
    const breakdown = calculateDashboardEmergencyKindBreakdown({
      active: [],
      recent: [
        { signature:'w1', itemId:'w1', sourceEntityIds:[], reasons:['binary_sensor.water reports an active moisture condition'], startedAt:1 },
        { signature:'w2', itemId:'w2', sourceEntityIds:[], reasons:['binary_sensor.water reports an active moisture condition'], startedAt:2 },
        { signature:'s1', itemId:'s1', sourceEntityIds:[], reasons:['binary_sensor.smoke reports an active smoke condition'], startedAt:3 },
      ],
    });
    expect(breakdown).toEqual([
      { kind:'water', count:2, share:2/3 },
      { kind:'smoke', count:1, share:1/3 },
    ]);
  });

  it('builds fixed daily timeline buckets including empty days', () => {
    const day = 24 * 60 * 60 * 1000;
    const now = new Date(2026, 7, 7, 12, 0, 0).getTime();
    const todayStart = new Date(2026, 7, 7, 0, 0, 0).getTime();
    const timeline = buildDashboardEmergencyTimeline({
      active: [],
      recent: [
        { signature:'today-water', itemId:'today-water', sourceEntityIds:[], reasons:['binary_sensor.water reports an active moisture condition'], startedAt:todayStart+1000 },
        { signature:'two-days-smoke', itemId:'two-days-smoke', sourceEntityIds:[], reasons:['binary_sensor.smoke reports an active smoke condition'], startedAt:todayStart-2*day+1000 },
      ],
    }, 3, now);
    expect(timeline).toHaveLength(3);
    expect(timeline.map((bucket)=>bucket.count)).toEqual([1,0,1]);
    expect(timeline[0]?.kinds.smoke).toBe(1);
    expect(timeline[2]?.kinds.water).toBe(1);
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
    expect(result.history.active).toHaveLength(1);
    expect(result.history.active[0]).toMatchObject(history.active[0]!);
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

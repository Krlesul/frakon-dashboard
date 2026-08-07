import { describe, expect, it } from 'vitest';
import {
  clearDashboardEmergencyHistory,
  loadDashboardEmergencyHistory,
  saveDashboardEmergencyHistory,
  sanitizeHistory,
  type DashboardEmergencyHistoryStorageLike,
} from './dashboard-emergency-history-storage';

class MemoryStorage implements DashboardEmergencyHistoryStorageLike {
  private data = new Map<string,string>();
  getItem(key:string){ return this.data.get(key) ?? null; }
  setItem(key:string,value:string){ this.data.set(key,value); }
  removeItem(key:string){ this.data.delete(key); }
}

describe('Emergency Focus history persistence', () => {
  it('round-trips valid history and limits recent entries', () => {
    const storage = new MemoryStorage();
    const saved = saveDashboardEmergencyHistory(storage, {
      active: [{ signature:'active', itemId:'smoke', sourceEntityIds:['binary_sensor.smoke'], sourceEntityLabels:{'binary_sensor.smoke':'Kouřové čidlo kuchyň'}, reasons:['smoke'], startedAt:100 }],
      recent: [
        { signature:'old', itemId:'old', sourceEntityIds:[], reasons:[], startedAt:10, endedAt:20, durationMs:10 },
        { signature:'new', itemId:'new', sourceEntityIds:[], reasons:[], startedAt:30, endedAt:40, durationMs:10 },
      ],
    }, { recentLimit:1 });
    expect(saved.active[0]?.sourceEntityLabels).toEqual({'binary_sensor.smoke':'Kouřové čidlo kuchyň'});
    expect(saved.recent.map((entry)=>entry.signature)).toEqual(['new']);
    expect(loadDashboardEmergencyHistory(storage, { recentLimit:1 })).toEqual(saved);
  });

  it('ignores corrupted storage instead of throwing', () => {
    const storage = new MemoryStorage();
    storage.setItem('frakon.dashboard.emergency-history.v1', '{bad json');
    expect(loadDashboardEmergencyHistory(storage)).toEqual({ active:[], recent:[] });
  });

  it('sanitizes malformed entries and recomputes durations', () => {
    expect(sanitizeHistory({
      active:[{ signature:'', itemId:'bad', startedAt:1 }],
      recent:[{ signature:'ok', itemId:'water', startedAt:100, endedAt:160, durationMs:999, sourceEntityIds:['sensor.water', 4], sourceEntityLabels:{'sensor.water':' Water sensor ',bad:7}, reasons:['leak'] }],
    })).toEqual({
      active:[],
      recent:[{ signature:'ok', itemId:'water', startedAt:100, endedAt:160, durationMs:60, acknowledgedAt:undefined, sourceEntityIds:['sensor.water'], sourceEntityLabels:{'sensor.water':'Water sensor'}, reasons:['leak'] }],
    });
  });

  it('clears persisted history', () => {
    const storage = new MemoryStorage();
    saveDashboardEmergencyHistory(storage, { active:[], recent:[{ signature:'x', itemId:'x', sourceEntityIds:[], reasons:[], startedAt:1, endedAt:2, durationMs:1 }] });
    clearDashboardEmergencyHistory(storage);
    expect(loadDashboardEmergencyHistory(storage)).toEqual({ active:[], recent:[] });
  });
});

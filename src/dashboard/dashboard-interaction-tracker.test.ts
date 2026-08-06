import { describe, expect, it } from 'vitest';
import {
  DashboardInteractionTracker,
  LocalDashboardInteractionStorage,
  type DashboardInteractionStorage,
} from './dashboard-interaction-tracker';
import type { DashboardInteractionRecord } from './dashboard-intelligence-signals';

class MemoryStorage implements DashboardInteractionStorage {
  records: DashboardInteractionRecord[] = [];
  load(): DashboardInteractionRecord[] { return structuredClone(this.records); }
  save(records: DashboardInteractionRecord[]): void { this.records = structuredClone(records); }
}

describe('DashboardInteractionTracker', () => {
  it('records interactions and persists them', () => {
    const storage = new MemoryStorage();
    const tracker = new DashboardInteractionTracker(storage, 1_000, 10);

    tracker.record('light', 100);
    tracker.record('camera', 200);

    expect(storage.records).toEqual([
      { itemId: 'light', timestamp: 100 },
      { itemId: 'camera', timestamp: 200 },
    ]);
  });

  it('removes expired records and caps storage size', () => {
    const storage = new MemoryStorage();
    const tracker = new DashboardInteractionTracker(storage, 100, 2);

    tracker.record('old', 100);
    tracker.record('one', 180);
    tracker.record('two', 190);
    tracker.record('three', 200);

    expect(tracker.snapshot(200)).toEqual([
      { itemId: 'two', timestamp: 190 },
      { itemId: 'three', timestamp: 200 },
    ]);
  });

  it('clears one card or all records', () => {
    const storage = new MemoryStorage();
    const tracker = new DashboardInteractionTracker(storage, 1_000, 10);
    tracker.record('light', 100);
    tracker.record('camera', 200);

    tracker.clear('light');
    expect(storage.records).toEqual([{ itemId: 'camera', timestamp: 200 }]);
    tracker.clear();
    expect(storage.records).toEqual([]);
  });
});

describe('LocalDashboardInteractionStorage', () => {
  it('ignores malformed persisted values', () => {
    const values = new Map<string, string>();
    const storage = new LocalDashboardInteractionStorage({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
    });

    values.set('frakon.dashboard.interactions.v1', JSON.stringify([
      { itemId: 'valid', timestamp: 100 },
      { itemId: '', timestamp: 200 },
      { itemId: 'invalid', timestamp: 'no' },
    ]));

    expect(storage.load()).toEqual([{ itemId: 'valid', timestamp: 100 }]);
  });
});

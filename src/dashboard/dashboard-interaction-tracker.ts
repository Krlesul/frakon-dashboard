import type { DashboardInteractionRecord } from './dashboard-intelligence-signals';

export interface DashboardInteractionStorage {
  load(): DashboardInteractionRecord[];
  save(records: DashboardInteractionRecord[]): void;
}

export class LocalDashboardInteractionStorage implements DashboardInteractionStorage {
  constructor(
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'>,
    private readonly key = 'frakon.dashboard.interactions.v1',
  ) {}

  load(): DashboardInteractionRecord[] {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isInteractionRecord);
    } catch {
      return [];
    }
  }

  save(records: DashboardInteractionRecord[]): void {
    this.storage.setItem(this.key, JSON.stringify(records));
  }
}

export class DashboardInteractionTracker {
  private records: DashboardInteractionRecord[];

  constructor(
    private readonly storage: DashboardInteractionStorage,
    private readonly retentionMs = 30 * 24 * 60 * 60 * 1000,
    private readonly maxRecords = 20_000,
  ) {
    this.records = this.compact(storage.load(), Date.now());
  }

  record(itemId: string, timestamp = Date.now()): void {
    if (!itemId || !Number.isFinite(timestamp)) return;
    this.records.push({ itemId, timestamp });
    this.records = this.compact(this.records, timestamp);
    this.storage.save(this.records);
  }

  snapshot(now = Date.now()): DashboardInteractionRecord[] {
    this.records = this.compact(this.records, now);
    return structuredClone(this.records);
  }

  clear(itemId?: string): void {
    this.records = itemId ? this.records.filter((record) => record.itemId !== itemId) : [];
    this.storage.save(this.records);
  }

  private compact(records: DashboardInteractionRecord[], now: number): DashboardInteractionRecord[] {
    const cutoff = now - this.retentionMs;
    return records
      .filter((record) => isInteractionRecord(record) && record.timestamp >= cutoff && record.timestamp <= now)
      .sort((left, right) => left.timestamp - right.timestamp)
      .slice(-this.maxRecords);
  }
}

function isInteractionRecord(value: unknown): value is DashboardInteractionRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DashboardInteractionRecord>;
  return typeof record.itemId === 'string'
    && record.itemId.length > 0
    && typeof record.timestamp === 'number'
    && Number.isFinite(record.timestamp);
}

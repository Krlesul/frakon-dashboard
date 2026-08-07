import type { DashboardEntityMetadata } from './dashboard-intelligence';
import type { DashboardEmergencyHistoryEntry, DashboardEmergencyHistoryState } from './dashboard-emergency-history';

export interface DashboardEmergencyHistoryStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface DashboardEmergencyHistoryStorageOptions {
  key?: string;
  recentLimit?: number;
}

export const DEFAULT_DASHBOARD_EMERGENCY_HISTORY_KEY = 'frakon.dashboard.emergency-history.v1';

export function loadDashboardEmergencyHistory(
  storage: DashboardEmergencyHistoryStorageLike | undefined,
  options: DashboardEmergencyHistoryStorageOptions = {},
): DashboardEmergencyHistoryState {
  if (!storage) return emptyHistory();
  try {
    const raw = storage.getItem(options.key ?? DEFAULT_DASHBOARD_EMERGENCY_HISTORY_KEY);
    if (!raw) return emptyHistory();
    return sanitizeHistory(JSON.parse(raw), options.recentLimit ?? 100);
  } catch {
    return emptyHistory();
  }
}

export function saveDashboardEmergencyHistory(
  storage: DashboardEmergencyHistoryStorageLike | undefined,
  history: DashboardEmergencyHistoryState,
  options: DashboardEmergencyHistoryStorageOptions = {},
): DashboardEmergencyHistoryState {
  const sanitized = sanitizeHistory(history, options.recentLimit ?? 100);
  if (!storage) return sanitized;
  try {
    storage.setItem(options.key ?? DEFAULT_DASHBOARD_EMERGENCY_HISTORY_KEY, JSON.stringify(sanitized));
  } catch {
    // Storage quota or privacy mode must never break the live dashboard.
  }
  return sanitized;
}

export function clearDashboardEmergencyHistory(
  storage: DashboardEmergencyHistoryStorageLike | undefined,
  options: DashboardEmergencyHistoryStorageOptions = {},
): void {
  if (!storage) return;
  try {
    const key = options.key ?? DEFAULT_DASHBOARD_EMERGENCY_HISTORY_KEY;
    if (storage.removeItem) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(emptyHistory()));
  } catch {
    // Best-effort cleanup only.
  }
}

export function sanitizeHistory(value: unknown, recentLimit = 100): DashboardEmergencyHistoryState {
  if (!value || typeof value !== 'object') return emptyHistory();
  const source = value as { active?: unknown; recent?: unknown };
  const active = Array.isArray(source.active) ? source.active.map(sanitizeEntry).filter(isEntry) : [];
  const recent = Array.isArray(source.recent) ? source.recent.map(sanitizeEntry).filter(isEntry) : [];
  return {
    active: dedupe(active).sort((a, b) => a.startedAt - b.startedAt || a.itemId.localeCompare(b.itemId)),
    recent: dedupe(recent)
      .sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt))
      .slice(0, Math.max(1, recentLimit)),
  };
}

function sanitizeEntry(value: unknown): DashboardEmergencyHistoryEntry | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const entry = value as Partial<DashboardEmergencyHistoryEntry>;
  if (typeof entry.signature !== 'string' || !entry.signature || typeof entry.itemId !== 'string' || !entry.itemId || !finite(entry.startedAt)) return undefined;
  const endedAt = finite(entry.endedAt) && entry.endedAt! >= entry.startedAt! ? entry.endedAt : undefined;
  const acknowledgedAt = finite(entry.acknowledgedAt) && entry.acknowledgedAt! >= entry.startedAt! ? entry.acknowledgedAt : undefined;
  return {
    signature: entry.signature,
    itemId: entry.itemId,
    sourceEntityIds: stringArray(entry.sourceEntityIds),
    sourceEntityLabels: stringRecord(entry.sourceEntityLabels),
    sourceEntityMetadata: entityMetadataRecord(entry.sourceEntityMetadata),
    reasons: stringArray(entry.reasons),
    startedAt: entry.startedAt!,
    acknowledgedAt,
    endedAt,
    durationMs: endedAt === undefined ? undefined : Math.max(0, endedAt - entry.startedAt!),
  };
}

function dedupe(entries: DashboardEmergencyHistoryEntry[]): DashboardEmergencyHistoryEntry[] {
  const bySignature = new Map<string, DashboardEmergencyHistoryEntry>();
  for (const entry of entries) {
    const existing = bySignature.get(entry.signature);
    if (!existing || (entry.endedAt ?? entry.startedAt) > (existing.endedAt ?? existing.startedAt)) bySignature.set(entry.signature, entry);
  }
  return [...bySignature.values()];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0).slice(0, 32) : [];
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, label] of Object.entries(value as Record<string, unknown>)) {
    if (typeof label !== 'string' || !label.trim()) continue;
    if (Object.keys(result).length >= 32) break;
    result[key] = label.trim().slice(0, 256);
  }
  return result;
}

function entityMetadataRecord(value: unknown): Record<string, DashboardEntityMetadata> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, DashboardEntityMetadata> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const source = raw as Record<string, unknown>;
    const areaName = cleanMetadataText(source.areaName);
    const deviceName = cleanMetadataText(source.deviceName);
    if (!areaName && !deviceName) continue;
    if (Object.keys(result).length >= 32) break;
    result[key] = { ...(areaName ? { areaName } : {}), ...(deviceName ? { deviceName } : {}) };
  }
  return result;
}

function cleanMetadataText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 256) : undefined;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isEntry(entry: DashboardEmergencyHistoryEntry | undefined): entry is DashboardEmergencyHistoryEntry {
  return entry !== undefined;
}

function emptyHistory(): DashboardEmergencyHistoryState {
  return { active: [], recent: [] };
}

import { emergencyKind, type DashboardEmergencyKind } from './dashboard-emergency-presentation';
import type { DashboardEmergencyHistoryEntry, DashboardEmergencyHistoryState } from './dashboard-emergency-history';
import { sanitizeHistory } from './dashboard-emergency-history-storage';

export type DashboardEmergencyAcknowledgementFilter = 'all' | 'acknowledged' | 'unacknowledged';

export interface DashboardEmergencyHistoryFilter {
  kind?: DashboardEmergencyKind | 'all';
  acknowledgement?: DashboardEmergencyAcknowledgementFilter;
  from?: number;
  to?: number;
}

export interface DashboardEmergencyHistoryExport {
  format: 'frakon-dashboard-emergency-history';
  version: 1;
  exportedAt: number;
  history: DashboardEmergencyHistoryState;
}

export interface DashboardEmergencyHistoryStats {
  totalEvents: number;
  activeEvents: number;
  closedEvents: number;
  acknowledgedEvents: number;
  acknowledgementRate: number;
  mostFrequentKind?: DashboardEmergencyKind;
  mostFrequentKindCount: number;
  averageDurationMs?: number;
  averageAcknowledgementMs?: number;
}

export type DashboardEmergencyHistoryImportResult =
  | { ok: true; history: DashboardEmergencyHistoryState; importedRecent: number }
  | { ok: false; error: 'invalid-json' | 'invalid-format' | 'unsupported-version' };

export function filterDashboardEmergencyHistory(
  history: DashboardEmergencyHistoryState,
  filter: DashboardEmergencyHistoryFilter = {},
): DashboardEmergencyHistoryState {
  const matches = (entry: DashboardEmergencyHistoryEntry): boolean => {
    const kind = emergencyKind(entry.reasons[0]);
    if (filter.kind && filter.kind !== 'all' && kind !== filter.kind) return false;
    if (filter.acknowledgement === 'acknowledged' && entry.acknowledgedAt === undefined) return false;
    if (filter.acknowledgement === 'unacknowledged' && entry.acknowledgedAt !== undefined) return false;
    const timestamp = entry.endedAt ?? entry.startedAt;
    if (filter.from !== undefined && timestamp < filter.from) return false;
    if (filter.to !== undefined && timestamp > filter.to) return false;
    return true;
  };
  return { active: history.active.filter(matches), recent: history.recent.filter(matches) };
}

export function calculateDashboardEmergencyHistoryStats(
  history: DashboardEmergencyHistoryState,
  now = Date.now(),
): DashboardEmergencyHistoryStats {
  const entries = [...history.active, ...history.recent];
  const acknowledged = entries.filter((entry) => entry.acknowledgedAt !== undefined);
  const durations = entries.map((entry) => Math.max(0, (entry.endedAt ?? now) - entry.startedAt));
  const acknowledgementTimes = acknowledged
    .map((entry) => Math.max(0, entry.acknowledgedAt! - entry.startedAt));
  const kindCounts = new Map<DashboardEmergencyKind, number>();
  for (const entry of entries) {
    const kind = emergencyKind(entry.reasons[0]);
    kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);
  }
  const mostFrequent = [...kindCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return {
    totalEvents: entries.length,
    activeEvents: history.active.length,
    closedEvents: history.recent.length,
    acknowledgedEvents: acknowledged.length,
    acknowledgementRate: entries.length === 0 ? 0 : acknowledged.length / entries.length,
    mostFrequentKind: mostFrequent?.[0],
    mostFrequentKindCount: mostFrequent?.[1] ?? 0,
    averageDurationMs: durations.length === 0 ? undefined : average(durations),
    averageAcknowledgementMs: acknowledgementTimes.length === 0 ? undefined : average(acknowledgementTimes),
  };
}

export function exportDashboardEmergencyHistory(
  history: DashboardEmergencyHistoryState,
  exportedAt = Date.now(),
): DashboardEmergencyHistoryExport {
  return {
    format: 'frakon-dashboard-emergency-history',
    version: 1,
    exportedAt,
    history: sanitizeHistory(history, 10_000),
  };
}

export function serializeDashboardEmergencyHistoryExport(
  history: DashboardEmergencyHistoryState,
  exportedAt = Date.now(),
): string {
  return JSON.stringify(exportDashboardEmergencyHistory(history, exportedAt), null, 2);
}

export function parseDashboardEmergencyHistoryImport(
  raw: string,
  current: DashboardEmergencyHistoryState,
  recentLimit = 100,
): DashboardEmergencyHistoryImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid-json' };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'invalid-format' };
  const payload = parsed as Partial<DashboardEmergencyHistoryExport>;
  if (payload.format !== 'frakon-dashboard-emergency-history') return { ok: false, error: 'invalid-format' };
  if (payload.version !== 1) return { ok: false, error: 'unsupported-version' };
  const imported = sanitizeHistory(payload.history, 10_000);
  return {
    ok: true,
    history: mergeDashboardEmergencyHistory(current, imported, recentLimit),
    importedRecent: imported.recent.length,
  };
}

export function mergeDashboardEmergencyHistory(
  current: DashboardEmergencyHistoryState,
  imported: DashboardEmergencyHistoryState,
  recentLimit = 100,
): DashboardEmergencyHistoryState {
  const currentSanitized = sanitizeHistory(current, Math.max(1, recentLimit));
  const importedSanitized = sanitizeHistory(imported, 10_000);
  const liveSignatures = new Set(currentSanitized.active.map((entry) => entry.signature));
  const importedClosed = [
    ...importedSanitized.recent,
    ...importedSanitized.active
      .filter((entry) => !liveSignatures.has(entry.signature))
      .map((entry) => ({ ...entry, endedAt: entry.endedAt ?? entry.startedAt, durationMs: entry.durationMs ?? 0 })),
  ];
  const bySignature = new Map<string, DashboardEmergencyHistoryEntry>();
  for (const entry of [...currentSanitized.recent, ...importedClosed]) {
    const existing = bySignature.get(entry.signature);
    if (!existing || (entry.endedAt ?? entry.startedAt) > (existing.endedAt ?? existing.startedAt)) bySignature.set(entry.signature, entry);
  }
  return {
    active: currentSanitized.active,
    recent: [...bySignature.values()]
      .filter((entry) => !liveSignatures.has(entry.signature))
      .sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt))
      .slice(0, Math.max(1, recentLimit)),
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

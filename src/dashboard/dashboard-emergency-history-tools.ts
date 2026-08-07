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

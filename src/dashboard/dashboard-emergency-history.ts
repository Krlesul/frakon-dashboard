import { dashboardEmergencyFocusSignature, type DashboardEmergencyFocusState, type DashboardEmergencyFocusTarget } from './dashboard-emergency-focus';

export interface DashboardEmergencyHistoryEntry {
  signature: string;
  itemId: string;
  sourceEntityIds: string[];
  sourceEntityLabels?: Record<string, string>;
  reasons: string[];
  startedAt: number;
  acknowledgedAt?: number;
  endedAt?: number;
  durationMs?: number;
}

export interface DashboardEmergencyHistoryState {
  active: DashboardEmergencyHistoryEntry[];
  recent: DashboardEmergencyHistoryEntry[];
}

export function updateDashboardEmergencyHistory(
  previous: DashboardEmergencyHistoryState,
  focus: DashboardEmergencyFocusState,
  now = Date.now(),
  acknowledgedSignatures: string[] = [],
  limit = 100,
): DashboardEmergencyHistoryState {
  const activeBySignature = new Map(previous.active.map((entry) => [entry.signature, entry]));
  const nextActive: DashboardEmergencyHistoryEntry[] = [];
  const liveSignatures = new Set<string>();

  for (const target of focus.targets) {
    const signature = dashboardEmergencyFocusSignature(target);
    liveSignatures.add(signature);
    const existing = activeBySignature.get(signature);
    const acknowledgedAt = acknowledgedSignatures.includes(signature)
      ? existing?.acknowledgedAt ?? now
      : existing?.acknowledgedAt;
    nextActive.push(existing ? {
      ...existing,
      sourceEntityLabels: { ...(existing.sourceEntityLabels ?? {}), ...target.sourceEntityLabels },
      acknowledgedAt,
    } : createEntry(target, signature, now, acknowledgedAt));
  }

  const ended = previous.active
    .filter((entry) => !liveSignatures.has(entry.signature))
    .map((entry) => ({ ...entry, endedAt: now, durationMs: Math.max(0, now - entry.startedAt) }));

  return {
    active: nextActive.sort((left, right) => left.startedAt - right.startedAt || left.itemId.localeCompare(right.itemId)),
    recent: [...ended, ...previous.recent]
      .sort((left, right) => (right.endedAt ?? right.startedAt) - (left.endedAt ?? left.startedAt))
      .slice(0, Math.max(1, limit)),
  };
}

export function acknowledgeDashboardEmergencyHistory(
  history: DashboardEmergencyHistoryState,
  signature: string,
  acknowledgedAt = Date.now(),
): DashboardEmergencyHistoryState {
  return {
    active: history.active.map((entry) => entry.signature === signature && entry.acknowledgedAt === undefined ? { ...entry, acknowledgedAt } : entry),
    recent: history.recent,
  };
}

export function dashboardEmergencyDuration(entry: DashboardEmergencyHistoryEntry, now = Date.now()): number {
  return Math.max(0, (entry.endedAt ?? now) - entry.startedAt);
}

function createEntry(
  target: DashboardEmergencyFocusTarget,
  signature: string,
  startedAt: number,
  acknowledgedAt?: number,
): DashboardEmergencyHistoryEntry {
  return {
    signature,
    itemId: target.itemId,
    sourceEntityIds: [...target.sourceEntityIds],
    sourceEntityLabels: { ...target.sourceEntityLabels },
    reasons: [...target.reasons],
    startedAt,
    acknowledgedAt,
  };
}

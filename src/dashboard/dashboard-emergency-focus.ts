import type { DashboardIntelligenceContext } from './dashboard-intelligence';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

export interface DashboardEmergencyFocusTarget {
  itemId: string;
  item: FrakonGridItem;
  severity: 'critical';
}

export interface DashboardEmergencyFocusState {
  active: boolean;
  targets: DashboardEmergencyFocusTarget[];
  primary?: DashboardEmergencyFocusTarget;
}

export function createDashboardEmergencyFocusState(
  document: FrakonDashboardDocument,
  context: DashboardIntelligenceContext | undefined,
): DashboardEmergencyFocusState {
  if (!context) return { active: false, targets: [] };
  const criticalIds = new Set((context.usage ?? [])
    .filter((signal) => signal.urgent && signal.severity === 'critical')
    .map((signal) => signal.itemId));
  const targets = document.items
    .filter((item) => criticalIds.has(item.id))
    .map((item) => ({ itemId: item.id, item: structuredClone(item), severity: 'critical' as const }))
    .sort((left, right) => left.item.y - right.item.y || left.item.x - right.item.x || left.itemId.localeCompare(right.itemId));
  return { active: targets.length > 0, targets, primary: targets[0] };
}

export function dashboardEmergencyFocusIndex(
  focus: DashboardEmergencyFocusState | undefined,
  itemId: string | undefined,
): number {
  if (!focus?.active || focus.targets.length === 0) return -1;
  if (!itemId) return 0;
  const index = focus.targets.findIndex((target) => target.itemId === itemId);
  return index >= 0 ? index : 0;
}

export function dashboardEmergencyFocusTargetAt(
  focus: DashboardEmergencyFocusState | undefined,
  index: number,
): DashboardEmergencyFocusTarget | undefined {
  if (!focus?.active || focus.targets.length === 0) return undefined;
  const normalized = ((Math.trunc(index) % focus.targets.length) + focus.targets.length) % focus.targets.length;
  return focus.targets[normalized];
}

export function nextDashboardEmergencyFocusTarget(
  focus: DashboardEmergencyFocusState | undefined,
  itemId: string | undefined,
  direction: 1 | -1 = 1,
): DashboardEmergencyFocusTarget | undefined {
  const current = dashboardEmergencyFocusIndex(focus, itemId);
  if (current < 0) return undefined;
  return dashboardEmergencyFocusTargetAt(focus, current + direction);
}

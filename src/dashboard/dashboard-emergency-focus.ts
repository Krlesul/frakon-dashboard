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

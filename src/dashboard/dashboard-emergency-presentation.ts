import type { DashboardEmergencyFocusTarget } from './dashboard-emergency-focus';

export interface DashboardEmergencyPresentation {
  title: string;
  sourceLabel?: string;
  technicalReason?: string;
  sourceEntityId?: string;
}

export function presentDashboardEmergency(target: DashboardEmergencyFocusTarget): DashboardEmergencyPresentation {
  const technicalReason = target.reasons[0];
  const sourceEntityId = target.sourceEntityIds[0];
  return {
    title: emergencyTitle(technicalReason),
    sourceLabel: sourceEntityId ? humanizeEntityId(sourceEntityId) : undefined,
    technicalReason,
    sourceEntityId,
  };
}

export function emergencyTitle(reason?: string): string {
  if (!reason) return 'Critical Home Assistant condition';
  const normalized = reason.toLowerCase();
  if (normalized.includes('active smoke condition')) return 'Smoke detected';
  if (normalized.includes('active gas condition')) return 'Gas detected';
  if (normalized.includes('active moisture condition')) return 'Water leak detected';
  if (normalized.includes('active safety condition')) return 'Safety alert';
  if (normalized.includes('alarm state')) return 'Security alarm active';
  if (normalized.includes('low battery')) return 'Critical battery condition';
  if (normalized.includes('climate problem')) return 'Critical climate condition';
  if (normalized.includes('unavailable')) return 'Device unavailable';
  return 'Critical Home Assistant condition';
}

export function humanizeEntityId(entityId: string): string {
  const objectId = entityId.includes('.') ? entityId.slice(entityId.indexOf('.') + 1) : entityId;
  return objectId
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

import type { FrakonDashboardAnyDocument } from './dashboard-document-codec';

export type DashboardEditingMode = 'grid' | 'canvas';

export interface DashboardLayoutCapabilities {
  readV2: boolean;
  writeV2: boolean;
  migrateV1ToV2: boolean;
}

export type DashboardLayoutOpenPlan =
  | { kind: 'open-v1'; editable: true; mode: 'grid' }
  | { kind: 'migration-preview'; editable: false; from: 1; to: 2; mode: 'canvas' }
  | { kind: 'open-v2'; editable: boolean; mode: 'canvas' }
  | { kind: 'blocked'; editable: false; reason: 'v2-read-disabled' | 'migration-disabled' };

export function resolveDashboardLayoutOpenPlan(
  document: FrakonDashboardAnyDocument,
  requestedMode: DashboardEditingMode,
  capabilities: DashboardLayoutCapabilities,
): DashboardLayoutOpenPlan {
  if (document.version === 2) {
    if (!capabilities.readV2) {
      return { kind: 'blocked', editable: false, reason: 'v2-read-disabled' };
    }
    return { kind: 'open-v2', editable: capabilities.writeV2, mode: 'canvas' };
  }

  if (requestedMode === 'grid') {
    return { kind: 'open-v1', editable: true, mode: 'grid' };
  }

  if (!capabilities.migrateV1ToV2) {
    return { kind: 'blocked', editable: false, reason: 'migration-disabled' };
  }

  return { kind: 'migration-preview', editable: false, from: 1, to: 2, mode: 'canvas' };
}

export function canPersistDashboardDocument(
  document: FrakonDashboardAnyDocument,
  capabilities: DashboardLayoutCapabilities,
): boolean {
  return document.version === 1 || capabilities.writeV2;
}

export const DEFAULT_DASHBOARD_LAYOUT_CAPABILITIES: DashboardLayoutCapabilities = {
  readV2: false,
  writeV2: false,
  migrateV1ToV2: true,
};

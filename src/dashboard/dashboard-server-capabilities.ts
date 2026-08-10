import type { DashboardStorageTransport } from './dashboard-storage';
import type { DashboardLayoutCapabilities } from './dashboard-layout-version-policy';

export const RESPONSIVE_CANVAS_V2_CONTRACT_VERSION = 1;
export const RESPONSIVE_CANVAS_V2_STORAGE_NAMESPACE = 'frakon_dashboard.responsive_dashboards';
export const RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT = 'frakon/dashboard/load_responsive_bundle_revision';
export const RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT = 'frakon/dashboard/dry_run_responsive_revision';
export const RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT = 'frakon/dashboard/save_responsive_revision';
export const RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT = 'frakon/dashboard/remove_responsive_revision';

export interface DashboardResponsiveCanvasV2CapabilityResponse {
  contractVersion?: number;
  read: boolean;
  write: boolean;
  atomicRevision: boolean;
  breakpoints: string[];
  maxItems?: number;
  maxConstraints?: number;
  maxSerializedBytes?: number;
  storageNamespace?: string;
  loadEndpoint?: string;
  dryRunEndpoint?: string;
  saveEndpoint?: string;
  removeEndpoint?: string;
}

export interface DashboardServerCapabilitiesResponse {
  readableDocumentVersions: number[];
  writableDocumentVersions: number[];
  revisionSync: boolean;
  maxItems: number;
  responsiveCanvasV2?: DashboardResponsiveCanvasV2CapabilityResponse;
}

export interface DashboardResponsiveCanvasV2Capabilities {
  contractVersion?: number;
  contractCompatible: boolean;
  read: boolean;
  write: boolean;
  atomicRevision: boolean;
  breakpoints: ReadonlySet<string>;
  maxItems?: number;
  maxConstraints?: number;
  maxSerializedBytes?: number;
  storageNamespace?: string;
  loadEndpoint?: string;
  dryRunEndpoint?: string;
  saveEndpoint?: string;
  removeEndpoint?: string;
}

export interface DashboardServerCapabilities {
  readableDocumentVersions: ReadonlySet<number>;
  writableDocumentVersions: ReadonlySet<number>;
  revisionSync: boolean;
  maxItems: number;
  responsiveCanvasV2: DashboardResponsiveCanvasV2Capabilities;
}

export async function loadDashboardServerCapabilities(
  transport: DashboardStorageTransport,
  namespace = 'frakon/dashboard',
): Promise<DashboardServerCapabilities> {
  const response = await transport.request<DashboardServerCapabilitiesResponse>(
    `${namespace}/capabilities`,
    {},
  );
  return normalizeDashboardServerCapabilities(response);
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined;
}

export function normalizeDashboardServerCapabilities(
  response: DashboardServerCapabilitiesResponse,
): DashboardServerCapabilities {
  const readable = new Set(
    response.readableDocumentVersions.filter((version) => Number.isInteger(version) && version > 0),
  );
  const writable = new Set(
    response.writableDocumentVersions.filter(
      (version) => Number.isInteger(version) && version > 0 && readable.has(version),
    ),
  );
  const responsive = response.responsiveCanvasV2;
  const contractCompatible = responsive?.contractVersion === RESPONSIVE_CANVAS_V2_CONTRACT_VERSION;
  return {
    readableDocumentVersions: readable,
    writableDocumentVersions: writable,
    revisionSync: response.revisionSync === true,
    maxItems: Math.max(1, Math.floor(Number.isFinite(response.maxItems) ? response.maxItems : 1)),
    responsiveCanvasV2: {
      contractVersion: responsive?.contractVersion,
      contractCompatible,
      read: contractCompatible && responsive?.read === true,
      write: contractCompatible && responsive?.write === true && responsive?.read === true,
      atomicRevision: contractCompatible && responsive?.atomicRevision === true,
      breakpoints: new Set(contractCompatible ? (responsive?.breakpoints ?? []).filter((value) => typeof value === 'string') : []),
      maxItems: contractCompatible ? positiveInteger(responsive?.maxItems) : undefined,
      maxConstraints: contractCompatible ? positiveInteger(responsive?.maxConstraints) : undefined,
      maxSerializedBytes: contractCompatible ? positiveInteger(responsive?.maxSerializedBytes) : undefined,
      storageNamespace: contractCompatible && typeof responsive?.storageNamespace === 'string' ? responsive.storageNamespace : undefined,
      loadEndpoint: contractCompatible && typeof responsive?.loadEndpoint === 'string' ? responsive.loadEndpoint : undefined,
      dryRunEndpoint: contractCompatible && typeof responsive?.dryRunEndpoint === 'string' ? responsive.dryRunEndpoint : undefined,
      saveEndpoint: contractCompatible && typeof responsive?.saveEndpoint === 'string' ? responsive.saveEndpoint : undefined,
      removeEndpoint: contractCompatible && typeof responsive?.removeEndpoint === 'string' ? responsive.removeEndpoint : undefined,
    },
  };
}

export function dashboardLayoutCapabilitiesFromServer(
  capabilities: DashboardServerCapabilities,
): DashboardLayoutCapabilities {
  return {
    readV2: capabilities.readableDocumentVersions.has(2),
    writeV2: capabilities.writableDocumentVersions.has(2),
    migrateV1ToV2: capabilities.readableDocumentVersions.has(2),
  };
}

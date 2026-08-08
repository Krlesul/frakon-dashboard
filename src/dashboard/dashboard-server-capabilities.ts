import type { DashboardStorageTransport } from './dashboard-storage';
import type { DashboardLayoutCapabilities } from './dashboard-layout-version-policy';

export const RESPONSIVE_CANVAS_V2_CONTRACT_VERSION = 1;

export interface DashboardResponsiveCanvasV2CapabilityResponse {
  contractVersion?: number;
  read: boolean;
  write: boolean;
  atomicRevision: boolean;
  breakpoints: string[];
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

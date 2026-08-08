import type { DashboardStorageTransport } from './dashboard-storage';
import type { DashboardLayoutCapabilities } from './dashboard-layout-version-policy';

export interface DashboardResponsiveCanvasV2CapabilityResponse {
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
  return {
    readableDocumentVersions: readable,
    writableDocumentVersions: writable,
    revisionSync: response.revisionSync === true,
    maxItems: Math.max(1, Math.floor(Number.isFinite(response.maxItems) ? response.maxItems : 1)),
    responsiveCanvasV2: {
      read: responsive?.read === true,
      write: responsive?.write === true && responsive?.read === true,
      atomicRevision: responsive?.atomicRevision === true,
      breakpoints: new Set((responsive?.breakpoints ?? []).filter((value) => typeof value === 'string')),
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

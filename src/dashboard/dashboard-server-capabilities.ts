import type { DashboardStorageTransport } from './dashboard-storage';
import type { DashboardLayoutCapabilities } from './dashboard-layout-version-policy';

export interface DashboardServerCapabilitiesResponse {
  readableDocumentVersions: number[];
  writableDocumentVersions: number[];
  revisionSync: boolean;
  maxItems: number;
}

export interface DashboardServerCapabilities {
  readableDocumentVersions: ReadonlySet<number>;
  writableDocumentVersions: ReadonlySet<number>;
  revisionSync: boolean;
  maxItems: number;
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
  return {
    readableDocumentVersions: readable,
    writableDocumentVersions: writable,
    revisionSync: response.revisionSync === true,
    maxItems: Math.max(1, Math.floor(Number.isFinite(response.maxItems) ? response.maxItems : 1)),
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

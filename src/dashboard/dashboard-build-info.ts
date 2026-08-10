import type { DashboardStorageTransport } from './dashboard-storage';

export const FRAKON_BUILD_INFO_ENDPOINT = 'frakon/dashboard/build_info';

export interface FrakonDashboardBuildInfo {
  version: string;
  sourceCommit: string;
  responsiveContractVersion: number;
  frontendSha256?: string;
}

function asNonEmptyString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function normalizeFrakonDashboardBuildInfo(value: unknown): FrakonDashboardBuildInfo {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const contract = typeof record.responsiveContractVersion === 'number'
    && Number.isInteger(record.responsiveContractVersion)
    && record.responsiveContractVersion > 0
    ? record.responsiveContractVersion
    : 0;
  const checksum = typeof record.frontendSha256 === 'string' && /^[0-9a-f]{64}$/i.test(record.frontendSha256)
    ? record.frontendSha256.toLowerCase()
    : undefined;
  return {
    version: asNonEmptyString(record.version, 'development'),
    sourceCommit: asNonEmptyString(record.sourceCommit, 'development'),
    responsiveContractVersion: contract,
    frontendSha256: checksum,
  };
}

export async function loadFrakonDashboardBuildInfo(
  transport: DashboardStorageTransport,
): Promise<FrakonDashboardBuildInfo> {
  const response = await transport.request<unknown>(FRAKON_BUILD_INFO_ENDPOINT, {});
  return normalizeFrakonDashboardBuildInfo(response);
}

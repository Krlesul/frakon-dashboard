import { describe, expect, it } from 'vitest';
import type { DashboardStorageTransport } from './dashboard-storage';
import { FRAKON_BUILD_INFO_ENDPOINT, loadFrakonDashboardBuildInfo, normalizeFrakonDashboardBuildInfo } from './dashboard-build-info';

class Transport implements DashboardStorageTransport {
  requests: Array<{ command: string; payload: Record<string, unknown> }> = [];
  async request<T>(command: string, payload: Record<string, unknown>): Promise<T> {
    this.requests.push({ command, payload });
    return {
      version: '0.16.0-alpha.1',
      sourceCommit: 'abcdef123456',
      responsiveContractVersion: 1,
      frontendSha256: 'a'.repeat(64),
    } as T;
  }
}

describe('FRAKON dashboard build info', () => {
  it('loads build metadata from the read-only Home Assistant endpoint', async () => {
    const transport = new Transport();
    const info = await loadFrakonDashboardBuildInfo(transport);
    expect(transport.requests).toEqual([{ command: FRAKON_BUILD_INFO_ENDPOINT, payload: {} }]);
    expect(info).toEqual({
      version: '0.16.0-alpha.1',
      sourceCommit: 'abcdef123456',
      responsiveContractVersion: 1,
      frontendSha256: 'a'.repeat(64),
    });
  });

  it('fails closed to development markers for malformed metadata', () => {
    expect(normalizeFrakonDashboardBuildInfo({
      version: '',
      sourceCommit: null,
      responsiveContractVersion: -1,
      frontendSha256: 'bad',
    })).toEqual({
      version: 'development',
      sourceCommit: 'development',
      responsiveContractVersion: 0,
      frontendSha256: undefined,
    });
  });
});

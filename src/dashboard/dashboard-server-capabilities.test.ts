import { describe, expect, it } from 'vitest';
import type { DashboardStorageTransport } from './dashboard-storage';
import {
  dashboardLayoutCapabilitiesFromServer,
  loadDashboardServerCapabilities,
  normalizeDashboardServerCapabilities,
} from './dashboard-server-capabilities';

class Transport implements DashboardStorageTransport {
  requests: Array<{ command: string; payload: Record<string, unknown> }> = [];

  async request<T>(command: string, payload: Record<string, unknown>): Promise<T> {
    this.requests.push({ command, payload });
    return {
      readableDocumentVersions: [1, 2],
      writableDocumentVersions: [1],
      revisionSync: true,
      maxItems: 2000,
    } as T;
  }
}

describe('dashboard server capabilities', () => {
  it('loads capability negotiation from the Home Assistant namespace', async () => {
    const transport = new Transport();
    const capabilities = await loadDashboardServerCapabilities(transport);
    expect(transport.requests).toEqual([{ command: 'frakon/dashboard/capabilities', payload: {} }]);
    expect([...capabilities.readableDocumentVersions]).toEqual([1, 2]);
    expect([...capabilities.writableDocumentVersions]).toEqual([1]);
    expect(capabilities.revisionSync).toBe(true);
  });

  it('never treats a writable version as supported when the server cannot read it', () => {
    const capabilities = normalizeDashboardServerCapabilities({
      readableDocumentVersions: [1],
      writableDocumentVersions: [1, 2],
      revisionSync: true,
      maxItems: 2000,
    });
    expect([...capabilities.writableDocumentVersions]).toEqual([1]);
  });

  it('derives conservative v2 layout gates from server capabilities', () => {
    const capabilities = normalizeDashboardServerCapabilities({
      readableDocumentVersions: [1, 2],
      writableDocumentVersions: [1],
      revisionSync: true,
      maxItems: 2000,
    });
    expect(dashboardLayoutCapabilitiesFromServer(capabilities)).toEqual({
      readV2: true,
      writeV2: false,
      migrateV1ToV2: true,
    });
  });
});

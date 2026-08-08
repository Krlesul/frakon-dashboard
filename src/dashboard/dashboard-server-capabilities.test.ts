import { describe, expect, it } from 'vitest';
import type { DashboardStorageTransport } from './dashboard-storage';
import {
  dashboardLayoutCapabilitiesFromServer,
  loadDashboardServerCapabilities,
  normalizeDashboardServerCapabilities,
  RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
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
      responsiveCanvasV2: {
        contractVersion: RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
        read: true,
        write: false,
        atomicRevision: true,
        breakpoints: ['mobile', 'tablet', 'desktop', 'wide'],
      },
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
    expect(capabilities.responsiveCanvasV2.contractVersion).toBe(RESPONSIVE_CANVAS_V2_CONTRACT_VERSION);
    expect(capabilities.responsiveCanvasV2.contractCompatible).toBe(true);
    expect(capabilities.responsiveCanvasV2.read).toBe(true);
    expect(capabilities.responsiveCanvasV2.write).toBe(false);
    expect(capabilities.responsiveCanvasV2.atomicRevision).toBe(true);
    expect([...capabilities.responsiveCanvasV2.breakpoints]).toEqual(['mobile', 'tablet', 'desktop', 'wide']);
  });

  it('never treats a writable version as supported when the server cannot read it', () => {
    const capabilities = normalizeDashboardServerCapabilities({
      readableDocumentVersions: [1],
      writableDocumentVersions: [1, 2],
      revisionSync: true,
      maxItems: 2000,
    });
    expect([...capabilities.writableDocumentVersions]).toEqual([1]);
    expect(capabilities.responsiveCanvasV2).toEqual({
      contractVersion: undefined,
      contractCompatible: false,
      read: false,
      write: false,
      atomicRevision: false,
      breakpoints: new Set(),
    });
  });

  it('never enables responsive write when responsive read is disabled', () => {
    const capabilities = normalizeDashboardServerCapabilities({
      readableDocumentVersions: [1, 2],
      writableDocumentVersions: [1],
      revisionSync: true,
      maxItems: 2000,
      responsiveCanvasV2: {
        contractVersion: RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
        read: false,
        write: true,
        atomicRevision: true,
        breakpoints: ['desktop'],
      },
    });
    expect(capabilities.responsiveCanvasV2.write).toBe(false);
  });

  it('fails closed when the responsive contract version is absent or incompatible', () => {
    for (const contractVersion of [undefined, RESPONSIVE_CANVAS_V2_CONTRACT_VERSION + 1]) {
      const capabilities = normalizeDashboardServerCapabilities({
        readableDocumentVersions: [1, 2],
        writableDocumentVersions: [1],
        revisionSync: true,
        maxItems: 2000,
        responsiveCanvasV2: {
          contractVersion,
          read: true,
          write: true,
          atomicRevision: true,
          breakpoints: ['desktop'],
        },
      });
      expect(capabilities.responsiveCanvasV2.contractCompatible).toBe(false);
      expect(capabilities.responsiveCanvasV2.read).toBe(false);
      expect(capabilities.responsiveCanvasV2.write).toBe(false);
      expect(capabilities.responsiveCanvasV2.atomicRevision).toBe(false);
      expect([...capabilities.responsiveCanvasV2.breakpoints]).toEqual([]);
    }
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

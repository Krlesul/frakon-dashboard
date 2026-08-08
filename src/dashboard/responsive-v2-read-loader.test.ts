import { describe, expect, it } from 'vitest';
import type { DashboardStorageTransport } from './dashboard-storage';
import { RESPONSIVE_CANVAS_V2_CONTRACT_VERSION } from './dashboard-server-capabilities';
import { loadResponsiveCanvasV2ReadOnly } from './responsive-v2-read-loader';

class Transport implements DashboardStorageTransport {
  requests: Array<{ command: string; payload: Record<string, unknown> }> = [];
  constructor(private readonly responsiveRead = true) {}

  async request<T>(command: string, payload: Record<string, unknown>): Promise<T> {
    this.requests.push({ command, payload });
    if (command.endsWith('/capabilities')) {
      return {
        readableDocumentVersions: [1, 2],
        writableDocumentVersions: [1],
        revisionSync: true,
        maxItems: 2000,
        responsiveCanvasV2: {
          contractVersion: RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
          read: this.responsiveRead,
          write: false,
          atomicRevision: true,
          breakpoints: ['mobile', 'tablet', 'desktop', 'wide'],
        },
      } as T;
    }
    return {
      document: {
        kind: 'responsive-canvas-v2', id: 'home', title: 'Home', defaultBreakpoint: 'desktop',
        documents: {
          desktop: {
            version: 2, id: 'home', title: 'Home', breakpoint: 'desktop',
            layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
            items: [],
          },
        },
      },
      revision: 'r1', updatedAt: 10, clientId: 'ha',
    } as T;
  }
}

describe('responsive canvas v2 read loader', () => {
  it('loads a responsive bundle only after capability negotiation', async () => {
    const transport = new Transport();
    const result = await loadResponsiveCanvasV2ReadOnly(transport, 'home');
    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.envelope.bundle.documents.desktop?.breakpoint).toBe('desktop');
      expect(result.envelope.revision).toBe('r1');
    }
    expect(transport.requests).toEqual([
      { command: 'frakon/dashboard/capabilities', payload: {} },
      { command: 'frakon/dashboard/load_responsive_bundle_revision', payload: { dashboard_id: 'home' } },
    ]);
  });

  it('fails closed without responsive read capability and sends no load request', async () => {
    const transport = new Transport(false);
    const result = await loadResponsiveCanvasV2ReadOnly(transport, 'home');
    expect(result.status).toBe('blocked');
    expect(transport.requests).toEqual([{ command: 'frakon/dashboard/capabilities', payload: {} }]);
  });

  it('rejects a malformed responsive bundle', async () => {
    const transport = new Transport();
    const original = transport.request.bind(transport);
    transport.request = async <T>(command: string, payload: Record<string, unknown>): Promise<T> => {
      if (command.endsWith('/load_responsive_bundle_revision')) {
        transport.requests.push({ command, payload });
        return {
          document: { kind: 'responsive-canvas-v2', id: 'home', title: 'Home', defaultBreakpoint: 'desktop', documents: {} },
          revision: 'r1', updatedAt: 10, clientId: 'ha',
        } as T;
      }
      return original(command, payload);
    };
    const result = await loadResponsiveCanvasV2ReadOnly(transport, 'home');
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') expect(result.reason).toBe('invalid-bundle');
  });
});

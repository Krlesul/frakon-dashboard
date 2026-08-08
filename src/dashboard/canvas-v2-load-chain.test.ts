import { describe, expect, it } from 'vitest';
import type { DashboardStorageTransport } from './dashboard-storage';
import { loadCanvasV2HomeAssistantChain } from './canvas-v2-load-chain';

type Mode = 'responsive' | 'single-v2' | 'v1' | 'invalid-responsive';

class Transport implements DashboardStorageTransport {
  requests: string[] = [];
  constructor(private readonly mode: Mode) {}

  async request<T>(command: string): Promise<T> {
    this.requests.push(command);
    if (command.endsWith('/capabilities')) {
      return {
        readableDocumentVersions: [1, 2],
        writableDocumentVersions: [1],
        revisionSync: true,
        maxItems: 2000,
        responsiveCanvasV2: {
          read: true,
          write: false,
          atomicRevision: true,
          breakpoints: ['mobile', 'tablet', 'desktop', 'wide'],
        },
      } as T;
    }
    if (command.endsWith('/load_responsive_revision')) {
      if (this.mode === 'responsive') {
        return {
          document: {
            kind: 'responsive-canvas-v2',
            id: 'home',
            title: 'Home',
            defaultBreakpoint: 'desktop',
            documents: {
              desktop: {
                version: 2,
                id: 'home',
                title: 'Home',
                breakpoint: 'desktop',
                layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
                items: [],
              },
            },
          },
          revision: 'rr1',
          updatedAt: 10,
          clientId: 'ha',
        } as T;
      }
      if (this.mode === 'invalid-responsive') {
        return {
          document: { kind: 'responsive-canvas-v2', id: 'home', title: 'Home', defaultBreakpoint: 'desktop', documents: {} },
          revision: 'bad',
          updatedAt: 10,
          clientId: 'ha',
        } as T;
      }
      return null as T;
    }
    if (command.endsWith('/load_revision')) {
      if (this.mode === 'single-v2') {
        return {
          document: {
            version: 2,
            id: 'home',
            title: 'Home',
            breakpoint: 'desktop',
            layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
            items: [],
          },
          revision: 'v2r1',
          updatedAt: 11,
          clientId: 'ha',
        } as T;
      }
      if (this.mode === 'v1') {
        return {
          document: {
            version: 1,
            id: 'home',
            title: 'Home',
            breakpoint: 'desktop',
            columns: 12,
            rowHeight: 48,
            gap: 12,
            items: [],
          },
          revision: 'v1r1',
          updatedAt: 11,
          clientId: 'ha',
        } as T;
      }
      return null as T;
    }
    throw new Error(`Unexpected command ${command}`);
  }
}

describe('canvas v2 Home Assistant load chain', () => {
  it('prefers responsive bundle and does not request single-v2 after success', async () => {
    const transport = new Transport('responsive');
    const result = await loadCanvasV2HomeAssistantChain(transport, 'home');
    expect(result.status).toBe('responsive');
    expect(transport.requests).toEqual([
      'frakon/dashboard/capabilities',
      'frakon/dashboard/load_responsive_revision',
    ]);
  });

  it('falls back from absent responsive bundle to single v2', async () => {
    const transport = new Transport('single-v2');
    const result = await loadCanvasV2HomeAssistantChain(transport, 'home');
    expect(result.status).toBe('single-v2');
    expect(transport.requests).toEqual([
      'frakon/dashboard/capabilities',
      'frakon/dashboard/load_responsive_revision',
      'frakon/dashboard/load_revision',
    ]);
  });

  it('falls back to v1 when the stored revision is not a v2 document', async () => {
    const transport = new Transport('v1');
    const result = await loadCanvasV2HomeAssistantChain(transport, 'home');
    expect(result.status).toBe('fallback-v1');
  });

  it('does not hide a malformed responsive bundle behind the single-v2 fallback', async () => {
    const transport = new Transport('invalid-responsive');
    const result = await loadCanvasV2HomeAssistantChain(transport, 'home');
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') expect(result.reason).toBe('invalid-responsive-bundle');
    expect(transport.requests).toEqual([
      'frakon/dashboard/capabilities',
      'frakon/dashboard/load_responsive_revision',
    ]);
  });
});

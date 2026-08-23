import { describe, expect, it } from 'vitest';
import type { DashboardStorageTransport } from './dashboard-storage';
import { recoverResponsiveCanvasV2ReadOnly } from './responsive-v2-recovery';

class Transport implements DashboardStorageTransport {
  requests: string[] = [];
  async request<T>(command: string): Promise<T> {
    this.requests.push(command);
    if (command.endsWith('/capabilities')) {
      return {
        readableDocumentVersions: [1, 2],
        writableDocumentVersions: [1],
        revisionSync: true,
        maxItems: 2000,
        responsiveCanvasV2: {
          contractVersion: 1,
          read: true,
          write: false,
          atomicRevision: true,
          breakpoints: ['mobile', 'tablet', 'desktop', 'wide'],
        },
      } as T;
    }
    return {
      document: {
        kind: 'responsive-canvas-v2',
        id: 'home',
        title: 'Home',
        defaultBreakpoint: 'mobile',
        documents: {
          mobile: {
            version: 2,
            id: 'home',
            title: 'Home',
            breakpoint: 'mobile',
            layout: { mode: 'canvas', width: 390, minHeight: 700, snap: { enabled: true, size: 8 } },
            items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 350, height: 120 } }],
          },
          desktop: {
            version: 2,
            id: 'home',
            title: 'Home',
            breakpoint: 'desktop',
            layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
            items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x: 120, y: 40, width: 300, height: 160 } }],
          },
        },
      },
      revision: 'r7',
      parentRevision: 'r6',
      updatedAt: 77,
      clientId: 'ha',
    } as T;
  }
}

describe('responsive canvas v2 recovery', () => {
  it('restores the server bundle as clean breakpoint draft bases', async () => {
    const transport = new Transport();
    const result = await recoverResponsiveCanvasV2ReadOnly(transport, 'home');
    expect(result.status).toBe('recovered');
    if (result.status !== 'recovered') return;
    expect(result.envelope.revision).toBe('r7');
    expect(result.controller.snapshot.activeBreakpoint).toBe('mobile');
    expect(result.controller.snapshot.active.document.items[0].frame.x).toBe(20);
    expect(result.controller.snapshot.documents.desktop?.items[0].frame.x).toBe(120);
    expect(result.controller.snapshot.dirtyBreakpoints).toEqual([]);
    expect(result.controller.snapshot.active.canUndo).toBe(false);
  });
});

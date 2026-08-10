import { describe, expect, it } from 'vitest';
import type { DashboardStorageTransport } from './dashboard-storage';
import { RESPONSIVE_CANVAS_V2_CONTRACT_VERSION, type DashboardServerCapabilities } from './dashboard-server-capabilities';
import { createResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import {
  dryRunResponsiveCanvasV2Revision,
  persistResponsiveCanvasV2Revision,
  removeResponsiveCanvasV2Revision,
  responsiveCanvasV2PersistenceDecision,
} from './responsive-v2-persistence';
import { createResponsiveCanvasV2Revision } from './responsive-v2-revision';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [],
  };
}

function capabilities(write: boolean): DashboardServerCapabilities {
  return {
    readableDocumentVersions: new Set([1, 2]),
    writableDocumentVersions: new Set([1]),
    revisionSync: true,
    maxItems: 2000,
    responsiveCanvasV2: {
      contractVersion: RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
      contractCompatible: true,
      read: true,
      write,
      atomicRevision: true,
      breakpoints: new Set(['mobile', 'tablet', 'desktop', 'wide']),
      dryRunEndpoint: 'frakon/dashboard/dry_run_responsive_revision',
    },
  };
}

class Transport implements DashboardStorageTransport {
  requests: Array<{ command: string; payload: Record<string, unknown> }> = [];
  async request<T>(command: string, payload: Record<string, unknown>): Promise<T> {
    this.requests.push({ command, payload });
    if (command.endsWith('/dry_run_responsive_revision')) {
      return { status: 'valid', currentRevision: payload.expectedRevision ?? null, writeEnabled: false } as T;
    }
    if (command.endsWith('/remove_responsive_revision')) return { status: 'removed' } as T;
    const envelope = payload.envelope as Record<string, unknown>;
    return { status: 'saved', envelope } as T;
  }
}

describe('responsive canvas v2 persistence gate', () => {
  it('blocks before transport when server write capability is disabled', async () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: document() }, 'desktop');
    const envelope = createResponsiveCanvasV2Revision(bundle, 'client', undefined, 100);
    const transport = new Transport();
    const result = await persistResponsiveCanvasV2Revision(transport, capabilities(false), envelope, undefined);
    expect(result).toEqual({ status: 'blocked', reason: 'write-disabled' });
    expect(transport.requests).toEqual([]);
  });

  it('allows non-mutating server dry-run while write capability remains disabled', async () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: document() }, 'desktop');
    const envelope = createResponsiveCanvasV2Revision(bundle, 'client', undefined, 100);
    const transport = new Transport();
    const result = await dryRunResponsiveCanvasV2Revision(transport, capabilities(false), envelope, undefined);
    expect(result).toEqual({ status: 'valid', currentRevision: undefined, writeEnabled: false });
    expect(transport.requests).toHaveLength(1);
    expect(transport.requests[0]).toMatchObject({
      command: 'frakon/dashboard/dry_run_responsive_revision',
      payload: {
        contractVersion: RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
        expectedRevision: null,
      },
    });
  });

  it('blocks remove before transport when server write capability is disabled', async () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: document() }, 'desktop');
    const transport = new Transport();
    const result = await removeResponsiveCanvasV2Revision(transport, capabilities(false), bundle, 'r1');
    expect(result).toEqual({ status: 'blocked', reason: 'write-disabled' });
    expect(transport.requests).toEqual([]);
  });

  it('blocks a bundle containing a breakpoint not advertised by the server', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: document() }, 'desktop');
    const caps = capabilities(true);
    caps.responsiveCanvasV2.breakpoints = new Set(['mobile', 'tablet']);
    expect(responsiveCanvasV2PersistenceDecision(caps, bundle)).toEqual({
      allowed: false,
      reason: 'unsupported-breakpoint',
    });
  });

  it('maps a hypothetical enabled save to the dedicated responsive endpoint with contract version', async () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: document() }, 'desktop');
    const envelope = createResponsiveCanvasV2Revision(bundle, 'client', undefined, 100);
    const transport = new Transport();
    const result = await persistResponsiveCanvasV2Revision(transport, capabilities(true), envelope, undefined);
    expect(result.status).toBe('saved');
    expect(transport.requests).toHaveLength(1);
    expect(transport.requests[0].command).toBe('frakon/dashboard/save_responsive_revision');
    expect(transport.requests[0].payload.contractVersion).toBe(RESPONSIVE_CANVAS_V2_CONTRACT_VERSION);
  });

  it('maps a hypothetical enabled remove to the guarded responsive endpoint', async () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: document() }, 'desktop');
    const transport = new Transport();
    const result = await removeResponsiveCanvasV2Revision(transport, capabilities(true), bundle, 'r7');
    expect(result).toEqual({ status: 'removed' });
    expect(transport.requests).toHaveLength(1);
    expect(transport.requests[0]).toMatchObject({
      command: 'frakon/dashboard/remove_responsive_revision',
      payload: {
        contractVersion: RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
        dashboard_id: 'home',
        expectedRevision: 'r7',
      },
    });
  });
});

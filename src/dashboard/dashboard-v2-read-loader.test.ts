import { describe, expect, it } from 'vitest';
import type { DashboardStorageTransport } from './dashboard-storage';
import { loadDashboardV2ReadOnly } from './dashboard-v2-read-loader';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { responsiveCanvasV2BundleFromDocument } from './responsive-v2-bundle';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';

const v2: FrakonDashboardDocumentV2 = {
  version: 2,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  layout: { mode: 'canvas', width: 1000, minHeight: 600, snap: { enabled: true, size: 8 } },
  items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 30, width: 200, height: 120 } }],
};

class Transport implements DashboardStorageTransport {
  requests: Array<{ command: string; payload: Record<string, unknown> }> = [];
  responses = new Map<string, unknown>();

  async request<T>(command: string, payload: Record<string, unknown>): Promise<T> {
    this.requests.push({ command, payload });
    return this.responses.get(command) as T;
  }
}

function capabilities(readable: number[], writable: number[] = [1], responsive = false) {
  return {
    readableDocumentVersions: readable,
    writableDocumentVersions: writable,
    revisionSync: true,
    maxItems: 2000,
    responsiveCanvasV2: responsive ? {
      read: true,
      write: false,
      atomicRevision: true,
      breakpoints: ['mobile', 'tablet', 'desktop', 'wide'],
    } : undefined,
  };
}

function responsiveEnvelope() {
  return {
    document: {
      kind: 'responsive-canvas-v2',
      id: 'home',
      title: 'Home',
      defaultBreakpoint: 'mobile',
      documents: {
        mobile: {
          ...v2,
          breakpoint: 'mobile',
          layout: { ...v2.layout, width: 390 },
          items: [{ ...v2.items[0], frame: { ...v2.items[0].frame, x: 12 } }],
        },
        desktop: {
          ...v2,
          items: [{ ...v2.items[0], frame: { ...v2.items[0].frame, x: 120 } }],
        },
      },
    },
    revision: 'responsive-r1',
    updatedAt: 200,
    clientId: 'home-assistant',
  };
}

describe('loadDashboardV2ReadOnly', () => {
  it('blocks before revision loading when the server does not advertise v2 reads', async () => {
    const transport = new Transport();
    transport.responses.set('frakon/dashboard/capabilities', capabilities([1]));

    const result = await loadDashboardV2ReadOnly(transport, 'home');

    expect(result.status).toBe('blocked');
    expect(transport.requests.map((request) => request.command)).toEqual(['frakon/dashboard/capabilities']);
  });

  it('returns absent for a missing v2 revision', async () => {
    const transport = new Transport();
    transport.responses.set('frakon/dashboard/capabilities', capabilities([1, 2]));
    transport.responses.set('frakon/dashboard/load_revision', undefined);

    const result = await loadDashboardV2ReadOnly(transport, 'home');

    expect(result.status).toBe('absent');
    expect(transport.requests.at(-1)?.payload).toEqual({ dashboard_id: 'home' });
  });

  it('loads and normalizes a valid v2 revision envelope', async () => {
    const transport = new Transport();
    transport.responses.set('frakon/dashboard/capabilities', capabilities([1, 2]));
    transport.responses.set('frakon/dashboard/load_revision', {
      document: { ...v2, layout: { ...v2.layout, width: 0 } },
      revision: 'rev-2',
      updatedAt: 100,
      clientId: 'desktop',
    });

    const result = await loadDashboardV2ReadOnly(transport, 'home');

    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.envelope.revision).toBe('rev-2');
      expect(result.envelope.document.layout.width).toBe(1);
      expect(result.envelope.document.items[0].id).toBe('a');
    }
  });

  it('prefers a responsive bundle and carries all breakpoints through the existing v2 API', async () => {
    const transport = new Transport();
    transport.responses.set('frakon/dashboard/capabilities', capabilities([1, 2], [1], true));
    transport.responses.set('frakon/dashboard/load_responsive_revision', responsiveEnvelope());
    transport.responses.set('frakon/dashboard/load_revision', {
      document: v2,
      revision: 'single-r1',
      updatedAt: 100,
      clientId: 'legacy',
    });

    const result = await loadDashboardV2ReadOnly(transport, 'home');

    expect(result.status).toBe('loaded');
    if (result.status === 'loaded') {
      expect(result.envelope.revision).toBe('responsive-r1');
      expect(result.envelope.document.breakpoint).toBe('mobile');
      const bundle = responsiveCanvasV2BundleFromDocument(result.envelope.document);
      expect(bundle?.documents.mobile?.items[0].frame.x).toBe(12);
      expect(bundle?.documents.desktop?.items[0].frame.x).toBe(120);
    }
    expect(transport.requests.map((request) => request.command)).toEqual([
      'frakon/dashboard/capabilities',
      'frakon/dashboard/load_responsive_revision',
    ]);
  });

  it('restores the responsive server bundle through the exact loader plus controller path used by the card', async () => {
    const transport = new Transport();
    transport.responses.set('frakon/dashboard/capabilities', capabilities([1, 2], [1], true));
    transport.responses.set('frakon/dashboard/load_responsive_revision', responsiveEnvelope());

    const result = await loadDashboardV2ReadOnly(transport, 'home');
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') return;

    const controller = new ResponsiveV2DraftController(result.envelope.document, result.envelope.document.breakpoint);
    expect(controller.snapshot.activeBreakpoint).toBe('mobile');
    expect(controller.snapshot.active.document.items[0].frame.x).toBe(12);
    expect(controller.snapshot.documents.desktop?.items[0].frame.x).toBe(120);
    expect(controller.snapshot.dirtyBreakpoints).toEqual([]);
  });

  it('falls back from an absent responsive bundle to the single-v2 revision', async () => {
    const transport = new Transport();
    transport.responses.set('frakon/dashboard/capabilities', capabilities([1, 2], [1], true));
    transport.responses.set('frakon/dashboard/load_responsive_revision', undefined);
    transport.responses.set('frakon/dashboard/load_revision', {
      document: v2,
      revision: 'single-r1',
      updatedAt: 100,
      clientId: 'legacy',
    });

    const result = await loadDashboardV2ReadOnly(transport, 'home');

    expect(result).toMatchObject({ status: 'loaded', envelope: { revision: 'single-r1' } });
    expect(transport.requests.map((request) => request.command)).toEqual([
      'frakon/dashboard/capabilities',
      'frakon/dashboard/load_responsive_revision',
      'frakon/dashboard/load_revision',
    ]);
  });

  it('rejects a v1 revision even when the server can read v2', async () => {
    const transport = new Transport();
    transport.responses.set('frakon/dashboard/capabilities', capabilities([1, 2]));
    transport.responses.set('frakon/dashboard/load_revision', {
      document: { version: 1, id: 'home', title: 'Home', breakpoint: 'desktop', columns: 12, rowHeight: 48, gap: 12, items: [] },
      revision: 'rev-1',
      updatedAt: 100,
      clientId: 'desktop',
    });

    const result = await loadDashboardV2ReadOnly(transport, 'home');

    expect(result).toMatchObject({ status: 'invalid', reason: 'unexpected-document-version' });
  });
});

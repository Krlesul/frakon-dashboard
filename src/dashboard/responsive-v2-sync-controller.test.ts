import { describe, expect, it } from 'vitest';
import type { DashboardStorageTransport } from './dashboard-storage';
import { RESPONSIVE_CANVAS_V2_CONTRACT_VERSION } from './dashboard-server-capabilities';
import { createResponsiveCanvasV2RevisionFromParent } from './responsive-v2-revision';
import { ResponsiveCanvasV2SyncController } from './responsive-v2-sync-controller';

class Transport implements DashboardStorageTransport {
  requests: Array<{ command: string; payload: Record<string, unknown> }> = [];
  constructor(private readonly write = false) {}

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
          read: true,
          write: this.write,
          atomicRevision: true,
          breakpoints: ['mobile', 'tablet', 'desktop', 'wide'],
        },
      } as T;
    }
    if (command.endsWith('/load_responsive_bundle_revision')) {
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
        revision: 'r1', updatedAt: 1, clientId: 'ha',
      } as T;
    }
    const envelope = payload.envelope as Record<string, unknown>;
    return { status: 'saved', envelope } as T;
  }
}

function dirty(sync: ResponsiveCanvasV2SyncController): void {
  const controller = sync.currentState.controller!;
  const desktop = controller.snapshot.active.document;
  controller.applyActive({
    status: 'committed',
    document: { ...desktop, title: `${desktop.title} changed` },
    collisionIds: [],
  }, false);
}

describe('ResponsiveCanvasV2SyncController', () => {
  it('recovers a clean responsive controller from server revision', async () => {
    const transport = new Transport(false);
    const sync = new ResponsiveCanvasV2SyncController(transport, 'client', 'frakon/dashboard', () => 2);
    const controller = await sync.load('home');
    expect(controller).toBeDefined();
    expect(sync.currentState.envelope?.revision).toBe('r1');
    expect(sync.currentState.controller?.snapshot.dirtyBreakpoints).toEqual([]);
    expect(transport.requests.at(-1)?.command).toBe('frakon/dashboard/load_responsive_bundle_revision');
  });

  it('does not send a save transport request for a clean draft', async () => {
    const transport = new Transport(true);
    const sync = new ResponsiveCanvasV2SyncController(transport, 'client', 'frakon/dashboard', () => 2);
    await sync.load('home');
    const requestsAfterLoad = transport.requests.length;
    const saved = await sync.save();
    expect(saved?.revision).toBe('r1');
    expect(transport.requests).toHaveLength(requestsAfterLoad);
  });

  it('blocks save before any save transport request when server write is disabled', async () => {
    const transport = new Transport(false);
    const sync = new ResponsiveCanvasV2SyncController(transport, 'client', 'frakon/dashboard', () => 2);
    await sync.load('home');
    dirty(sync);
    const requestsAfterLoad = transport.requests.length;
    const saved = await sync.save();
    expect(saved).toBeUndefined();
    expect(transport.requests).toHaveLength(requestsAfterLoad);
    expect(sync.currentState.error?.message).toContain('write-disabled');
  });

  it('uses the dedicated responsive save endpoint only when server write is explicitly enabled', async () => {
    const transport = new Transport(true);
    const sync = new ResponsiveCanvasV2SyncController(transport, 'client', 'frakon/dashboard', () => 2);
    await sync.load('home');
    dirty(sync);
    const saved = await sync.save();
    expect(saved?.parentRevision).toBe('r1');
    expect(transport.requests.at(-1)?.command).toBe('frakon/dashboard/save_responsive_revision');
  });

  it('rejects a stale audited candidate when the local draft changed afterwards', async () => {
    const transport = new Transport(true);
    const sync = new ResponsiveCanvasV2SyncController(transport, 'client', 'frakon/dashboard', () => 2);
    await sync.load('home');
    dirty(sync);
    const controller = sync.currentState.controller!;
    const candidate = createResponsiveCanvasV2RevisionFromParent(controller.toBundle(), 'preview-client', 'r1', 2);
    const desktop = controller.snapshot.active.document;
    controller.applyActive({
      status: 'committed',
      document: { ...desktop, title: `${desktop.title} again` },
      collisionIds: [],
    }, false);
    const requestsBeforeSave = transport.requests.length;
    const saved = await sync.saveCandidate(candidate);
    expect(saved).toBeUndefined();
    expect(transport.requests).toHaveLength(requestsBeforeSave);
    expect(sync.currentState.error?.message).toContain('local draft changed');
  });

  it('rejects a candidate whose parent revision no longer matches the server base', async () => {
    const transport = new Transport(true);
    const sync = new ResponsiveCanvasV2SyncController(transport, 'client', 'frakon/dashboard', () => 2);
    await sync.load('home');
    dirty(sync);
    const controller = sync.currentState.controller!;
    const candidate = createResponsiveCanvasV2RevisionFromParent(controller.toBundle(), 'preview-client', 'older-base', 2);
    const requestsBeforeSave = transport.requests.length;
    const saved = await sync.saveCandidate(candidate);
    expect(saved).toBeUndefined();
    expect(transport.requests).toHaveLength(requestsBeforeSave);
    expect(sync.currentState.error?.message).toContain('base revision changed');
  });
});

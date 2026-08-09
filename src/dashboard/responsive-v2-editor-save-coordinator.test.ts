import { describe, expect, it } from 'vitest';
import type { DashboardStorageTransport } from './dashboard-storage';
import { RESPONSIVE_CANVAS_V2_CONTRACT_VERSION, type DashboardServerCapabilities } from './dashboard-server-capabilities';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { resolveResponsiveV2EditorConflict, saveResponsiveV2EditorCandidate } from './responsive-v2-editor-save-coordinator';
import { createResponsiveCanvasV2RevisionFromParent } from './responsive-v2-revision';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1200, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x: 40, y: 40, width: 160, height: 100 } }],
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
      saveEndpoint: 'frakon/dashboard/save_responsive_revision',
    },
  };
}

function dirtyController(): ResponsiveV2DraftController {
  const controller = new ResponsiveV2DraftController(document());
  const next = structuredClone(controller.snapshot.active.document);
  next.items[0].frame.x = 80;
  controller.applyActive({ status: 'committed', document: next, collisionIds: [] });
  return controller;
}

class Transport implements DashboardStorageTransport {
  requests: Array<{ command: string; payload: Record<string, unknown> }> = [];
  private conflictCount = 0;
  constructor(private readonly mode: 'saved' | 'conflict' | 'conflict-once' = 'saved') {}
  async request<T>(command: string, payload: Record<string, unknown>): Promise<T> {
    this.requests.push({ command, payload });
    const envelope = payload.envelope as Record<string, unknown>;
    const shouldConflict = this.mode === 'conflict' || (this.mode === 'conflict-once' && this.conflictCount++ === 0);
    if (!shouldConflict) return { status: 'saved', envelope } as T;
    const remoteBundle = structuredClone(envelope.document) as ReturnType<ResponsiveV2DraftController['toBundle']>;
    remoteBundle.documents.desktop!.items[0].frame.x = 120;
    return {
      status: 'conflict',
      remote: {
        document: remoteBundle,
        revision: 'remote-r2',
        parentRevision: 'r1',
        updatedAt: 3,
        clientId: 'remote',
      },
    } as T;
  }
}

describe('responsive v2 editor save coordinator', () => {
  it('blocks before transport when server write is disabled', async () => {
    const controller = dirtyController();
    const candidate = createResponsiveCanvasV2RevisionFromParent(controller.toBundle(), 'client', 'r1', 2);
    const transport = new Transport();
    const result = await saveResponsiveV2EditorCandidate({ transport, capabilities: capabilities(false), controller, baseRevision: 'r1', candidate });
    expect(result).toEqual({ status: 'blocked', reason: 'write-disabled' });
    expect(transport.requests).toHaveLength(0);
  });

  it('rejects stale candidate bundle before transport', async () => {
    const controller = dirtyController();
    const candidate = createResponsiveCanvasV2RevisionFromParent(controller.toBundle(), 'client', 'r1', 2);
    const next = structuredClone(controller.snapshot.active.document);
    next.items[0].frame.x = 96;
    controller.applyActive({ status: 'committed', document: next, collisionIds: [] });
    const transport = new Transport();
    const result = await saveResponsiveV2EditorCandidate({ transport, capabilities: capabilities(true), controller, baseRevision: 'r1', candidate });
    expect(result).toEqual({ status: 'stale', reason: 'bundle-changed' });
    expect(transport.requests).toHaveLength(0);
  });

  it('returns breakpoint-aware conflict session', async () => {
    const controller = dirtyController();
    const candidate = createResponsiveCanvasV2RevisionFromParent(controller.toBundle(), 'client', 'r1', 2);
    const transport = new Transport('conflict');
    const result = await saveResponsiveV2EditorCandidate({ transport, capabilities: capabilities(true), controller, baseRevision: 'r1', candidate });
    expect(result.status).toBe('conflict');
    if (result.status !== 'conflict') throw new Error('Expected conflict');
    expect(result.conflict.base.revision).toBe('r1');
    expect(result.conflict.local.revision).toBe(candidate.revision);
    expect(result.conflict.remote.revision).toBe('remote-r2');
    expect(result.conflict.merge.conflicts.map((item) => item.breakpoint)).toContain('desktop');
  });

  it('resolves selected breakpoint against the remote revision', async () => {
    const controller = dirtyController();
    const candidate = createResponsiveCanvasV2RevisionFromParent(controller.toBundle(), 'client', 'r1', 2);
    const transport = new Transport('conflict-once');
    const first = await saveResponsiveV2EditorCandidate({ transport, capabilities: capabilities(true), controller, baseRevision: 'r1', candidate });
    if (first.status !== 'conflict') throw new Error('Expected conflict');
    const resolved = await resolveResponsiveV2EditorConflict({
      transport,
      capabilities: capabilities(true),
      conflict: first.conflict,
      selections: { desktop: 'local' },
      now: () => 4,
    });
    expect(resolved.status).toBe('saved');
    if (resolved.status !== 'saved') throw new Error('Expected saved resolution');
    expect(resolved.envelope.parentRevision).toBe('remote-r2');
    expect(resolved.envelope.bundle.documents.desktop?.items[0].frame.x).toBe(80);
    expect(transport.requests).toHaveLength(2);
  });
});

import { describe, expect, it } from 'vitest';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { createResponsiveCanvasV2Revision } from './responsive-v2-revision';
import { createResponsiveCanvasV2SavePreview } from './responsive-v2-save-preview';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 200, height: 120 }, locked: true },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 260, y: 20, width: 200, height: 120 } },
    ],
    constraints: [{ id: 'b-below-a', kind: 'below', sourceId: 'b', targetId: 'a', gap: 12 }],
  };
}

function capabilities(write = true): DashboardServerCapabilities {
  return {
    readableDocumentVersions: new Set([1, 2]),
    writableDocumentVersions: new Set([1]),
    revisionSync: true,
    maxItems: 2000,
    responsiveCanvasV2: {
      read: true,
      write,
      atomicRevision: true,
      breakpoints: new Set(['mobile', 'tablet', 'desktop', 'wide']),
    },
  };
}

describe('responsive canvas v2 save preview', () => {
  it('reports no write for a clean recovered draft even when server write is available', () => {
    const controller = new ResponsiveV2DraftController(document());
    const base = createResponsiveCanvasV2Revision(controller.toBundle(), 'server', undefined, 100);
    const preview = createResponsiveCanvasV2SavePreview(controller, capabilities(), 'client', base, { now: 200 });
    expect(preview.hasLocalChanges).toBe(false);
    expect(preview.wouldWrite).toBe(false);
    expect(preview.baseRevision).toBe(base.revision);
    expect(preview.candidate.parentRevision).toBe(base.revision);
    expect(preview.breakpoints[0]).toMatchObject({ breakpoint: 'desktop', itemCount: 2, lockedItemCount: 1, constraintCount: 1, dirty: false });
  });

  it('marks only changed breakpoints dirty and allows a ready write', () => {
    const controller = new ResponsiveV2DraftController(document());
    controller.switchTo('mobile');
    const mobile = controller.snapshot.active.document;
    controller.applyActive({
      status: 'committed',
      document: { ...mobile, items: mobile.items.map((item) => ({ ...item, frame: { ...item.frame, y: item.frame.y + 16 } })) },
      collisionIds: [],
    }, false);
    const preview = createResponsiveCanvasV2SavePreview(controller, capabilities(), 'client', undefined, { now: 200 });
    expect(preview.hasLocalChanges).toBe(true);
    expect(preview.wouldWrite).toBe(true);
    expect(preview.dirtyBreakpoints).toEqual(['mobile']);
    expect(preview.breakpoints.find((item) => item.breakpoint === 'mobile')?.dirty).toBe(true);
    expect(preview.breakpoints.find((item) => item.breakpoint === 'desktop')?.dirty).toBe(false);
  });

  it('exposes readiness blockers and refuses the preview write while server writes are disabled', () => {
    const controller = new ResponsiveV2DraftController(document());
    const desktop = controller.snapshot.active.document;
    controller.applyActive({
      status: 'committed',
      document: { ...desktop, items: desktop.items.map((item) => ({ ...item, frame: { ...item.frame, x: item.frame.x + 8 } })) },
      collisionIds: [],
    }, false);
    const preview = createResponsiveCanvasV2SavePreview(controller, capabilities(false), 'client', undefined, { now: 200 });
    expect(preview.hasLocalChanges).toBe(true);
    expect(preview.wouldWrite).toBe(false);
    expect(preview.readiness.blockers).toContain('write-disabled');
  });

  it('blocks a candidate while conflict resolution is still incomplete', () => {
    const controller = new ResponsiveV2DraftController(document());
    const desktop = controller.snapshot.active.document;
    controller.applyActive({ status: 'committed', document: { ...desktop, title: 'Changed' }, collisionIds: [] }, false);
    const preview = createResponsiveCanvasV2SavePreview(controller, capabilities(), 'client', undefined, {
      now: 200,
      hasUnresolvedConflict: true,
    });
    expect(preview.wouldWrite).toBe(false);
    expect(preview.readiness.blockers).toContain('unresolved-conflict');
  });
});

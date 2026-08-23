import { describe, expect, it } from 'vitest';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { ResponsiveCanvasV2SavePreviewSession } from './responsive-v2-save-preview-session';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 200, height: 120 } }],
  };
}

function capabilities(): DashboardServerCapabilities {
  return {
    readableDocumentVersions: new Set([1, 2]),
    writableDocumentVersions: new Set([1]),
    revisionSync: true,
    maxItems: 2000,
    responsiveCanvasV2: {
      contractVersion: 1,
      contractCompatible: true,
      read: true,
      write: false,
      atomicRevision: true,
      breakpoints: new Set(['mobile', 'tablet', 'desktop', 'wide']),
    },
  };
}

describe('responsive save preview session', () => {
  it('keeps candidate revision stable while semantic inputs are unchanged', () => {
    let now = 100;
    const controller = new ResponsiveV2DraftController(document());
    const session = new ResponsiveCanvasV2SavePreviewSession('client-a', () => ++now);
    const first = session.preview({ controller, capabilities: capabilities(), baseRevision: 'r1' });
    const second = session.preview({ controller, capabilities: capabilities(), baseRevision: 'r1' });
    expect(second).toBe(first);
    expect(second.candidate.revision).toBe(first.candidate.revision);
  });

  it('rotates candidate revision after a real draft change', () => {
    let now = 100;
    const controller = new ResponsiveV2DraftController(document());
    const session = new ResponsiveCanvasV2SavePreviewSession('client-a', () => ++now);
    const first = session.preview({ controller, capabilities: capabilities() });
    const desktop = controller.snapshot.active.document;
    controller.applyActive({
      status: 'committed',
      document: { ...desktop, items: desktop.items.map((item) => ({ ...item, frame: { ...item.frame, x: item.frame.x + 8 } })) },
      collisionIds: [],
    }, false);
    const second = session.preview({ controller, capabilities: capabilities() });
    expect(second.candidate.revision).not.toBe(first.candidate.revision);
    expect(second.dirtyBreakpoints).toEqual(['desktop']);
  });

  it('rotates candidate revision when the server base revision changes', () => {
    let now = 100;
    const controller = new ResponsiveV2DraftController(document());
    const session = new ResponsiveCanvasV2SavePreviewSession('client-a', () => ++now);
    const first = session.preview({ controller, capabilities: capabilities(), baseRevision: 'r1' });
    const second = session.preview({ controller, capabilities: capabilities(), baseRevision: 'r2' });
    expect(second.candidate.revision).not.toBe(first.candidate.revision);
    expect(second.baseRevision).toBe('r2');
  });
});

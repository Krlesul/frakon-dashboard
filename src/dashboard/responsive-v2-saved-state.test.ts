import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { createResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { createResponsiveCanvasV2RevisionFromParent } from './responsive-v2-revision';
import { responsiveV2SavedState } from './responsive-v2-saved-state';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'saved-state',
    title: 'Saved state',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 240, height: 120 } }],
  };
}

describe('responsive v2 saved state', () => {
  it('projects a clean post-save parent state', () => {
    const desktop = document();
    const controller = new ResponsiveV2DraftController(desktop);
    controller.applyActive({ status: 'committed', document: { ...desktop, items: desktop.items.map((item) => ({ ...item, frame: { ...item.frame, x: 80 } })) }, collisionIds: [] }, false);
    const bundle = createResponsiveCanvasV2Bundle({ desktop: controller.snapshot.active.document }, 'desktop');
    const envelope = createResponsiveCanvasV2RevisionFromParent(bundle, 'client', 'base-r1', 1234);
    controller.replaceFromBundle(envelope.bundle, 'desktop');

    expect(responsiveV2SavedState(controller, envelope)).toEqual({
      revision: envelope.revision,
      activeBreakpoint: 'desktop',
      dirtyBreakpoints: [],
      canUndo: false,
      canRedo: false,
    });
  });
});

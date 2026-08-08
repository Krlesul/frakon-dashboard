import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { ResponsiveV2EditorController } from './responsive-v2-editor-controller';

function base(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'responsive-editor',
    title: 'Responsive editor',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x: 120, y: 40, width: 300, height: 160 } }],
  };
}

describe('ResponsiveV2EditorController', () => {
  it('follows viewport width only while auto mode is active', () => {
    const controller = new ResponsiveV2EditorController(new ResponsiveV2DraftController(base()), 390, { kind: 'auto' });
    expect(controller.snapshot.draft.activeBreakpoint).toBe('mobile');
    controller.resize(900);
    expect(controller.snapshot.draft.activeBreakpoint).toBe('tablet');
    controller.resize(1500);
    expect(controller.snapshot.draft.activeBreakpoint).toBe('wide');
  });

  it('keeps an explicitly selected manual breakpoint across resize', () => {
    const controller = new ResponsiveV2EditorController(new ResponsiveV2DraftController(base()), 390, { kind: 'auto' });
    controller.selectBreakpoint('desktop');
    expect(controller.snapshot.mode).toEqual({ kind: 'manual', breakpoint: 'desktop' });
    controller.resize(360);
    expect(controller.snapshot.draft.activeBreakpoint).toBe('desktop');
  });

  it('can return from manual selection to automatic breakpoint detection', () => {
    const controller = new ResponsiveV2EditorController(new ResponsiveV2DraftController(base()), 1400);
    controller.selectBreakpoint('desktop');
    controller.resize(390);
    expect(controller.snapshot.draft.activeBreakpoint).toBe('desktop');
    controller.setMode({ kind: 'auto' });
    expect(controller.snapshot.draft.activeBreakpoint).toBe('mobile');
  });

  it('resets only the active breakpoint draft', () => {
    const draft = new ResponsiveV2DraftController(base());
    const controller = new ResponsiveV2EditorController(draft, 390, { kind: 'auto' });
    const mobile = draft.snapshot.active.document;
    draft.applyActive({
      status: 'committed',
      document: { ...mobile, items: mobile.items.map((item) => ({ ...item, frame: { ...item.frame, y: item.frame.y + 32 } })) },
      collisionIds: [],
    }, false);
    expect(draft.snapshot.dirtyBreakpoints).toContain('mobile');
    controller.resetActiveBreakpoint();
    expect(draft.snapshot.dirtyBreakpoints).not.toContain('mobile');
  });
});

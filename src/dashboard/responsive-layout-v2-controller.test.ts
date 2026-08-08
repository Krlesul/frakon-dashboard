import { describe, expect, it } from 'vitest';
import { ResponsiveCanvasV2Controller } from './responsive-layout-v2-controller';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function desktop(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1200, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [
      { id: 'a', card: { type: 'tile', entity: 'light.a' }, frame: { x: 120, y: 40, width: 300, height: 160 } },
      { id: 'b', card: { type: 'tile', entity: 'light.b' }, frame: { x: 600, y: 280, width: 360, height: 180 } },
    ],
  };
}

const widths = { mobile: 400, tablet: 800, desktop: 1200, wide: 1600 } as const;

describe('responsive canvas v2 controller', () => {
  it('derives a missing active breakpoint on demand', () => {
    const controller = new ResponsiveCanvasV2Controller({ desktop: desktop() }, 'desktop', widths);
    const snapshot = controller.setActiveBreakpoint('tablet');
    expect(snapshot.activeBreakpoint).toBe('tablet');
    expect(snapshot.activeDocument?.layout.width).toBe(800);
    expect(snapshot.activeDocument?.breakpoint).toBe('tablet');
  });

  it('switches breakpoint from viewport width', () => {
    const controller = new ResponsiveCanvasV2Controller({ desktop: desktop() }, 'desktop', widths);
    expect(controller.setViewportWidth(500).activeBreakpoint).toBe('mobile');
    expect(controller.setViewportWidth(900).activeBreakpoint).toBe('tablet');
    expect(controller.setViewportWidth(1300).activeBreakpoint).toBe('desktop');
    expect(controller.setViewportWidth(1700).activeBreakpoint).toBe('wide');
  });

  it('keeps active geometry breakpoint-specific while synchronizing shared card state', () => {
    const controller = new ResponsiveCanvasV2Controller({ desktop: desktop() }, 'desktop', widths);
    const tablet = controller.setActiveBreakpoint('tablet').activeDocument!;
    const tabletFrame = structuredClone(tablet.items[0].frame);
    const changedDesktop = controller.setActiveBreakpoint('desktop').activeDocument!;
    changedDesktop.items[0].card = { type: 'tile', entity: 'switch.changed' };
    changedDesktop.items[0].frame.x = 300;
    controller.updateActiveDocument(changedDesktop);
    const after = controller.setActiveBreakpoint('tablet').activeDocument!;
    expect(after.items[0].card).toEqual({ type: 'tile', entity: 'switch.changed' });
    expect(after.items[0].frame).toEqual(tabletFrame);
  });

  it('can update only the active layout without propagating shared state', () => {
    const controller = new ResponsiveCanvasV2Controller({ desktop: desktop() }, 'desktop', widths);
    const mobileBefore = controller.setActiveBreakpoint('mobile').activeDocument!;
    const desktopDoc = controller.setActiveBreakpoint('desktop').activeDocument!;
    desktopDoc.items[0].card = { type: 'changed-only-here' };
    controller.updateActiveDocument(desktopDoc, { synchronizeSharedState: false });
    expect(controller.setActiveBreakpoint('mobile').activeDocument?.items[0].card).toEqual(mobileBefore.items[0].card);
  });
});

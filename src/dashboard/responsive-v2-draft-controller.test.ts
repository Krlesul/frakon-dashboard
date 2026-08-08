import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';

function base(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'responsive',
    title: 'Responsive',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [{ id: 'a', card: { type: 'custom:a', entity: 'sensor.a' }, frame: { x: 120, y: 40, width: 300, height: 160 } }],
  };
}

describe('ResponsiveV2DraftController', () => {
  it('keeps independent history for each breakpoint', () => {
    const controller = new ResponsiveV2DraftController(base());
    controller.applyActive({ status: 'committed', document: { ...controller.snapshot.active.document, items: [{ ...controller.snapshot.active.document.items[0], frame: { x: 200, y: 40, width: 300, height: 160 } }] }, collisionIds: [] }, false);
    expect(controller.snapshot.active.document.items[0].frame.x).toBe(200);

    controller.switchTo('tablet');
    const tabletX = controller.snapshot.active.document.items[0].frame.x;
    controller.applyActive({ status: 'committed', document: { ...controller.snapshot.active.document, items: [{ ...controller.snapshot.active.document.items[0], frame: { ...controller.snapshot.active.document.items[0].frame, x: tabletX + 24 } }] }, collisionIds: [] }, false);
    expect(controller.snapshot.active.canUndo).toBe(true);

    controller.switchTo('desktop');
    expect(controller.snapshot.active.document.items[0].frame.x).toBe(200);
    controller.undo();
    expect(controller.snapshot.active.document.items[0].frame.x).toBe(120);

    controller.switchTo('tablet');
    expect(controller.snapshot.active.document.items[0].frame.x).toBe(tabletX + 24);
  });

  it('synchronizes shared card state without replacing other breakpoint geometry', () => {
    const controller = new ResponsiveV2DraftController(base());
    controller.switchTo('tablet');
    const tabletFrame = structuredClone(controller.snapshot.active.document.items[0].frame);
    controller.switchTo('desktop');
    const desktop = controller.snapshot.active.document;
    const next = {
      ...desktop,
      items: desktop.items.map((item) => item.id === 'a' ? { ...item, card: { ...item.card, entity: 'sensor.changed' } } : item),
    };
    controller.applyActive({ status: 'committed', document: next, collisionIds: [] }, true);
    controller.switchTo('tablet');
    expect(controller.snapshot.active.document.items[0].card.entity).toBe('sensor.changed');
    expect(controller.snapshot.active.document.items[0].frame).toEqual(tabletFrame);
  });

  it('tracks dirty breakpoints independently', () => {
    const controller = new ResponsiveV2DraftController(base());
    controller.switchTo('mobile');
    const mobile = controller.snapshot.active.document;
    controller.applyActive({ status: 'committed', document: { ...mobile, items: mobile.items.map((item) => ({ ...item, frame: { ...item.frame, y: item.frame.y + 16 } })) }, collisionIds: [] }, false);
    expect(controller.snapshot.dirtyBreakpoints).toContain('mobile');
    expect(controller.snapshot.dirtyBreakpoints).not.toContain('desktop');
  });

  it('copies another breakpoint layout into the active history as one undoable step', () => {
    const controller = new ResponsiveV2DraftController(base());
    controller.switchTo('mobile');
    const before = controller.snapshot.active.document.items[0].frame.x;
    controller.applyActive({ status: 'committed', document: { ...controller.snapshot.active.document, items: controller.snapshot.active.document.items.map((item) => ({ ...item, frame: { ...item.frame, x: item.frame.x + 30 } })) }, collisionIds: [] }, false);
    expect(controller.snapshot.active.document.items[0].frame.x).not.toBe(before);
    controller.copyLayoutFrom('desktop', 'mobile');
    const copied = controller.snapshot.active.document.items[0].frame.x;
    expect(copied).toBeCloseTo(32.5);
    controller.undo();
    expect(controller.snapshot.active.document.items[0].frame.x).not.toBe(copied);
  });
});

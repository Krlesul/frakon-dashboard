import { describe, expect, it } from 'vitest';
import { DashboardV2DraftController } from './dashboard-v2-draft-controller';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(x = 20): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 400, minHeight: 240, snap: { enabled: true, size: 10 } },
    items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x, y: 20, width: 80, height: 80 } }],
  };
}

describe('DashboardV2DraftController', () => {
  it('tracks dirty state and undo/redo around committed drafts', () => {
    const controller = new DashboardV2DraftController(doc());
    controller.apply({ status: 'committed', document: doc(40), collisionIds: [] });
    expect(controller.snapshot.dirty).toBe(true);
    expect(controller.snapshot.canUndo).toBe(true);
    expect(controller.undo().document.items[0]?.frame.x).toBe(20);
    expect(controller.snapshot.dirty).toBe(false);
    expect(controller.redo().document.items[0]?.frame.x).toBe(40);
  });

  it('ignores collision results for history', () => {
    const controller = new DashboardV2DraftController(doc());
    controller.apply({ status: 'collision', document: doc(40), collisionIds: ['a'] });
    expect(controller.snapshot.document.items[0]?.frame.x).toBe(20);
    expect(controller.snapshot.canUndo).toBe(false);
  });

  it('can nudge through the shared v2 interaction rules', () => {
    const controller = new DashboardV2DraftController(doc());
    const result = controller.nudge(['a'], 'ArrowRight');
    expect(result?.status).toBe('committed');
    expect(controller.snapshot.document.items[0]?.frame.x).toBe(30);
    expect(controller.snapshot.dirty).toBe(true);
  });

  it('reset establishes a fresh server base and clears history', () => {
    const controller = new DashboardV2DraftController(doc());
    controller.apply({ status: 'committed', document: doc(40), collisionIds: [] });
    const state = controller.reset(doc(60));
    expect(state.document.items[0]?.frame.x).toBe(60);
    expect(state.dirty).toBe(false);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
  });
});

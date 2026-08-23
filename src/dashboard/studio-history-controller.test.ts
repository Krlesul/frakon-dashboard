import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocument } from './layout-model';
import { StudioHistoryController } from './studio-history-controller';

function dashboard(x = 0): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 72,
    gap: 12,
    items: [
      { id: 'energy', card: { type: 'custom:frakon-energy-card' }, x, y: 0, w: 4, h: 3 },
    ],
  };
}

describe('StudioHistoryController', () => {
  it('keeps temporary previews outside committed history', () => {
    const controller = new StudioHistoryController(dashboard());
    controller.beginPreview(dashboard(4));

    expect(controller.visible.items[0].x).toBe(4);
    expect(controller.committed.items[0].x).toBe(0);
    expect(controller.canUndo).toBe(false);
    expect(controller.previewActive).toBe(true);
  });

  it('commits a complete preview as one undo step', () => {
    const controller = new StudioHistoryController(dashboard());
    controller.beginPreview(dashboard(2));
    controller.updatePreview(dashboard(6));
    controller.commitPreview();

    expect(controller.committed.items[0].x).toBe(6);
    expect(controller.canUndo).toBe(true);
    expect(controller.undo().items[0].x).toBe(0);
    expect(controller.canUndo).toBe(false);
    expect(controller.canRedo).toBe(true);
    expect(controller.redo().items[0].x).toBe(6);
  });

  it('records auto-layout preview only when explicitly applied', () => {
    const controller = new StudioHistoryController(dashboard());
    controller.beginPreview(dashboard(3), 'auto-layout');
    controller.updatePreview(dashboard(7));

    expect(controller.canUndo).toBe(false);
    expect(controller.committed.items[0].x).toBe(0);

    controller.commitPreview();
    expect(controller.committed.items[0].x).toBe(7);
    expect(controller.snapshot().lastSource).toBe('auto-layout');
    expect(controller.undo().items[0].x).toBe(0);
  });

  it('cancels an auto-layout preview without creating history', () => {
    const controller = new StudioHistoryController(dashboard());
    controller.beginPreview(dashboard(8), 'auto-layout');
    controller.cancelPreview();

    expect(controller.committed.items[0].x).toBe(0);
    expect(controller.canUndo).toBe(false);
    expect(controller.snapshot().lastSource).toBeUndefined();
  });

  it('cancels a preview without creating history', () => {
    const controller = new StudioHistoryController(dashboard());
    controller.beginPreview(dashboard(5));
    controller.cancelPreview();

    expect(controller.visible.items[0].x).toBe(0);
    expect(controller.previewActive).toBe(false);
    expect(controller.canUndo).toBe(false);
  });

  it('clears an active preview before normal document changes', () => {
    const controller = new StudioHistoryController(dashboard());
    controller.beginPreview(dashboard(3));
    controller.push(dashboard(7), 'move');

    expect(controller.previewActive).toBe(false);
    expect(controller.committed.items[0].x).toBe(7);
    expect(controller.snapshot().lastSource).toBe('move');
  });

  it('rejects preview updates before a preview session starts', () => {
    const controller = new StudioHistoryController(dashboard());
    expect(() => controller.updatePreview(dashboard(1))).toThrow(/beginPreview/);
  });
});

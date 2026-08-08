import { describe, expect, it } from 'vitest';
import { DashboardCanvasV2ClipboardController } from './dashboard-canvas-v2-clipboard-controller';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'canvas',
    title: 'Canvas',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 600, minHeight: 400, snap: { enabled: true, size: 10 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 40, y: 40, width: 120, height: 80 } },
      { id: 'locked', card: { type: 'custom:locked' }, frame: { x: 220, y: 40, width: 120, height: 80 }, locked: true },
    ],
  };
}

describe('DashboardCanvasV2ClipboardController', () => {
  it('keeps a defensive clipboard snapshot and pastes it later', () => {
    const controller = new DashboardCanvasV2ClipboardController();
    expect(controller.canPaste).toBe(false);
    expect(controller.copy(doc(), ['a'])).toBe(true);
    expect(controller.canPaste).toBe(true);
    const copy = controller.current!;
    copy.items[0].card.type = 'changed';
    expect(controller.current?.items[0].card.type).toBe('custom:a');
    const result = controller.paste(doc(), { x: 40, y: 180 });
    expect(result.status).toBe('committed');
    expect(result.selectedIds).toEqual(['a-copy']);
  });

  it('does not replace an existing clipboard when copy selection is unusable', () => {
    const controller = new DashboardCanvasV2ClipboardController();
    expect(controller.copy(doc(), ['a'])).toBe(true);
    expect(controller.copy(doc(), ['locked'])).toBe(false);
    expect(controller.canPaste).toBe(true);
    expect(controller.current?.items.map((item) => item.id)).toEqual(['a']);
  });

  it('can clear the clipboard explicitly', () => {
    const controller = new DashboardCanvasV2ClipboardController();
    controller.copy(doc(), ['a']);
    controller.clear();
    expect(controller.canPaste).toBe(false);
    expect(controller.paste(doc()).status).toBe('invalid');
  });
});

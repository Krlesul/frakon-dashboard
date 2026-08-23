import { describe, expect, it } from 'vitest';
import { dashboardCanvasRenderModel } from './dashboard-canvas-render-model';
import type { FrakonDashboardDocument } from './layout-model';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

const v1: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Grid',
  breakpoint: 'desktop',
  columns: 4,
  rowHeight: 50,
  gap: 10,
  items: [{ id: 'a', x: 1, y: 2, w: 2, h: 2, card: { type: 'custom:a' } }],
};

const v2: FrakonDashboardDocumentV2 = {
  version: 2,
  id: 'home',
  title: 'Canvas',
  breakpoint: 'desktop',
  layout: { mode: 'canvas', width: 1000, minHeight: 600, snap: { enabled: true, size: 8 } },
  items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x: 100, y: 50, width: 200, height: 120 } }],
};

describe('dashboardCanvasRenderModel', () => {
  it('projects v1 grid documents into editable canvas placements', () => {
    const model = dashboardCanvasRenderModel(v1, 430);
    expect(model.sourceVersion).toBe(1);
    expect(model.editable).toBe(true);
    expect(model.items[0]).toMatchObject({ x: 110, y: 120, width: 210, height: 110 });
  });

  it('scales native v2 frames to the current container width without mutating geometry', () => {
    const model = dashboardCanvasRenderModel(v2, 500);
    expect(model.sourceVersion).toBe(2);
    expect(model.editable).toBe(false);
    expect(model.items[0]).toMatchObject({ x: 50, y: 25, width: 100, height: 60 });
    expect(model.minHeight).toBe(300);
  });
});

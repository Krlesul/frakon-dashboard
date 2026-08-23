import { describe, expect, it } from 'vitest';
import { frakonCardCatalog } from './card-catalog';
import { insertDashboardCanvasV2Card } from './dashboard-canvas-v2-insert-card';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'canvas',
    title: 'Canvas',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1200, minHeight: 500, snap: { enabled: true, size: 10 } },
    items: [
      { id: 'frakon-light-card', card: { type: 'custom:frakon-light-card', entity: 'light.existing' }, frame: { x: 0, y: 0, width: 300, height: 260 } },
    ],
  };
}

describe('insertDashboardCanvasV2Card', () => {
  it('creates a unique card id and places it without collision', () => {
    const light = frakonCardCatalog.find((entry) => entry.type === 'custom:frakon-light-card')!;
    const result = insertDashboardCanvasV2Card(doc(), light, 'light.kitchen');
    expect(result.status).toBe('committed');
    expect(result.selectedIds).toEqual(['frakon-light-card-2']);
    const inserted = result.document.items.find((item) => item.id === 'frakon-light-card-2')!;
    expect(inserted.card).toMatchObject({ type: 'custom:frakon-light-card', entity: 'light.kitchen' });
    expect(inserted.frame.x >= 300 || inserted.frame.y >= 260).toBe(true);
  });

  it('extends minHeight when the first free placement is below existing content', () => {
    const source = doc();
    source.layout.width = 300;
    source.items[0].frame = { x: 0, y: 0, width: 300, height: 500 };
    const sensor = frakonCardCatalog.find((entry) => entry.type === 'custom:frakon-sensor-card')!;
    const result = insertDashboardCanvasV2Card(source, sensor);
    const inserted = result.document.items.at(-1)!;
    expect(inserted.frame.y).toBeGreaterThanOrEqual(500);
    expect(result.document.layout.minHeight).toBeGreaterThan(500);
  });

  it('uses catalog defaults for placeholder configuration', () => {
    const climate = frakonCardCatalog.find((entry) => entry.type === 'custom:frakon-climate-card')!;
    const result = insertDashboardCanvasV2Card({ ...doc(), items: [] }, climate);
    expect(result.document.items[0].card).toMatchObject({ type: 'custom:frakon-climate-card', entity: 'climate.placeholder', step: 0.5 });
  });
});

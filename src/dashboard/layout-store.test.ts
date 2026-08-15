import { describe, expect, it } from 'vitest';
import { exportDashboard, importDashboard } from './layout-store';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  items: [
    { id: 'front', x: 8, y: 7, w: 3, h: 2, card: { type: 'custom:front' } },
    { id: 'hidden', x: 1, y: 4, w: 2, h: 2, hidden: true, card: { type: 'custom:hidden' } },
    { id: 'back', x: 0, y: 0, w: 2, h: 2, card: { type: 'custom:back' } },
  ],
  constraints: [
    { id: 'hidden-left-front', kind: 'align-left', sourceId: 'hidden', targetId: 'front', priority: 40 },
  ],
};

describe('legacy dashboard import/export', () => {
  it('round-trips exact geometry, serialized z-order, hidden state and constraints', () => {
    const imported = importDashboard(exportDashboard(document));
    expect(imported.items).toEqual(document.items);
    expect(imported.items.map((item) => item.id)).toEqual(['front', 'hidden', 'back']);
    expect(imported.constraints).toEqual(document.constraints);
  });

  it('rejects invalid JSON and malformed recognized-version documents', () => {
    expect(() => importDashboard('{')).toThrow(/Invalid FRAKON dashboard JSON/);
    expect(() => importDashboard(JSON.stringify({
      version: 1,
      id: 'home',
      title: 'Broken',
      breakpoint: 'desktop',
      columns: 12,
      rowHeight: 48,
      gap: 12,
      items: [{ id: 'bad', card: {}, x: 0, y: 0, w: 'bad', h: 2 }],
    }))).toThrow(/Invalid FRAKON dashboard payload/);
  });

  it('rejects duplicate ids and dangling constraints through the shared schema guard', () => {
    const duplicate = structuredClone(document);
    duplicate.items.push(structuredClone(duplicate.items[0]));
    expect(() => importDashboard(JSON.stringify(duplicate))).toThrow(/Invalid FRAKON dashboard payload/);

    const dangling = structuredClone(document);
    dangling.constraints = [
      { id: 'bad', kind: 'align-left', sourceId: 'hidden', targetId: 'missing' },
    ];
    expect(() => importDashboard(JSON.stringify(dangling))).toThrow(/Invalid FRAKON dashboard payload/);
  });

  it('rejects already-overlapping layouts instead of silently moving imported cards', () => {
    const overlapping = structuredClone(document);
    overlapping.items[2] = {
      ...overlapping.items[2],
      x: overlapping.items[0].x,
      y: overlapping.items[0].y,
      w: overlapping.items[0].w,
      h: overlapping.items[0].h,
    };
    expect(() => importDashboard(JSON.stringify(overlapping))).toThrow(/contains overlapping items/);
  });
});

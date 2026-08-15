import { describe, expect, it } from 'vitest';
import { isDashboardDocumentV2, migrateDashboardV1ToV2, normalizeDashboardV2 } from './layout-model-v2';
import type { FrakonDashboardDocument } from './layout-model';

const v1: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 4,
  rowHeight: 50,
  gap: 10,
  items: [
    { id: 'a', x: 1, y: 2, w: 2, h: 2, minW: 2, minH: 2, maxW: 3, maxH: 4, card: { type: 'custom:a' } },
    { id: 'b', x: 0, y: 0, w: 1, h: 1, locked: true, card: { type: 'custom:b' } },
  ],
};

describe('layout model v2', () => {
  it('migrates a v1 grid into explicit canvas frames without changing card configs', () => {
    const migrated = migrateDashboardV1ToV2(v1, 430);
    expect(migrated.version).toBe(2);
    expect(migrated.layout).toMatchObject({ mode: 'canvas', width: 430 });
    expect(migrated.items.find((item) => item.id === 'a')).toMatchObject({
      card: { type: 'custom:a' },
      frame: { x: 110, y: 120, width: 210, height: 110 },
      minWidth: 210,
      minHeight: 110,
      maxWidth: 320,
      maxHeight: 230,
    });
    expect(migrated.items.find((item) => item.id === 'b')?.locked).toBe(true);
  });

  it('normalizes invalid frames, duplicate ids and item size constraints deterministically', () => {
    const normalized = normalizeDashboardV2({
      version: 2,
      id: 'home',
      title: 'Home',
      breakpoint: 'desktop',
      layout: { mode: 'canvas', width: 300, minHeight: 200, snap: { enabled: true, size: 8 } },
      items: [
        { id: 'a', card: { type: 'custom:a' }, frame: { x: -20, y: -10, width: 900, height: 0 } },
        { id: 'a', card: { type: 'custom:b' }, minWidth: 120, maxWidth: 160, minHeight: 60, frame: { x: 260, y: 10, width: 80, height: 40 } },
      ],
    });
    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0]).toMatchObject({
      card: { type: 'custom:b' },
      frame: { x: 180, y: 10, width: 120, height: 60 },
    });
  });

  it('drops constraints that reference items absent from the canvas document during explicit normalization', () => {
    const normalized = normalizeDashboardV2({
      version: 2,
      id: 'home',
      title: 'Home',
      breakpoint: 'desktop',
      layout: { mode: 'canvas', width: 300, minHeight: 200, snap: { enabled: true, size: 8 } },
      constraints: [
        { id: 'valid', kind: 'below', sourceId: 'a', targetId: 'b' },
        { id: 'missing', kind: 'below', sourceId: 'a', targetId: 'missing' },
      ],
      items: [
        { id: 'a', card: { type: 'custom:a' }, frame: { x: 0, y: 0, width: 100, height: 50 } },
        { id: 'b', card: { type: 'custom:b' }, frame: { x: 120, y: 0, width: 100, height: 50 } },
      ],
    });
    expect(normalized.constraints?.map((constraint) => constraint.id)).toEqual(['valid']);
  });

  it('recognizes only complete valid version 2 canvas documents at the schema boundary', () => {
    const valid = migrateDashboardV1ToV2(v1, 430);
    expect(isDashboardDocumentV2(valid)).toBe(true);
    expect(isDashboardDocumentV2(v1)).toBe(false);
    expect(isDashboardDocumentV2({ version: 2, id: 'x', title: 'x', layout: { mode: 'grid' }, items: [] })).toBe(false);
    expect(isDashboardDocumentV2({ version: 2, id: 'x', title: 'x', breakpoint: 'desktop', layout: { mode: 'canvas' }, items: [] })).toBe(false);
  });

  it('rejects malformed frames, duplicate ids and invalid card payloads at the v2 schema boundary', () => {
    const valid = migrateDashboardV1ToV2(v1, 430);

    const invalidFrame = structuredClone(valid) as unknown as { items: Array<{ frame: Record<string, unknown> }> };
    invalidFrame.items[0].frame.width = 0;
    expect(isDashboardDocumentV2(invalidFrame)).toBe(false);

    const duplicate = structuredClone(valid);
    duplicate.items.push(structuredClone(duplicate.items[0]));
    expect(isDashboardDocumentV2(duplicate)).toBe(false);

    const badCard = structuredClone(valid) as unknown as { items: Array<{ card: Record<string, unknown> }> };
    badCard.items[0].card = {};
    expect(isDashboardDocumentV2(badCard)).toBe(false);
  });

  it('rejects dangling, duplicate and self-referential constraints at the v2 schema boundary', () => {
    const dangling = migrateDashboardV1ToV2(v1, 430);
    dangling.constraints = [{ id: 'bad', kind: 'below', sourceId: 'a', targetId: 'missing' }];
    expect(isDashboardDocumentV2(dangling)).toBe(false);

    const duplicate = migrateDashboardV1ToV2(v1, 430);
    duplicate.constraints = [
      { id: 'same', kind: 'below', sourceId: 'a', targetId: 'b' },
      { id: 'same', kind: 'right-of', sourceId: 'a', targetId: 'b' },
    ];
    expect(isDashboardDocumentV2(duplicate)).toBe(false);

    const self = migrateDashboardV1ToV2(v1, 430);
    self.constraints = [{ id: 'self', kind: 'below', sourceId: 'a', targetId: 'a' }];
    expect(isDashboardDocumentV2(self)).toBe(false);
  });
});

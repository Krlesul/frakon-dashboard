import { describe, expect, it } from 'vitest';
import { decodeDashboardDocument, encodeDashboardDocument } from './dashboard-document-codec';
import { migrateDashboardV1ToV2 } from './layout-model-v2';
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
    { id: 'front', x: 2, y: 4, w: 1, h: 1, card: { type: 'custom:front' } },
    { id: 'hidden', x: 0, y: 2, w: 1, h: 1, hidden: true, card: { type: 'custom:hidden' } },
  ],
  constraints: [
    { id: 'hidden-left-front', kind: 'align-left', sourceId: 'hidden', targetId: 'front', priority: 40 },
  ],
};

function failureReason(source: string): string | undefined {
  const decoded = decodeDashboardDocument(source);
  return decoded.ok ? undefined : decoded.reason;
}

describe('dashboard document codec', () => {
  it('round-trips version 1 z-order, hidden state, exact geometry and constraints', () => {
    const decoded = decodeDashboardDocument(encodeDashboardDocument(v1));
    expect(decoded.ok).toBe(true);
    if (!decoded.ok || decoded.document.version !== 1) return;
    expect(decoded.document.items.map((item) => item.id)).toEqual(['front', 'hidden']);
    expect(decoded.document.items).toEqual(v1.items);
    expect(decoded.document.constraints).toEqual(v1.constraints);
  });

  it('round-trips normalized version 2 canvas documents', () => {
    const v2 = migrateDashboardV1ToV2(v1, 430);
    const decoded = decodeDashboardDocument(encodeDashboardDocument(v2));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.document.version).toBe(2);
      expect(decoded.document.items[0].id).toBe('front');
    }
  });

  it('distinguishes invalid JSON from unsupported versions', () => {
    expect(failureReason('{')).toBe('invalid-json');
    expect(failureReason(JSON.stringify({ version: 99, id: 'x', items: [] }))).toBe('unsupported-version');
  });

  it('rejects malformed documents for recognized versions', () => {
    expect(failureReason(JSON.stringify({ version: 1, id: '', title: 'x', items: [] }))).toBe('invalid-document');
    expect(failureReason(JSON.stringify({ version: 2, id: 'x', title: 'x', layout: { mode: 'canvas' } }))).toBe('invalid-document');
  });

  it('rejects version 1 items with missing, non-finite or invalid geometry/card data', () => {
    const malformed = structuredClone(v1) as unknown as Record<string, unknown>;
    malformed.items = [{ id: 'bad', card: {}, x: 0, y: 0, w: null, h: 2 }];
    expect(failureReason(JSON.stringify(malformed))).toBe('invalid-document');

    const nonFinite = JSON.stringify(v1).replace('"w": 1', '"w": "not-a-number"');
    expect(failureReason(nonFinite)).toBe('invalid-document');
  });

  it('rejects duplicate item ids instead of silently creating ambiguous layer identity', () => {
    const duplicate = structuredClone(v1);
    duplicate.items.push({ ...structuredClone(duplicate.items[0]) });
    expect(failureReason(JSON.stringify(duplicate))).toBe('invalid-document');
  });

  it('rejects dangling, duplicate and self-referential constraints', () => {
    const dangling = structuredClone(v1);
    dangling.constraints = [
      { id: 'dangling', kind: 'align-left', sourceId: 'hidden', targetId: 'missing', priority: 10 },
    ];
    expect(failureReason(JSON.stringify(dangling))).toBe('invalid-document');

    const duplicate = structuredClone(v1);
    duplicate.constraints = [
      ...(v1.constraints ?? []),
      { ...(v1.constraints?.[0] ?? { id: 'x', kind: 'align-left', sourceId: 'hidden', targetId: 'front' }) },
    ];
    expect(failureReason(JSON.stringify(duplicate))).toBe('invalid-document');

    const self = structuredClone(v1);
    self.constraints = [
      { id: 'self', kind: 'align-left', sourceId: 'hidden', targetId: 'hidden', priority: 10 },
    ];
    expect(failureReason(JSON.stringify(self))).toBe('invalid-document');
  });
});

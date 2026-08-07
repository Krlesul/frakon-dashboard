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
  items: [{ id: 'a', x: 0, y: 0, w: 1, h: 1, card: { type: 'custom:a' } }],
};

function failureReason(source: string): string | undefined {
  const decoded = decodeDashboardDocument(source);
  return decoded.ok ? undefined : decoded.reason;
}

describe('dashboard document codec', () => {
  it('round-trips normalized version 1 documents', () => {
    const decoded = decodeDashboardDocument(encodeDashboardDocument(v1));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.document.version).toBe(1);
  });

  it('round-trips normalized version 2 canvas documents', () => {
    const v2 = migrateDashboardV1ToV2(v1, 430);
    const decoded = decodeDashboardDocument(encodeDashboardDocument(v2));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.document.version).toBe(2);
      expect(decoded.document.items[0].id).toBe('a');
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
});

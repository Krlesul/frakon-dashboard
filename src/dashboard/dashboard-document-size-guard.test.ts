import { describe, expect, it } from 'vitest';
import { DASHBOARD_MAX_SERIALIZED_BYTES } from './dashboard-document-limits';
import { isDashboardDocumentV1 } from './dashboard-document-codec';
import { isDashboardDocumentV2, migrateDashboardV1ToV2 } from './layout-model-v2';
import type { FrakonDashboardDocument } from './layout-model';

function v1Document(): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 48,
    gap: 12,
    items: [
      { id: 'card', x: 0, y: 0, w: 2, h: 2, card: { type: 'custom:frakon-card' } },
    ],
  };
}

describe('dashboard schema byte quota', () => {
  it('rejects an oversized canonical-looking v1 card payload', () => {
    const document = v1Document();
    document.items[0].card.payload = 'x'.repeat(DASHBOARD_MAX_SERIALIZED_BYTES);
    expect(isDashboardDocumentV1(document)).toBe(false);
  });

  it('rejects an oversized canonical-looking v2 card payload', () => {
    const document = migrateDashboardV1ToV2(v1Document(), 1200);
    document.items[0].card.payload = 'x'.repeat(DASHBOARD_MAX_SERIALIZED_BYTES);
    expect(isDashboardDocumentV2(document)).toBe(false);
  });

  it('rejects non-finite runtime values nested inside card configuration', () => {
    const v1 = v1Document();
    v1.items[0].card.threshold = Number.NaN;
    expect(isDashboardDocumentV1(v1)).toBe(false);

    const v2 = migrateDashboardV1ToV2(v1Document(), 1200);
    v2.items[0].card.threshold = Number.POSITIVE_INFINITY;
    expect(isDashboardDocumentV2(v2)).toBe(false);
  });
});

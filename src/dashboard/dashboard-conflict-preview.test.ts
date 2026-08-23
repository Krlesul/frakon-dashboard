import { describe, expect, it } from 'vitest';
import { createDashboardConflictSession } from './dashboard-conflict-coordinator';
import { createDashboardConflictPreview } from './dashboard-conflict-preview';
import { compareDashboardRevisions, createDashboardRevision } from './dashboard-revision';
import type { FrakonDashboardDocument } from './layout-model';

const baseDocument: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 80,
  gap: 12,
  items: [
    { id: 'light', x: 0, y: 0, w: 2, h: 2, card: { type: 'custom:frakon-light-card' } },
    { id: 'camera', x: 5, y: 0, w: 3, h: 2, card: { type: 'custom:frakon-camera-card' } },
  ],
};

function conflictSession() {
  const base = createDashboardRevision(baseDocument, 'server', undefined, 10);
  const local = createDashboardRevision({
    ...baseDocument,
    items: baseDocument.items.map((item) => item.id === 'light' ? { ...item, x: 1, w: 3 } : item),
  }, 'tablet', base, 20);
  const remote = createDashboardRevision({
    ...baseDocument,
    items: baseDocument.items.map((item) => item.id === 'light' ? { ...item, y: 2, h: 3 } : item),
  }, 'desktop', base, 30);
  return createDashboardConflictSession(compareDashboardRevisions(local, remote), base);
}

describe('dashboard conflict canvas preview', () => {
  it('returns local and remote geometry for conflicted cards', () => {
    const preview = createDashboardConflictPreview(conflictSession());

    expect(preview.cards).toHaveLength(1);
    expect(preview.cards[0]?.id).toBe('light');
    expect(preview.cards[0]?.local).toMatchObject({ x: 1, y: 0, w: 3, h: 2 });
    expect(preview.cards[0]?.remote).toMatchObject({ x: 0, y: 2, w: 2, h: 3 });
    expect(preview.unresolved).toBe(1);
    expect(preview.resolvedDocumentAvailable).toBe(false);
  });

  it('uses the selected side as the resolved card geometry', () => {
    const preview = createDashboardConflictPreview(conflictSession(), { 'items.light': 'remote' });

    expect(preview.cards[0]?.selected).toBe('remote');
    expect(preview.cards[0]?.resolved).toMatchObject({ x: 0, y: 2, w: 2, h: 3 });
    expect(preview.unresolved).toBe(0);
    expect(preview.resolvedDocumentAvailable).toBe(true);
  });
});

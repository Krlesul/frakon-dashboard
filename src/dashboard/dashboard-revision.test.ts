import { describe, expect, it } from 'vitest';
import {
  chooseDashboardRevision,
  compareDashboardRevisions,
  createDashboardRevision,
  isDashboardRevisionEnvelope,
} from './dashboard-revision';
import { migrateDashboardV1ToV2 } from './layout-model-v2';
import type { FrakonDashboardDocument } from './layout-model';

function dashboard(title: string): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'home',
    title,
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 80,
    gap: 12,
    items: [],
  };
}

describe('dashboard revision model', () => {
  it('recognizes identical revisions', () => {
    const revision = createDashboardRevision(dashboard('Home'), 'client-a', undefined, 100);
    expect(compareDashboardRevisions(revision, structuredClone(revision)).relation).toBe('same');
  });

  it('recognizes local and remote fast-forward relations', () => {
    const base = createDashboardRevision(dashboard('Base'), 'client-a', undefined, 100);
    const local = createDashboardRevision(dashboard('Local'), 'client-a', base, 200);
    const remote = createDashboardRevision(dashboard('Remote'), 'client-b', base, 300);

    expect(compareDashboardRevisions(local, base).relation).toBe('local-ahead');
    expect(compareDashboardRevisions(base, remote).relation).toBe('remote-ahead');
  });

  it('detects concurrent edits from the same parent as a conflict', () => {
    const base = createDashboardRevision(dashboard('Base'), 'client-a', undefined, 100);
    const local = createDashboardRevision(dashboard('Local'), 'client-a', base, 200);
    const remote = createDashboardRevision(dashboard('Remote'), 'client-b', base, 210);

    const comparison = compareDashboardRevisions(local, remote);
    expect(comparison.relation).toBe('conflict');
    expect(chooseDashboardRevision(comparison, 'local').document.title).toBe('Local');
    expect(chooseDashboardRevision(comparison, 'remote').document.title).toBe('Remote');
  });

  it('creates stable but distinct revision identifiers', () => {
    const first = createDashboardRevision(dashboard('Home'), 'client-a', undefined, 100);
    const same = createDashboardRevision(dashboard('Home'), 'client-a', undefined, 100);
    const changed = createDashboardRevision(dashboard('Changed'), 'client-a', first, 101);

    expect(first.revision).toBe(same.revision);
    expect(changed.revision).not.toBe(first.revision);
    expect(changed.parentRevision).toBe(first.revision);
  });

  it('fingerprints layout metadata even when items and timestamp are unchanged', () => {
    const firstDocument = dashboard('Home');
    const secondDocument = { ...dashboard('Home'), gap: 24 };
    const first = createDashboardRevision(firstDocument, 'client-a', undefined, 100);
    const second = createDashboardRevision(secondDocument, 'client-a', undefined, 100);
    expect(second.revision).not.toBe(first.revision);
  });

  it('carries version 2 canvas documents through the same revision relation model', () => {
    const baseDocument = migrateDashboardV1ToV2(dashboard('Home'), 1200);
    const base = createDashboardRevision(baseDocument, 'client-a', undefined, 100);
    const changedDocument = {
      ...baseDocument,
      layout: { ...baseDocument.layout, minHeight: baseDocument.layout.minHeight + 100 },
    };
    const changed = createDashboardRevision(changedDocument, 'client-a', base, 200);
    expect(changed.document.version).toBe(2);
    expect(compareDashboardRevisions(changed, base).relation).toBe('local-ahead');
    expect(changed.revision).not.toBe(base.revision);
  });

  it('refuses to create revisions from non-canonical dashboard documents', () => {
    expect(() => createDashboardRevision(
      { ...dashboard('Bad'), rowHeight: 8 },
      'client-a',
      undefined,
      100,
    )).toThrow(/invalid or non-canonical/i);

    const overlapping: FrakonDashboardDocument = {
      ...dashboard('Overlap'),
      items: [
        { id: 'a', x: 0, y: 0, w: 3, h: 2, card: { type: 'custom:a' } },
        { id: 'b', x: 2, y: 1, w: 3, h: 2, card: { type: 'custom:b' } },
      ],
    };
    expect(() => createDashboardRevision(overlapping, 'client-a', undefined, 100))
      .toThrow(/invalid or non-canonical/i);
  });

  it('validates revision metadata and ancestry before creating a child revision', () => {
    const base = createDashboardRevision(dashboard('Base'), 'client-a', undefined, 100);
    expect(() => createDashboardRevision(dashboard('Home'), '', base, 200)).toThrow(/clientId/i);
    expect(() => createDashboardRevision(dashboard('Home'), 'client-a', base, -1)).toThrow(/updatedAt/i);
    expect(() => createDashboardRevision(dashboard('Home'), 'client-a', {
      ...base,
      document: { ...base.document, id: 'other' },
    }, 200)).toThrow(/previous dashboard revision/i);
  });

  it('validates complete envelopes including expected id and schema version', () => {
    const v1 = createDashboardRevision(dashboard('Home'), 'client-a', undefined, 100);
    expect(isDashboardRevisionEnvelope(v1, 'home', 1)).toBe(true);
    expect(isDashboardRevisionEnvelope(v1, 'other', 1)).toBe(false);
    expect(isDashboardRevisionEnvelope(v1, 'home', 2)).toBe(false);
    expect(isDashboardRevisionEnvelope({ ...v1, revision: '' }, 'home', 1)).toBe(false);
    expect(isDashboardRevisionEnvelope({ ...v1, parentRevision: v1.revision }, 'home', 1)).toBe(false);
    expect(isDashboardRevisionEnvelope({ ...v1, updatedAt: 1.5 }, 'home', 1)).toBe(false);
  });
});

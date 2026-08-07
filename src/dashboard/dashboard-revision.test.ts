import { describe, expect, it } from 'vitest';
import {
  chooseDashboardRevision,
  compareDashboardRevisions,
  createDashboardRevision,
} from './dashboard-revision';
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
});

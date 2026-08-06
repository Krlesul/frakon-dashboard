import { describe, expect, it } from 'vitest';
import {
  createDashboardConflictSession,
  resolveDashboardConflictSelections,
  resolveDashboardConflictSession,
} from './dashboard-conflict-coordinator';
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
    { id: 'camera', x: 3, y: 0, w: 3, h: 2, card: { type: 'custom:frakon-camera-card' } },
  ],
};

describe('dashboard conflict coordinator', () => {
  it('creates a clean merge for independent card changes', () => {
    const base = createDashboardRevision(baseDocument, 'server', undefined, 10);
    const local = createDashboardRevision({
      ...baseDocument,
      items: baseDocument.items.map((item) => item.id === 'light' ? { ...item, x: 1 } : item),
    }, 'tablet', base, 20);
    const remote = createDashboardRevision({
      ...baseDocument,
      items: baseDocument.items.map((item) => item.id === 'camera' ? { ...item, y: 2 } : item),
    }, 'desktop', base, 30);
    const session = createDashboardConflictSession(compareDashboardRevisions(local, remote), base);

    expect(session.merge.conflicts).toHaveLength(0);
    const resolved = resolveDashboardConflictSession(session, 'merged', 'tablet', 40);
    expect(resolved.parentRevision).toBe(remote.revision);
    expect(resolved.document.items.find((item) => item.id === 'light')?.x).toBe(1);
    expect(resolved.document.items.find((item) => item.id === 'camera')?.y).toBe(2);
  });

  it('rejects automatic merge while conflicts remain', () => {
    const base = createDashboardRevision(baseDocument, 'server', undefined, 10);
    const local = createDashboardRevision({ ...baseDocument, title: 'Local' }, 'tablet', base, 20);
    const remote = createDashboardRevision({ ...baseDocument, title: 'Remote' }, 'desktop', base, 30);
    const session = createDashboardConflictSession(compareDashboardRevisions(local, remote), base);

    expect(session.merge.conflicts).toHaveLength(1);
    expect(() => resolveDashboardConflictSession(session, 'merged', 'tablet', 40)).toThrow(
      'Cannot use automatic merge while dashboard conflicts remain unresolved.',
    );
  });

  it('can keep the local document while rebasing onto the remote revision', () => {
    const base = createDashboardRevision(baseDocument, 'server', undefined, 10);
    const local = createDashboardRevision({ ...baseDocument, title: 'Local' }, 'tablet', base, 20);
    const remote = createDashboardRevision({ ...baseDocument, title: 'Remote' }, 'desktop', base, 30);
    const session = createDashboardConflictSession(compareDashboardRevisions(local, remote), base);
    const resolved = resolveDashboardConflictSession(session, 'local', 'tablet', 40);

    expect(resolved.document.title).toBe('Local');
    expect(resolved.parentRevision).toBe(remote.revision);
  });

  it('resolves conflicting paths independently and rebases the result', () => {
    const base = createDashboardRevision(baseDocument, 'server', undefined, 10);
    const local = createDashboardRevision({
      ...baseDocument,
      title: 'Local',
      items: baseDocument.items.map((item) => item.id === 'light' ? { ...item, x: 1 } : item),
    }, 'tablet', base, 20);
    const remote = createDashboardRevision({
      ...baseDocument,
      title: 'Remote',
      items: baseDocument.items.map((item) => item.id === 'light' ? { ...item, x: 2 } : item),
    }, 'desktop', base, 30);
    const session = createDashboardConflictSession(compareDashboardRevisions(local, remote), base);

    const resolved = resolveDashboardConflictSelections(session, {
      title: 'remote',
      'items.light': 'local',
    }, 'tablet', 40);

    expect(resolved.document.title).toBe('Remote');
    expect(resolved.document.items.find((item) => item.id === 'light')?.x).toBe(1);
    expect(resolved.parentRevision).toBe(remote.revision);
  });
});

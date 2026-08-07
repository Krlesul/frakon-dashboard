import { describe, expect, it } from 'vitest';
import {
  createDashboardV2ConflictSession,
  resolveDashboardV2ConflictSelections,
  resolveDashboardV2ConflictSession,
} from './dashboard-conflict-coordinator-v2';
import { createDashboardRevision } from './dashboard-revision';
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

describe('dashboard v2 conflict coordinator', () => {
  it('creates a conflict session and resolves an explicit side into a child revision', () => {
    const baseDocument = migrateDashboardV1ToV2(v1, 430);
    const base = createDashboardRevision(baseDocument, 'server', undefined, 10);
    const localDocument = structuredClone(baseDocument);
    const remoteDocument = structuredClone(baseDocument);
    localDocument.items[0].frame.x = 20;
    remoteDocument.items[0].frame.x = 40;
    const local = createDashboardRevision(localDocument, 'tablet', base, 20);
    const remote = createDashboardRevision(remoteDocument, 'desktop', base, 30);
    const session = createDashboardV2ConflictSession(
      { relation: 'conflict', local, remote },
      base,
    );

    const resolved = resolveDashboardV2ConflictSession(session, 'remote', 'tablet', 40);
    expect(resolved.document.items[0].frame.x).toBe(40);
    expect(resolved.parentRevision).toBe(remote.revision);
  });

  it('requires selections for unresolved canvas conflicts', () => {
    const baseDocument = migrateDashboardV1ToV2(v1, 430);
    const base = createDashboardRevision(baseDocument, 'server', undefined, 10);
    const localDocument = structuredClone(baseDocument);
    const remoteDocument = structuredClone(baseDocument);
    localDocument.items[0].frame.x = 20;
    remoteDocument.items[0].frame.x = 40;
    const local = createDashboardRevision(localDocument, 'tablet', base, 20);
    const remote = createDashboardRevision(remoteDocument, 'desktop', base, 30);
    const session = createDashboardV2ConflictSession(
      { relation: 'conflict', local, remote },
      base,
    );

    expect(() => resolveDashboardV2ConflictSelections(session, {}, 'tablet', 40)).toThrow(/incomplete/);
    const resolved = resolveDashboardV2ConflictSelections(
      session,
      { 'items.a': 'local' },
      'tablet',
      40,
    );
    expect(resolved.document.items[0].frame.x).toBe(20);
    expect(resolved.parentRevision).toBe(remote.revision);
  });
});

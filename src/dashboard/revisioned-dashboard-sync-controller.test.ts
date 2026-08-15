import { describe, expect, it } from 'vitest';
import { createDashboardRevision } from './dashboard-revision';
import { RevisionedDashboardSyncController } from './revisioned-dashboard-sync-controller';
import type { RevisionedDashboardSaveResult, RevisionedDashboardStorage } from './revisioned-dashboard-storage';
import { migrateDashboardV1ToV2 } from './layout-model-v2';
import type { FrakonDashboardDocument } from './layout-model';

const baseDocument: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 80,
  gap: 12,
  items: [],
};

class StorageStub {
  loaded: unknown = createDashboardRevision(baseDocument, 'server', undefined, 10);
  results: RevisionedDashboardSaveResult[] = [];
  saved: FrakonDashboardDocument[] = [];

  async load() {
    return this.loaded;
  }

  async save(document: FrakonDashboardDocument): Promise<RevisionedDashboardSaveResult> {
    this.saved.push(structuredClone(document));
    const result = this.results.shift();
    if (!result) throw new Error('No save result configured.');
    return result;
  }
}

describe('RevisionedDashboardSyncController', () => {
  it('loads and stores the active revision envelope', async () => {
    const storage = new StorageStub();
    const controller = new RevisionedDashboardSyncController(
      storage as unknown as RevisionedDashboardStorage,
      'tablet',
    );

    await controller.load('home');

    const loaded = storage.loaded as { revision: string };
    expect(controller.currentState.envelope?.revision).toBe(loaded.revision);
    expect(controller.currentState.loading).toBe(false);
  });

  it('rejects a valid version 2 envelope on the version 1 sync path', async () => {
    const storage = new StorageStub();
    const v2 = migrateDashboardV1ToV2(baseDocument, 1200);
    storage.loaded = createDashboardRevision(v2, 'server', undefined, 10);
    const controller = new RevisionedDashboardSyncController(
      storage as unknown as RevisionedDashboardStorage,
      'tablet',
    );

    expect(await controller.load('home')).toBeUndefined();
    expect(controller.currentState.envelope).toBeUndefined();
    expect(controller.currentState.error?.message).toMatch(/version 1 revision/i);
  });

  it('creates a conflict session when a concurrent remote revision is reported', async () => {
    const storage = new StorageStub();
    const base = createDashboardRevision(baseDocument, 'server', undefined, 10);
    storage.loaded = base;
    const localDocument = { ...baseDocument, title: 'Local' };
    const local = createDashboardRevision(localDocument, 'tablet', base, 20);
    const remote = createDashboardRevision({ ...baseDocument, title: 'Remote' }, 'desktop', base, 30);
    storage.results.push({
      status: 'conflict',
      comparison: { relation: 'conflict', local, remote },
    });
    const controller = new RevisionedDashboardSyncController(
      storage as unknown as RevisionedDashboardStorage,
      'tablet',
    );
    await controller.load('home');

    await controller.save(localDocument);

    expect(controller.currentState.conflict?.merge.conflicts).toHaveLength(1);
    expect(controller.currentState.saving).toBe(false);
  });

  it('resolves a conflict and clears the conflict state after saving', async () => {
    const storage = new StorageStub();
    const base = createDashboardRevision(baseDocument, 'server', undefined, 10);
    storage.loaded = base;
    const localDocument = { ...baseDocument, title: 'Local' };
    const local = createDashboardRevision(localDocument, 'tablet', base, 20);
    const remote = createDashboardRevision({ ...baseDocument, title: 'Remote' }, 'desktop', base, 30);
    const resolved = createDashboardRevision(localDocument, 'tablet', remote, 40);
    storage.results.push(
      { status: 'conflict', comparison: { relation: 'conflict', local, remote } },
      { status: 'saved', envelope: resolved },
    );
    const controller = new RevisionedDashboardSyncController(
      storage as unknown as RevisionedDashboardStorage,
      'tablet',
      () => 40,
    );
    await controller.load('home');
    await controller.save(localDocument);

    await controller.resolveConflict('local');

    expect(controller.currentState.conflict).toBeUndefined();
    expect(controller.currentState.envelope?.revision).toBe(resolved.revision);
    expect(storage.saved.at(-1)?.title).toBe('Local');
  });

  it('surfaces a persistence block without fabricating a conflict session', async () => {
    const storage = new StorageStub();
    const base = createDashboardRevision(baseDocument, 'server', undefined, 10);
    storage.loaded = base;
    storage.results.push({ status: 'blocked', reason: 'persistence-disabled' });
    const controller = new RevisionedDashboardSyncController(
      storage as unknown as RevisionedDashboardStorage,
      'tablet',
    );
    await controller.load('home');

    await controller.save({ ...baseDocument, title: 'Blocked' });

    expect(controller.currentState.conflict).toBeUndefined();
    expect(controller.currentState.error?.message).toContain('persistence is disabled');
    expect(controller.currentState.saving).toBe(false);
  });
});

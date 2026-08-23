import { describe, expect, it } from 'vitest';
import { createDashboardRevision } from './dashboard-revision';
import { RevisionedDashboardV2SyncController } from './revisioned-dashboard-sync-controller-v2';
import type { RevisionedDashboardSaveResult, RevisionedDashboardStorage } from './revisioned-dashboard-storage';
import { migrateDashboardV1ToV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';
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
const baseDocument = migrateDashboardV1ToV2(v1, 430);

class StorageStub {
  loaded = createDashboardRevision(baseDocument, 'server', undefined, 10);
  results: RevisionedDashboardSaveResult<FrakonDashboardDocumentV2>[] = [];
  requests = 0;

  async load() {
    this.requests += 1;
    return this.loaded;
  }

  async save(document: FrakonDashboardDocumentV2): Promise<RevisionedDashboardSaveResult<FrakonDashboardDocumentV2>> {
    this.requests += 1;
    const result = this.results.shift();
    if (!result) throw new Error(`No save result configured for ${document.id}.`);
    return result;
  }
}

describe('RevisionedDashboardV2SyncController', () => {
  it('blocks reads before the v2 read capability is enabled', async () => {
    const storage = new StorageStub();
    const controller = new RevisionedDashboardV2SyncController(
      storage as unknown as RevisionedDashboardStorage<FrakonDashboardDocumentV2>,
      { readV2: false, writeV2: false, migrateV1ToV2: true },
      'tablet',
    );

    await expect(controller.load('home')).resolves.toBeUndefined();
    expect(storage.requests).toBe(0);
    expect(controller.currentState.error?.message).toContain('reads are disabled');
  });

  it('loads a version 2 envelope in read-only mode', async () => {
    const storage = new StorageStub();
    const controller = new RevisionedDashboardV2SyncController(
      storage as unknown as RevisionedDashboardStorage<FrakonDashboardDocumentV2>,
      { readV2: true, writeV2: false, migrateV1ToV2: true },
      'tablet',
    );

    const loaded = await controller.load('home');
    expect(loaded?.document.version).toBe(2);
    expect(controller.currentState.envelope?.revision).toBe(storage.loaded.revision);
  });

  it('blocks writes before transport when the v2 write capability is disabled', async () => {
    const storage = new StorageStub();
    const controller = new RevisionedDashboardV2SyncController(
      storage as unknown as RevisionedDashboardStorage<FrakonDashboardDocumentV2>,
      { readV2: true, writeV2: false, migrateV1ToV2: true },
      'tablet',
    );
    await controller.load('home');
    const before = storage.requests;

    await expect(controller.save(baseDocument)).resolves.toBeUndefined();
    expect(storage.requests).toBe(before);
    expect(controller.currentState.error?.message).toContain('writes are disabled');
  });

  it('creates a version 2 conflict session when write mode is enabled', async () => {
    const storage = new StorageStub();
    const localDocument = structuredClone(baseDocument);
    const remoteDocument = structuredClone(baseDocument);
    localDocument.items[0].frame.x = 20;
    remoteDocument.items[0].frame.x = 40;
    const local = createDashboardRevision(localDocument, 'tablet', storage.loaded, 20);
    const remote = createDashboardRevision(remoteDocument, 'desktop', storage.loaded, 30);
    storage.results.push({ status: 'conflict', comparison: { relation: 'conflict', local, remote } });
    const controller = new RevisionedDashboardV2SyncController(
      storage as unknown as RevisionedDashboardStorage<FrakonDashboardDocumentV2>,
      { readV2: true, writeV2: true, migrateV1ToV2: true },
      'tablet',
    );
    await controller.load('home');

    await controller.save(localDocument);
    expect(controller.currentState.conflict?.merge.conflicts[0]?.path).toBe('items.a');
  });

  it('resolves a version 2 conflict through the same guarded save path', async () => {
    const storage = new StorageStub();
    const localDocument = structuredClone(baseDocument);
    const remoteDocument = structuredClone(baseDocument);
    localDocument.items[0].frame.x = 20;
    remoteDocument.items[0].frame.x = 40;
    const local = createDashboardRevision(localDocument, 'tablet', storage.loaded, 20);
    const remote = createDashboardRevision(remoteDocument, 'desktop', storage.loaded, 30);
    const resolved = createDashboardRevision(localDocument, 'tablet', remote, 40);
    storage.results.push(
      { status: 'conflict', comparison: { relation: 'conflict', local, remote } },
      { status: 'saved', envelope: resolved },
    );
    const controller = new RevisionedDashboardV2SyncController(
      storage as unknown as RevisionedDashboardStorage<FrakonDashboardDocumentV2>,
      { readV2: true, writeV2: true, migrateV1ToV2: true },
      'tablet',
      () => 40,
    );
    await controller.load('home');
    await controller.save(localDocument);

    const result = await controller.resolveConflict('local');
    expect(result?.revision).toBe(resolved.revision);
    expect(controller.currentState.conflict).toBeUndefined();
  });
});

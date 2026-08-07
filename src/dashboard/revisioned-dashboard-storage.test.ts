import { describe, expect, it } from 'vitest';
import type { FrakonDashboardAnyDocument } from './dashboard-document-codec';
import { canPersistDashboardDocument } from './dashboard-layout-version-policy';
import type { DashboardStorageTransport } from './dashboard-storage';
import { createDashboardRevision, type DashboardRevisionEnvelope } from './dashboard-revision';
import { RevisionedDashboardStorage } from './revisioned-dashboard-storage';
import { migrateDashboardV1ToV2 } from './layout-model-v2';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 80,
  gap: 12,
  items: [],
};

class Transport implements DashboardStorageTransport {
  requests: Array<{ command: string; payload: Record<string, unknown> }> = [];
  response: unknown;

  async request<T>(command: string, payload: Record<string, unknown>): Promise<T> {
    this.requests.push({ command, payload });
    return this.response as T;
  }
}

describe('RevisionedDashboardStorage', () => {
  it('loads revision envelopes through the revision endpoint', async () => {
    const transport = new Transport();
    const envelope = createDashboardRevision(document, 'server', undefined, 10);
    transport.response = envelope;
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet' });

    await expect(storage.load('home')).resolves.toEqual(envelope);
    expect(transport.requests[0]).toEqual({
      command: 'frakon/dashboard/load_revision',
      payload: { dashboard_id: 'home' },
    });
  });

  it('sends the expected parent revision when saving', async () => {
    const transport = new Transport();
    const previous = createDashboardRevision(document, 'server', undefined, 10);
    const saved = createDashboardRevision(document, 'tablet', previous, 20);
    transport.response = { status: 'saved', envelope: saved };
    const storage = new RevisionedDashboardStorage(transport, {
      clientId: 'tablet',
      now: () => 20,
    });

    const result = await storage.save(document, previous);

    expect(result).toEqual({ status: 'saved', envelope: saved });
    expect(transport.requests[0]?.payload.expectedRevision).toBe(previous.revision);
  });

  it('returns an explicit comparison when Home Assistant reports a conflict', async () => {
    const transport = new Transport();
    const base = createDashboardRevision(document, 'server', undefined, 10);
    const remoteDocument = { ...document, title: 'Remote' };
    const remote: DashboardRevisionEnvelope = createDashboardRevision(remoteDocument, 'desktop', base, 30);
    transport.response = { status: 'conflict', remote };
    const storage = new RevisionedDashboardStorage(transport, {
      clientId: 'tablet',
      now: () => 20,
    });

    const result = await storage.save({ ...document, title: 'Local' }, base);

    expect(result.status).toBe('conflict');
    expect(result.comparison?.relation).toBe('conflict');
    expect(result.comparison?.local.document.title).toBe('Local');
    expect(result.comparison?.remote.document.title).toBe('Remote');
  });

  it('uses dashboard_id for revision removal without colliding with the WebSocket message id', async () => {
    const transport = new Transport();
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet' });
    await storage.remove('home', 'rev-1');
    expect(transport.requests[0]).toEqual({
      command: 'frakon/dashboard/remove_revision',
      payload: { dashboard_id: 'home', expectedRevision: 'rev-1' },
    });
  });

  it('blocks version 2 saves before the explicit write capability is enabled', async () => {
    const transport = new Transport();
    const v2 = migrateDashboardV1ToV2(document, 1200);
    const capabilities = { readV2: true, writeV2: false, migrateV1ToV2: true };
    const storage = new RevisionedDashboardStorage<FrakonDashboardAnyDocument>(transport, {
      clientId: 'canvas-tablet',
      canPersist: (candidate) => canPersistDashboardDocument(candidate, capabilities),
    });

    await expect(storage.save(v2)).resolves.toEqual({
      status: 'blocked',
      reason: 'persistence-disabled',
    });
    expect(transport.requests).toEqual([]);
  });

  it('allows version 2 revision transport only after the write gate is enabled', async () => {
    const transport = new Transport();
    const v2 = migrateDashboardV1ToV2(document, 1200);
    const capabilities = { readV2: true, writeV2: true, migrateV1ToV2: true };
    const saved = createDashboardRevision(v2, 'canvas-tablet', undefined, 50);
    transport.response = { status: 'saved', envelope: saved };
    const storage = new RevisionedDashboardStorage<FrakonDashboardAnyDocument>(transport, {
      clientId: 'canvas-tablet',
      now: () => 50,
      canPersist: (candidate) => canPersistDashboardDocument(candidate, capabilities),
    });

    const result = await storage.save(v2);
    expect(result.status).toBe('saved');
    expect(result.envelope?.document.version).toBe(2);
    expect(transport.requests[0]?.command).toBe('frakon/dashboard/save_revision');
  });
});

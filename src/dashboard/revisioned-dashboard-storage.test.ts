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
  items: [
    { id: 'front', x: 8, y: 6, w: 3, h: 2, card: { type: 'custom:front' } },
    { id: 'hidden', x: 1, y: 4, w: 2, h: 2, hidden: true, card: { type: 'custom:hidden' } },
    { id: 'back', x: 0, y: 0, w: 2, h: 2, card: { type: 'custom:back' } },
  ],
  constraints: [
    { id: 'hidden-left-front', kind: 'align-left', sourceId: 'hidden', targetId: 'front', priority: 40 },
  ],
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
  it('loads revision envelopes through the revision endpoint without changing exact layout data', async () => {
    const transport = new Transport();
    const envelope = createDashboardRevision(document, 'server', undefined, 10);
    transport.response = envelope;
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet' });

    const loaded = await storage.load('home');
    expect(loaded).toEqual(envelope);
    expect(loaded?.document.items).toEqual(document.items);
    expect(loaded?.document.constraints).toEqual(document.constraints);
    expect(transport.requests[0]).toEqual({
      command: 'frakon/dashboard/load_revision',
      payload: { dashboard_id: 'home' },
    });
  });

  it('rejects revision loads that substitute another dashboard id', async () => {
    const transport = new Transport();
    transport.response = createDashboardRevision({ ...document, id: 'other' }, 'server', undefined, 10);
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet' });
    await expect(storage.load('home')).rejects.toThrow(/invalid dashboard revision envelope/i);
  });

  it('rejects malformed revision envelopes returned by remote storage', async () => {
    const transport = new Transport();
    transport.response = {
      document: {
        ...document,
        items: [{ id: 'bad', card: {}, x: 0, y: 0, w: 'bad', h: 2 }],
      },
      revision: 'remote-1',
      updatedAt: 10,
      clientId: 'server',
    };
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet' });
    await expect(storage.load('home')).rejects.toThrow(/invalid dashboard revision envelope/i);
  });

  it('rejects self-parenting or invalid revision metadata on load', async () => {
    const transport = new Transport();
    transport.response = {
      document,
      revision: 'same',
      parentRevision: 'same',
      updatedAt: 10,
      clientId: 'server',
    };
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet' });
    await expect(storage.load('home')).rejects.toThrow(/invalid dashboard revision envelope/i);

    transport.response = {
      document,
      revision: 'remote-2',
      updatedAt: -1,
      clientId: 'server',
    };
    await expect(storage.load('home')).rejects.toThrow(/invalid dashboard revision envelope/i);
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
    expect(result.envelope?.document.items).toEqual(document.items);
    expect(transport.requests[0]?.payload.expectedRevision).toBe(previous.revision);
  });

  it('rejects a non-canonical local document before any revision request is sent', async () => {
    const transport = new Transport();
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet', now: () => 20 });
    await expect(storage.save({ ...document, rowHeight: 8 })).rejects.toThrow(/non-canonical/i);
    expect(transport.requests).toEqual([]);
  });

  it('rejects an invalid or mismatched previous envelope before transport', async () => {
    const transport = new Transport();
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet', now: () => 20 });
    const previous = createDashboardRevision(document, 'server', undefined, 10);
    const wrongPrevious = {
      ...previous,
      document: { ...previous.document, id: 'other' },
    } as DashboardRevisionEnvelope;

    await expect(storage.save(document, wrongPrevious)).rejects.toThrow(/previous dashboard revision/i);
    expect(transport.requests).toEqual([]);
  });

  it('rejects a saved response with an invalid envelope instead of accepting corrupt remote state', async () => {
    const transport = new Transport();
    transport.response = {
      status: 'saved',
      envelope: { document, revision: '', updatedAt: 20, clientId: 'server' },
    };
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet', now: () => 20 });
    await expect(storage.save(document)).rejects.toThrow(/invalid saved revision envelope/i);
  });

  it('rejects a saved response that substitutes another dashboard id', async () => {
    const transport = new Transport();
    const substituted = createDashboardRevision({ ...document, id: 'other' }, 'server', undefined, 20);
    transport.response = { status: 'saved', envelope: substituted };
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet', now: () => 20 });
    await expect(storage.save(document)).rejects.toThrow(/invalid saved revision envelope/i);
  });

  it('rejects a saved response that substitutes another schema version', async () => {
    const transport = new Transport();
    const v2 = migrateDashboardV1ToV2(document, 1200);
    transport.response = {
      status: 'saved',
      envelope: createDashboardRevision(v2, 'server', undefined, 20),
    };
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet', now: () => 20 });
    await expect(storage.save(document)).rejects.toThrow(/invalid saved revision envelope/i);
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
    expect(result.comparison?.remote.document.items).toEqual(document.items);
  });

  it('rejects malformed remote conflict envelopes', async () => {
    const transport = new Transport();
    const base = createDashboardRevision(document, 'server', undefined, 10);
    transport.response = {
      status: 'conflict',
      remote: {
        document: { ...document, constraints: [{ id: 'bad', kind: 'align-left', sourceId: 'missing', targetId: 'front' }] },
        revision: 'remote-2',
        parentRevision: base.revision,
        updatedAt: 30,
        clientId: 'desktop',
      },
    };
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet', now: () => 20 });
    await expect(storage.save(document, base)).rejects.toThrow(/invalid revision conflict response/i);
  });

  it('rejects conflict responses that switch schema version', async () => {
    const transport = new Transport();
    const base = createDashboardRevision(document, 'server', undefined, 10);
    const v2 = migrateDashboardV1ToV2(document, 1200);
    transport.response = {
      status: 'conflict',
      remote: createDashboardRevision(v2, 'desktop', undefined, 30),
    };
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet', now: () => 20 });
    await expect(storage.save(document, base)).rejects.toThrow(/invalid revision conflict response/i);
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

  it('validates revision removal identifiers before transport', async () => {
    const transport = new Transport();
    const storage = new RevisionedDashboardStorage(transport, { clientId: 'tablet' });
    await expect(storage.remove('', 'rev-1')).rejects.toThrow(/dashboard id/i);
    await expect(storage.remove('home', '')).rejects.toThrow(/expected revision/i);
    expect(transport.requests).toEqual([]);
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

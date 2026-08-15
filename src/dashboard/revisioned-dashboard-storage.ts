import { isDashboardDocumentV1, type FrakonDashboardAnyDocument } from './dashboard-document-codec';
import { isDashboardDocumentV2 } from './layout-model-v2';
import type { DashboardStorageTransport } from './dashboard-storage';
import {
  compareDashboardRevisions,
  createDashboardRevision,
  type DashboardRevisionComparison,
  type DashboardRevisionEnvelope,
} from './dashboard-revision';
import type { FrakonDashboardDocument } from './layout-model';

export interface RevisionedDashboardSaveResult<
  TDocument extends FrakonDashboardAnyDocument = FrakonDashboardDocument,
> {
  status: 'saved' | 'conflict' | 'blocked';
  envelope?: DashboardRevisionEnvelope<TDocument>;
  comparison?: DashboardRevisionComparison<TDocument>;
  reason?: 'persistence-disabled';
}

export interface RevisionedDashboardStorageOptions<
  TDocument extends FrakonDashboardAnyDocument = FrakonDashboardDocument,
> {
  namespace?: string;
  clientId: string;
  now?: () => number;
  canPersist?: (document: TDocument) => boolean;
}

/**
 * Revision-aware remote storage client. Every remote envelope is validated at
 * the client boundary and bound to the dashboard id requested/saved so corrupt
 * storage cannot substitute one dashboard for another.
 */
export class RevisionedDashboardStorage<
  TDocument extends FrakonDashboardAnyDocument = FrakonDashboardDocument,
> {
  private readonly namespace: string;
  private readonly now: () => number;
  private readonly canPersist: (document: TDocument) => boolean;

  constructor(
    private readonly transport: DashboardStorageTransport,
    private readonly options: RevisionedDashboardStorageOptions<TDocument>,
  ) {
    this.namespace = options.namespace ?? 'frakon/dashboard';
    this.now = options.now ?? Date.now;
    this.canPersist = options.canPersist ?? (() => true);
  }

  async load(id: string): Promise<DashboardRevisionEnvelope<TDocument> | undefined> {
    const response = await this.transport.request<unknown>(
      `${this.namespace}/load_revision`,
      { dashboard_id: id },
    );
    if (response === undefined || response === null) return undefined;
    if (!isDashboardRevisionEnvelope(response, id)) {
      throw new Error('Home Assistant returned an invalid dashboard revision envelope.');
    }
    return structuredClone(response) as DashboardRevisionEnvelope<TDocument>;
  }

  async save(
    document: TDocument,
    previous?: DashboardRevisionEnvelope<TDocument>,
  ): Promise<RevisionedDashboardSaveResult<TDocument>> {
    if (!this.canPersist(document)) {
      return { status: 'blocked', reason: 'persistence-disabled' };
    }

    const local = createDashboardRevision(
      document,
      this.options.clientId,
      previous,
      this.now(),
    );

    const response = await this.transport.request<unknown>(`${this.namespace}/save_revision`, {
      envelope: local,
      expectedRevision: previous?.revision,
    });

    if (!response || typeof response !== 'object') {
      throw new Error('Home Assistant returned an invalid revision save response.');
    }
    const result = response as Record<string, unknown>;
    if (result.status === 'saved') {
      const savedEnvelope = result.envelope;
      if (!isDashboardRevisionEnvelope(savedEnvelope, document.id)) {
        throw new Error('Home Assistant returned an invalid saved revision envelope.');
      }
      return {
        status: 'saved',
        envelope: structuredClone(savedEnvelope) as DashboardRevisionEnvelope<TDocument>,
      };
    }

    const remoteCandidate = result.remote;
    if (result.status !== 'conflict' || !isDashboardRevisionEnvelope(remoteCandidate, document.id)) {
      throw new Error('Home Assistant returned an invalid revision conflict response.');
    }

    const remote = structuredClone(remoteCandidate) as DashboardRevisionEnvelope<TDocument>;
    return {
      status: 'conflict',
      comparison: compareDashboardRevisions(local, remote),
    };
  }

  remove(id: string, expectedRevision?: string): Promise<void> {
    return this.transport.request<void>(`${this.namespace}/remove_revision`, {
      dashboard_id: id,
      expectedRevision,
    });
  }
}

function isDashboardRevisionEnvelope(
  value: unknown,
  expectedDocumentId?: string,
): value is DashboardRevisionEnvelope<FrakonDashboardAnyDocument> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Record<string, unknown>;
  if (!isDashboardDocument(envelope.document)) return false;
  if (expectedDocumentId !== undefined && envelope.document.id !== expectedDocumentId) return false;

  const revision = envelope.revision;
  if (typeof revision !== 'string' || !revision || revision.length > 256) return false;

  const parentRevision = envelope.parentRevision;
  if (parentRevision !== undefined && parentRevision !== null) {
    if (typeof parentRevision !== 'string' || !parentRevision || parentRevision.length > 256) return false;
    if (parentRevision === revision) return false;
  }

  if (typeof envelope.updatedAt !== 'number'
    || !Number.isSafeInteger(envelope.updatedAt)
    || envelope.updatedAt < 0) return false;
  if (typeof envelope.clientId !== 'string' || !envelope.clientId || envelope.clientId.length > 128) return false;
  return true;
}

function isDashboardDocument(value: unknown): value is FrakonDashboardAnyDocument {
  return isDashboardDocumentV1(value) || isDashboardDocumentV2(value);
}

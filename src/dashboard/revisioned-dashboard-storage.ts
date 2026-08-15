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
 * Revision-aware remote storage client. The Home Assistant endpoint must reject
 * a save when expectedRevision does not match the currently stored revision and
 * return the current remote envelope in that case.
 *
 * Version-1 behavior remains permissive by default. Callers that instantiate
 * this class for a broader document union should provide canPersist so newer
 * document versions cannot be written before their feature gate is enabled.
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
    if (!isDashboardRevisionEnvelope(response)) {
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
      if (!isDashboardRevisionEnvelope(result.envelope)) {
        throw new Error('Home Assistant returned an invalid saved revision envelope.');
      }
      return {
        status: 'saved',
        envelope: structuredClone(result.envelope) as DashboardRevisionEnvelope<TDocument>,
      };
    }
    if (result.status !== 'conflict' || !isDashboardRevisionEnvelope(result.remote)) {
      throw new Error('Home Assistant returned an invalid revision conflict response.');
    }

    const remote = structuredClone(result.remote) as DashboardRevisionEnvelope<TDocument>;
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

function isDashboardRevisionEnvelope(value: unknown): value is DashboardRevisionEnvelope<FrakonDashboardAnyDocument> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Record<string, unknown>;
  if (!isDashboardDocument(envelope.document)) return false;
  if (typeof envelope.revision !== 'string' || !envelope.revision) return false;
  if (envelope.parentRevision !== undefined
    && envelope.parentRevision !== null
    && (typeof envelope.parentRevision !== 'string' || !envelope.parentRevision)) return false;
  if (typeof envelope.updatedAt !== 'number' || !Number.isFinite(envelope.updatedAt) || envelope.updatedAt < 0) return false;
  if (typeof envelope.clientId !== 'string' || !envelope.clientId) return false;
  return true;
}

function isDashboardDocument(value: unknown): value is FrakonDashboardAnyDocument {
  return isDashboardDocumentV1(value) || isDashboardDocumentV2(value);
}

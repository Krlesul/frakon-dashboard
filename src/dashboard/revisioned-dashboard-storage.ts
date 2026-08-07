import type { FrakonDashboardAnyDocument } from './dashboard-document-codec';
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

  load(id: string): Promise<DashboardRevisionEnvelope<TDocument> | undefined> {
    return this.transport.request<DashboardRevisionEnvelope<TDocument> | undefined>(
      `${this.namespace}/load_revision`,
      { dashboard_id: id },
    );
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

    const response = await this.transport.request<
      | { status: 'saved'; envelope: DashboardRevisionEnvelope<TDocument> }
      | { status: 'conflict'; remote: DashboardRevisionEnvelope<TDocument> }
    >(`${this.namespace}/save_revision`, {
      envelope: local,
      expectedRevision: previous?.revision,
    });

    if (response.status === 'saved') {
      return { status: 'saved', envelope: response.envelope };
    }

    return {
      status: 'conflict',
      comparison: compareDashboardRevisions(local, response.remote),
    };
  }

  remove(id: string, expectedRevision?: string): Promise<void> {
    return this.transport.request<void>(`${this.namespace}/remove_revision`, {
      dashboard_id: id,
      expectedRevision,
    });
  }
}

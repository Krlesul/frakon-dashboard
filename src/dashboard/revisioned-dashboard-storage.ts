import type { DashboardStorageTransport } from './dashboard-storage';
import {
  compareDashboardRevisions,
  createDashboardRevision,
  type DashboardRevisionComparison,
  type DashboardRevisionEnvelope,
} from './dashboard-revision';
import type { FrakonDashboardDocument } from './layout-model';

export interface RevisionedDashboardSaveResult {
  status: 'saved' | 'conflict';
  envelope?: DashboardRevisionEnvelope;
  comparison?: DashboardRevisionComparison;
}

export interface RevisionedDashboardStorageOptions {
  namespace?: string;
  clientId: string;
  now?: () => number;
}

/**
 * Revision-aware remote storage client. The Home Assistant endpoint must reject
 * a save when expectedRevision does not match the currently stored revision and
 * return the current remote envelope in that case.
 */
export class RevisionedDashboardStorage {
  private readonly namespace: string;
  private readonly now: () => number;

  constructor(
    private readonly transport: DashboardStorageTransport,
    private readonly options: RevisionedDashboardStorageOptions,
  ) {
    this.namespace = options.namespace ?? 'frakon/dashboard';
    this.now = options.now ?? Date.now;
  }

  load(id: string): Promise<DashboardRevisionEnvelope | undefined> {
    return this.transport.request<DashboardRevisionEnvelope | undefined>(
      `${this.namespace}/load_revision`,
      { id },
    );
  }

  async save(
    document: FrakonDashboardDocument,
    previous?: DashboardRevisionEnvelope,
  ): Promise<RevisionedDashboardSaveResult> {
    const local = createDashboardRevision(
      document,
      this.options.clientId,
      previous,
      this.now(),
    );

    const response = await this.transport.request<
      | { status: 'saved'; envelope: DashboardRevisionEnvelope }
      | { status: 'conflict'; remote: DashboardRevisionEnvelope }
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
      id,
      expectedRevision,
    });
  }
}

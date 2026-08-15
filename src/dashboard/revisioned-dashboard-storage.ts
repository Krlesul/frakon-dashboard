import { isDashboardDocumentV1, type FrakonDashboardAnyDocument } from './dashboard-document-codec';
import { isDashboardDocumentV2 } from './layout-model-v2';
import type { DashboardStorageTransport } from './dashboard-storage';
import {
  compareDashboardRevisions,
  createDashboardRevision,
  isDashboardRevisionEnvelope,
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
 * Revision-aware remote storage client. Every local/remote envelope is
 * validated at the client boundary and bound to the dashboard id/schema being
 * loaded or saved. Persistence never repairs malformed revision snapshots.
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
    requireIdentifier(id, 'dashboard id', 128);
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
    if (!isDashboardDocument(document)) {
      throw new Error('Cannot persist an invalid or non-canonical dashboard revision document.');
    }
    if (previous && !isDashboardRevisionEnvelope(previous, document.id, document.version)) {
      throw new Error('Previous dashboard revision envelope is invalid or belongs to another document.');
    }
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
      if (!isDashboardRevisionEnvelope(savedEnvelope, document.id, document.version)) {
        throw new Error('Home Assistant returned an invalid saved revision envelope.');
      }
      return {
        status: 'saved',
        envelope: structuredClone(savedEnvelope) as DashboardRevisionEnvelope<TDocument>,
      };
    }

    const remoteCandidate = result.remote;
    if (result.status !== 'conflict'
      || !isDashboardRevisionEnvelope(remoteCandidate, document.id, document.version)) {
      throw new Error('Home Assistant returned an invalid revision conflict response.');
    }

    const remote = structuredClone(remoteCandidate) as DashboardRevisionEnvelope<TDocument>;
    return {
      status: 'conflict',
      comparison: compareDashboardRevisions(local, remote),
    };
  }

  async remove(id: string, expectedRevision?: string): Promise<void> {
    requireIdentifier(id, 'dashboard id', 128);
    if (expectedRevision !== undefined) requireIdentifier(expectedRevision, 'expected revision', 256);
    await this.transport.request<void>(`${this.namespace}/remove_revision`, {
      dashboard_id: id,
      expectedRevision,
    });
  }
}

function isDashboardDocument(value: unknown): value is FrakonDashboardAnyDocument {
  return isDashboardDocumentV1(value) || isDashboardDocumentV2(value);
}

function requireIdentifier(value: string, label: string, maxLength: number): void {
  if (!value || value.length > maxLength) {
    throw new Error(`${label} must be a non-empty string up to ${maxLength} characters.`);
  }
}

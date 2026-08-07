import type { FrakonDashboardAnyDocument } from './dashboard-document-codec';
import type { FrakonDashboardDocument } from './layout-model';

export interface DashboardRevisionEnvelope<
  TDocument extends FrakonDashboardAnyDocument = FrakonDashboardDocument,
> {
  document: TDocument;
  revision: string;
  parentRevision?: string;
  updatedAt: number;
  clientId: string;
}

export type DashboardRevisionRelation =
  | 'same'
  | 'local-ahead'
  | 'remote-ahead'
  | 'conflict';

export interface DashboardRevisionComparison<
  TDocument extends FrakonDashboardAnyDocument = FrakonDashboardDocument,
> {
  relation: DashboardRevisionRelation;
  local: DashboardRevisionEnvelope<TDocument>;
  remote: DashboardRevisionEnvelope<TDocument>;
}

export function createDashboardRevision<
  TDocument extends FrakonDashboardAnyDocument = FrakonDashboardDocument,
>(
  document: TDocument,
  clientId: string,
  previous?: DashboardRevisionEnvelope<TDocument>,
  updatedAt = Date.now(),
): DashboardRevisionEnvelope<TDocument> {
  return {
    document: structuredClone(document),
    revision: revisionId(clientId, updatedAt, document),
    parentRevision: previous?.revision,
    updatedAt,
    clientId,
  };
}

export function compareDashboardRevisions<
  TDocument extends FrakonDashboardAnyDocument = FrakonDashboardDocument,
>(
  local: DashboardRevisionEnvelope<TDocument>,
  remote: DashboardRevisionEnvelope<TDocument>,
): DashboardRevisionComparison<TDocument> {
  if (local.revision === remote.revision) return { relation: 'same', local, remote };
  if (local.parentRevision === remote.revision) return { relation: 'local-ahead', local, remote };
  if (remote.parentRevision === local.revision) return { relation: 'remote-ahead', local, remote };
  return { relation: 'conflict', local, remote };
}

export function chooseDashboardRevision<
  TDocument extends FrakonDashboardAnyDocument = FrakonDashboardDocument,
>(
  comparison: DashboardRevisionComparison<TDocument>,
  choice: 'local' | 'remote',
): DashboardRevisionEnvelope<TDocument> {
  return structuredClone(choice === 'local' ? comparison.local : comparison.remote);
}

function revisionId(clientId: string, updatedAt: number, document: FrakonDashboardAnyDocument): string {
  const source = JSON.stringify({
    clientId,
    updatedAt,
    document,
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${updatedAt.toString(36)}-${(hash >>> 0).toString(36)}`;
}

import {
  isDashboardDocumentV1,
  type FrakonDashboardAnyDocument,
} from './dashboard-document-codec';
import { isDashboardDocumentV2 } from './layout-model-v2';
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

export function isDashboardRevisionEnvelope(
  value: unknown,
  expectedDocumentId?: string,
  expectedVersion?: 1 | 2,
): value is DashboardRevisionEnvelope<FrakonDashboardAnyDocument> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Record<string, unknown>;
  if (!isDashboardDocument(envelope.document)) return false;
  if (expectedDocumentId !== undefined && envelope.document.id !== expectedDocumentId) return false;
  if (expectedVersion !== undefined && envelope.document.version !== expectedVersion) return false;

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

export function createDashboardRevision<
  TDocument extends FrakonDashboardAnyDocument = FrakonDashboardDocument,
>(
  document: TDocument,
  clientId: string,
  previous?: DashboardRevisionEnvelope<TDocument>,
  updatedAt = Date.now(),
): DashboardRevisionEnvelope<TDocument> {
  if (!isDashboardDocument(document)) {
    throw new Error('Cannot create a revision from an invalid or non-canonical dashboard document.');
  }
  if (!clientId || clientId.length > 128) {
    throw new Error('Dashboard revision clientId must be a non-empty string up to 128 characters.');
  }
  if (!Number.isSafeInteger(updatedAt) || updatedAt < 0) {
    throw new Error('Dashboard revision updatedAt must be a non-negative safe integer.');
  }
  if (previous && !isDashboardRevisionEnvelope(previous, document.id, document.version)) {
    throw new Error('Previous dashboard revision envelope is invalid or belongs to another document.');
  }

  const envelope: DashboardRevisionEnvelope<TDocument> = {
    document: structuredClone(document),
    revision: revisionId(clientId, updatedAt, document),
    parentRevision: previous?.revision,
    updatedAt,
    clientId,
  };
  if (!isDashboardRevisionEnvelope(envelope, document.id, document.version)) {
    throw new Error('Generated dashboard revision envelope is invalid.');
  }
  return envelope;
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

function isDashboardDocument(value: unknown): value is FrakonDashboardAnyDocument {
  return isDashboardDocumentV1(value) || isDashboardDocumentV2(value);
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

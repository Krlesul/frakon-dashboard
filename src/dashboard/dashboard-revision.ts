import type { FrakonDashboardDocument } from './layout-model';

export interface DashboardRevisionEnvelope {
  document: FrakonDashboardDocument;
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

export interface DashboardRevisionComparison {
  relation: DashboardRevisionRelation;
  local: DashboardRevisionEnvelope;
  remote: DashboardRevisionEnvelope;
}

export function createDashboardRevision(
  document: FrakonDashboardDocument,
  clientId: string,
  previous?: DashboardRevisionEnvelope,
  updatedAt = Date.now(),
): DashboardRevisionEnvelope {
  return {
    document: structuredClone(document),
    revision: revisionId(clientId, updatedAt, document),
    parentRevision: previous?.revision,
    updatedAt,
    clientId,
  };
}

export function compareDashboardRevisions(
  local: DashboardRevisionEnvelope,
  remote: DashboardRevisionEnvelope,
): DashboardRevisionComparison {
  if (local.revision === remote.revision) return { relation: 'same', local, remote };
  if (local.parentRevision === remote.revision) return { relation: 'local-ahead', local, remote };
  if (remote.parentRevision === local.revision) return { relation: 'remote-ahead', local, remote };
  return { relation: 'conflict', local, remote };
}

export function chooseDashboardRevision(
  comparison: DashboardRevisionComparison,
  choice: 'local' | 'remote',
): DashboardRevisionEnvelope {
  return structuredClone(choice === 'local' ? comparison.local : comparison.remote);
}

function revisionId(clientId: string, updatedAt: number, document: FrakonDashboardDocument): string {
  const source = JSON.stringify({
    clientId,
    updatedAt,
    id: document.id,
    title: document.title,
    items: document.items,
    constraints: document.constraints,
    surface: document.surface,
    cardSurface: document.cardSurface,
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${updatedAt.toString(36)}-${(hash >>> 0).toString(36)}`;
}

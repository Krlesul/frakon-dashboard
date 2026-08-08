import type { ResponsiveCanvasV2Bundle } from './responsive-v2-bundle';

export interface ResponsiveCanvasV2RevisionEnvelope {
  bundle: ResponsiveCanvasV2Bundle;
  revision: string;
  parentRevision?: string;
  updatedAt: number;
  clientId: string;
}

export type ResponsiveCanvasV2RevisionRelation = 'same' | 'local-ahead' | 'remote-ahead' | 'conflict';

export function createResponsiveCanvasV2Revision(
  bundle: ResponsiveCanvasV2Bundle,
  clientId: string,
  previous?: ResponsiveCanvasV2RevisionEnvelope,
  updatedAt = Date.now(),
): ResponsiveCanvasV2RevisionEnvelope {
  return {
    bundle: structuredClone(bundle),
    revision: responsiveRevisionId(clientId, updatedAt, bundle),
    parentRevision: previous?.revision,
    updatedAt,
    clientId,
  };
}

export function compareResponsiveCanvasV2Revisions(
  local: ResponsiveCanvasV2RevisionEnvelope,
  remote: ResponsiveCanvasV2RevisionEnvelope,
): ResponsiveCanvasV2RevisionRelation {
  if (local.revision === remote.revision) return 'same';
  if (local.parentRevision === remote.revision) return 'local-ahead';
  if (remote.parentRevision === local.revision) return 'remote-ahead';
  return 'conflict';
}

function hash32(source: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function responsiveRevisionId(clientId: string, updatedAt: number, bundle: ResponsiveCanvasV2Bundle): string {
  const source = JSON.stringify({ clientId, updatedAt, bundle });
  const primary = hash32(source, 2166136261);
  const secondary = hash32(source, 3335557771);
  return `${updatedAt.toString(36)}-${primary.toString(36)}-${secondary.toString(36)}`;
}

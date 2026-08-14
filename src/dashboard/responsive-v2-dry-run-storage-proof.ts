import type { ResponsiveCanvasV2ReadResult } from './responsive-v2-read-loader';

export type ResponsiveV2DryRunStorageInvariant =
  | 'unchanged'
  | 'changed-during-check'
  | 'unverifiable';

export interface ResponsiveV2DryRunStorageProof {
  invariant: ResponsiveV2DryRunStorageInvariant;
  beforeStatus: ResponsiveCanvasV2ReadResult['status'];
  afterStatus: ResponsiveCanvasV2ReadResult['status'];
  beforeRevision?: string;
  afterRevision?: string;
}

function persistedFingerprint(result: ResponsiveCanvasV2ReadResult): string | undefined {
  if (result.status === 'absent') return 'absent';
  if (result.status !== 'loaded') return undefined;
  return JSON.stringify({
    revision: result.envelope.revision,
    parentRevision: result.envelope.parentRevision ?? null,
    updatedAt: result.envelope.updatedAt,
    clientId: result.envelope.clientId,
    bundle: result.envelope.bundle,
  });
}

function revision(result: ResponsiveCanvasV2ReadResult): string | undefined {
  return result.status === 'loaded' ? result.envelope.revision : undefined;
}

export function responsiveV2DryRunStorageProof(
  before: ResponsiveCanvasV2ReadResult,
  after: ResponsiveCanvasV2ReadResult,
): ResponsiveV2DryRunStorageProof {
  const beforeFingerprint = persistedFingerprint(before);
  const afterFingerprint = persistedFingerprint(after);
  const invariant: ResponsiveV2DryRunStorageInvariant =
    beforeFingerprint === undefined || afterFingerprint === undefined
      ? 'unverifiable'
      : beforeFingerprint === afterFingerprint
        ? 'unchanged'
        : 'changed-during-check';

  return {
    invariant,
    beforeStatus: before.status,
    afterStatus: after.status,
    beforeRevision: revision(before),
    afterRevision: revision(after),
  };
}

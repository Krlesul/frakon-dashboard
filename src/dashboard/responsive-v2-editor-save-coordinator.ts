import type { DashboardStorageTransport } from './dashboard-storage';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import { resolveResponsiveCanvasV2Conflicts, type ResponsiveCanvasV2ConflictSelections } from './responsive-v2-conflict-resolution';
import type { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { mergeResponsiveCanvasV2Bundles } from './responsive-v2-merge';
import { persistResponsiveCanvasV2Revision } from './responsive-v2-persistence';
import { createResponsiveCanvasV2RevisionFromParent, type ResponsiveCanvasV2RevisionEnvelope } from './responsive-v2-revision';
import type { ResponsiveCanvasV2ConflictSession } from './responsive-v2-sync-controller';

export type ResponsiveV2EditorSaveResult =
  | { status: 'clean' }
  | { status: 'stale'; reason: 'bundle-changed' | 'base-revision-changed' }
  | { status: 'blocked'; reason: string }
  | { status: 'saved'; envelope: ResponsiveCanvasV2RevisionEnvelope }
  | { status: 'conflict'; conflict: ResponsiveCanvasV2ConflictSession };

export type ResponsiveV2EditorConflictResolveResult =
  | { status: 'incomplete'; unresolved: string[] }
  | { status: 'blocked'; reason: string }
  | { status: 'saved'; envelope: ResponsiveCanvasV2RevisionEnvelope }
  | { status: 'conflict'; conflict: ResponsiveCanvasV2ConflictSession };

function sameBundle(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function saveResponsiveV2EditorCandidate(input: {
  transport: DashboardStorageTransport;
  capabilities: DashboardServerCapabilities;
  controller: ResponsiveV2DraftController;
  baseRevision?: string;
  candidate: ResponsiveCanvasV2RevisionEnvelope;
  namespace?: string;
}): Promise<ResponsiveV2EditorSaveResult> {
  const { transport, capabilities, controller, baseRevision, candidate, namespace } = input;
  if (!controller.snapshot.dirtyBreakpoints.length) return { status: 'clean' };
  if (!sameBundle(candidate.bundle, controller.toBundle())) return { status: 'stale', reason: 'bundle-changed' };
  if (candidate.parentRevision !== baseRevision) return { status: 'stale', reason: 'base-revision-changed' };

  const result = await persistResponsiveCanvasV2Revision(transport, capabilities, candidate, baseRevision, namespace);
  if (result.status === 'blocked') return { status: 'blocked', reason: result.reason };
  if (result.status === 'saved') return { status: 'saved', envelope: result.envelope };

  const base: ResponsiveCanvasV2RevisionEnvelope = {
    bundle: controller.baseBundle(),
    revision: baseRevision ?? candidate.parentRevision ?? 'unversioned-base',
    updatedAt: 0,
    clientId: 'server-base',
  };
  return {
    status: 'conflict',
    conflict: {
      base,
      local: candidate,
      remote: result.remote,
      merge: mergeResponsiveCanvasV2Bundles(base.bundle, candidate.bundle, result.remote.bundle),
    },
  };
}

export async function resolveResponsiveV2EditorConflict(input: {
  transport: DashboardStorageTransport;
  capabilities: DashboardServerCapabilities;
  conflict: ResponsiveCanvasV2ConflictSession;
  selections: ResponsiveCanvasV2ConflictSelections;
  clientId?: string;
  namespace?: string;
  now?: () => number;
}): Promise<ResponsiveV2EditorConflictResolveResult> {
  const { transport, capabilities, conflict, selections, namespace } = input;
  const resolution = resolveResponsiveCanvasV2Conflicts({
    merged: conflict.merge.bundle,
    local: conflict.local.bundle,
    remote: conflict.remote.bundle,
    conflicts: conflict.merge.conflicts,
    selections,
  });
  if (resolution.status !== 'resolved') return { status: 'incomplete', unresolved: resolution.unresolved };

  const resolved = createResponsiveCanvasV2RevisionFromParent(
    resolution.bundle,
    input.clientId ?? conflict.local.clientId,
    conflict.remote.revision,
    (input.now ?? Date.now)(),
  );
  const result = await persistResponsiveCanvasV2Revision(
    transport,
    capabilities,
    resolved,
    conflict.remote.revision,
    namespace,
  );
  if (result.status === 'blocked') return { status: 'blocked', reason: result.reason };
  if (result.status === 'saved') return { status: 'saved', envelope: result.envelope };
  return {
    status: 'conflict',
    conflict: {
      base: conflict.remote,
      local: resolved,
      remote: result.remote,
      merge: mergeResponsiveCanvasV2Bundles(conflict.remote.bundle, resolved.bundle, result.remote.bundle),
    },
  };
}

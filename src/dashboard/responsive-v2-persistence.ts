import type { DashboardStorageTransport } from './dashboard-storage';
import {
  RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
  RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT,
  RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT,
  RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT,
  type DashboardServerCapabilities,
} from './dashboard-server-capabilities';
import type { ResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import type { ResponsiveCanvasV2RevisionEnvelope } from './responsive-v2-revision';
import {
  responsiveCanvasV2WriteReadiness,
  type ResponsiveCanvasV2WriteBlocker,
} from './responsive-v2-write-readiness';

export interface ResponsiveCanvasV2PersistenceDecision {
  allowed: boolean;
  reason?: ResponsiveCanvasV2WriteBlocker;
}

export function responsiveCanvasV2PersistenceDecision(
  capabilities: DashboardServerCapabilities,
  bundle: ResponsiveCanvasV2Bundle,
): ResponsiveCanvasV2PersistenceDecision {
  const readiness = responsiveCanvasV2WriteReadiness(capabilities, bundle);
  return readiness.allowed
    ? { allowed: true }
    : { allowed: false, reason: readiness.blockers[0] };
}

export type ResponsiveCanvasV2PersistResult =
  | { status: 'blocked'; reason: ResponsiveCanvasV2WriteBlocker }
  | { status: 'saved'; envelope: ResponsiveCanvasV2RevisionEnvelope }
  | { status: 'conflict'; remote: ResponsiveCanvasV2RevisionEnvelope };

export type ResponsiveCanvasV2RemoveResult =
  | { status: 'blocked'; reason: ResponsiveCanvasV2WriteBlocker }
  | { status: 'removed' }
  | { status: 'conflict'; remote?: ResponsiveCanvasV2RevisionEnvelope };

export type ResponsiveCanvasV2DryRunBlocker =
  | 'contract-incompatible'
  | 'read-disabled'
  | 'atomic-revision-disabled'
  | 'revision-sync-disabled'
  | 'dry-run-unavailable';

export type ResponsiveCanvasV2DryRunResult =
  | { status: 'blocked'; reason: ResponsiveCanvasV2DryRunBlocker }
  | { status: 'valid'; currentRevision?: string; writeEnabled: boolean }
  | { status: 'conflict'; remote?: ResponsiveCanvasV2RevisionEnvelope };

interface ServerResponsiveRevisionEnvelope {
  document: ResponsiveCanvasV2Bundle;
  revision: string;
  parentRevision?: string;
  updatedAt: number;
  clientId: string;
}

function defaultDryRunEndpoint(namespace: string): string {
  return namespace === 'frakon/dashboard'
    ? RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT
    : `${namespace}/dry_run_responsive_revision`;
}

function defaultSaveEndpoint(namespace: string): string {
  return namespace === 'frakon/dashboard'
    ? RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT
    : `${namespace}/save_responsive_revision`;
}

function defaultRemoveEndpoint(namespace: string): string {
  return namespace === 'frakon/dashboard'
    ? RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT
    : `${namespace}/remove_responsive_revision`;
}

export async function dryRunResponsiveCanvasV2Revision(
  transport: DashboardStorageTransport,
  capabilities: DashboardServerCapabilities,
  envelope: ResponsiveCanvasV2RevisionEnvelope,
  expectedRevision: string | undefined,
  namespace = 'frakon/dashboard',
): Promise<ResponsiveCanvasV2DryRunResult> {
  const responsive = capabilities.responsiveCanvasV2;
  if (!responsive.contractCompatible) return { status: 'blocked', reason: 'contract-incompatible' };
  if (!responsive.read) return { status: 'blocked', reason: 'read-disabled' };
  if (!responsive.atomicRevision) return { status: 'blocked', reason: 'atomic-revision-disabled' };
  if (!capabilities.revisionSync) return { status: 'blocked', reason: 'revision-sync-disabled' };
  const dryRunEndpoint = responsive.dryRunEndpoint ?? defaultDryRunEndpoint(namespace);
  if (!dryRunEndpoint) return { status: 'blocked', reason: 'dry-run-unavailable' };

  const response = await transport.request<
    | { status: 'valid'; currentRevision: string | null; writeEnabled: boolean }
    | { status: 'conflict'; remote?: ServerResponsiveRevisionEnvelope | null }
  >(dryRunEndpoint, {
    contractVersion: RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
    envelope: {
      document: structuredClone(envelope.bundle),
      revision: envelope.revision,
      parentRevision: envelope.parentRevision,
      updatedAt: envelope.updatedAt,
      clientId: envelope.clientId,
    },
    expectedRevision: expectedRevision ?? null,
  });

  if (response.status === 'valid') {
    return {
      status: 'valid',
      currentRevision: response.currentRevision ?? undefined,
      writeEnabled: response.writeEnabled === true,
    };
  }
  return {
    status: 'conflict',
    remote: response.remote ? fromServerEnvelope(response.remote) : undefined,
  };
}

export async function persistResponsiveCanvasV2Revision(
  transport: DashboardStorageTransport,
  capabilities: DashboardServerCapabilities,
  envelope: ResponsiveCanvasV2RevisionEnvelope,
  expectedRevision: string | undefined,
  namespace = 'frakon/dashboard',
): Promise<ResponsiveCanvasV2PersistResult> {
  const decision = responsiveCanvasV2PersistenceDecision(capabilities, envelope.bundle);
  if (!decision.allowed) return { status: 'blocked', reason: decision.reason! };
  const saveEndpoint = capabilities.responsiveCanvasV2.saveEndpoint ?? defaultSaveEndpoint(namespace);

  const response = await transport.request<
    | { status: 'saved'; envelope: ServerResponsiveRevisionEnvelope }
    | { status: 'conflict'; remote: ServerResponsiveRevisionEnvelope }
  >(saveEndpoint, {
    contractVersion: RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
    envelope: {
      document: structuredClone(envelope.bundle),
      revision: envelope.revision,
      parentRevision: envelope.parentRevision,
      updatedAt: envelope.updatedAt,
      clientId: envelope.clientId,
    },
    expectedRevision: expectedRevision ?? null,
  });

  if (response.status === 'saved') return { status: 'saved', envelope: fromServerEnvelope(response.envelope) };
  return { status: 'conflict', remote: fromServerEnvelope(response.remote) };
}

export async function removeResponsiveCanvasV2Revision(
  transport: DashboardStorageTransport,
  capabilities: DashboardServerCapabilities,
  bundle: ResponsiveCanvasV2Bundle,
  expectedRevision: string | undefined,
  namespace = 'frakon/dashboard',
): Promise<ResponsiveCanvasV2RemoveResult> {
  const decision = responsiveCanvasV2PersistenceDecision(capabilities, bundle);
  if (!decision.allowed) return { status: 'blocked', reason: decision.reason! };
  const removeEndpoint = capabilities.responsiveCanvasV2.removeEndpoint ?? defaultRemoveEndpoint(namespace);

  const response = await transport.request<
    | { status: 'removed' }
    | { status: 'conflict'; remote?: ServerResponsiveRevisionEnvelope }
  >(removeEndpoint, {
    contractVersion: RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
    dashboard_id: bundle.id,
    expectedRevision: expectedRevision ?? null,
  });

  if (response.status === 'removed') return { status: 'removed' };
  return {
    status: 'conflict',
    remote: response.remote ? fromServerEnvelope(response.remote) : undefined,
  };
}

function fromServerEnvelope(envelope: ServerResponsiveRevisionEnvelope): ResponsiveCanvasV2RevisionEnvelope {
  return {
    bundle: structuredClone(envelope.document),
    revision: envelope.revision,
    parentRevision: envelope.parentRevision,
    updatedAt: envelope.updatedAt,
    clientId: envelope.clientId,
  };
}

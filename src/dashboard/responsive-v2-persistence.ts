import type { DashboardStorageTransport } from './dashboard-storage';
import {
  RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
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

interface ServerResponsiveRevisionEnvelope {
  document: ResponsiveCanvasV2Bundle;
  revision: string;
  parentRevision?: string;
  updatedAt: number;
  clientId: string;
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

  const response = await transport.request<
    | { status: 'saved'; envelope: ServerResponsiveRevisionEnvelope }
    | { status: 'conflict'; remote: ServerResponsiveRevisionEnvelope }
  >(`${namespace}/save_responsive_revision`, {
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

  const response = await transport.request<
    | { status: 'removed' }
    | { status: 'conflict'; remote?: ServerResponsiveRevisionEnvelope }
  >(`${namespace}/remove_responsive_revision`, {
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

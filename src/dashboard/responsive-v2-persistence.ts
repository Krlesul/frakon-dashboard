import type { DashboardStorageTransport } from './dashboard-storage';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
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

function fromServerEnvelope(envelope: ServerResponsiveRevisionEnvelope): ResponsiveCanvasV2RevisionEnvelope {
  return {
    bundle: structuredClone(envelope.document),
    revision: envelope.revision,
    parentRevision: envelope.parentRevision,
    updatedAt: envelope.updatedAt,
    clientId: envelope.clientId,
  };
}

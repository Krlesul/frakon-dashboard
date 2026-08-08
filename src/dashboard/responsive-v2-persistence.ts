import type { DashboardStorageTransport } from './dashboard-storage';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import type { ResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import type { ResponsiveCanvasV2RevisionEnvelope } from './responsive-v2-revision';

export interface ResponsiveCanvasV2PersistenceDecision {
  allowed: boolean;
  reason?: 'read-disabled' | 'write-disabled' | 'atomic-revision-disabled' | 'revision-sync-disabled' | 'unsupported-breakpoint';
}

export function responsiveCanvasV2PersistenceDecision(
  capabilities: DashboardServerCapabilities,
  bundle: ResponsiveCanvasV2Bundle,
): ResponsiveCanvasV2PersistenceDecision {
  const responsive = capabilities.responsiveCanvasV2;
  if (!responsive.read) return { allowed: false, reason: 'read-disabled' };
  if (!responsive.write) return { allowed: false, reason: 'write-disabled' };
  if (!responsive.atomicRevision) return { allowed: false, reason: 'atomic-revision-disabled' };
  if (!capabilities.revisionSync) return { allowed: false, reason: 'revision-sync-disabled' };
  const unsupported = Object.keys(bundle.documents).find((breakpoint) => !responsive.breakpoints.has(breakpoint));
  if (unsupported) return { allowed: false, reason: 'unsupported-breakpoint' };
  return { allowed: true };
}

export type ResponsiveCanvasV2PersistResult =
  | { status: 'blocked'; reason: NonNullable<ResponsiveCanvasV2PersistenceDecision['reason']> }
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

import type { DashboardStorageTransport } from './dashboard-storage';
import { loadDashboardServerCapabilities, type DashboardServerCapabilities } from './dashboard-server-capabilities';
import { isResponsiveCanvasV2Bundle, type ResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import type { ResponsiveCanvasV2RevisionEnvelope } from './responsive-v2-revision';

export type ResponsiveCanvasV2ReadResult =
  | {
      status: 'loaded';
      capabilities: DashboardServerCapabilities;
      envelope: ResponsiveCanvasV2RevisionEnvelope;
    }
  | {
      status: 'absent' | 'blocked';
      capabilities: DashboardServerCapabilities;
    }
  | {
      status: 'invalid';
      capabilities: DashboardServerCapabilities;
      reason: 'invalid-envelope' | 'invalid-bundle';
    };

export async function loadResponsiveCanvasV2ReadOnly(
  transport: DashboardStorageTransport,
  dashboardId: string,
  namespace = 'frakon/dashboard',
): Promise<ResponsiveCanvasV2ReadResult> {
  const capabilities = await loadDashboardServerCapabilities(transport, namespace);
  const responsive = capabilities.responsiveCanvasV2;
  if (!responsive.read || !responsive.atomicRevision || !capabilities.revisionSync) {
    return { status: 'blocked', capabilities };
  }

  const raw = await transport.request<unknown>(`${namespace}/load_responsive_bundle_revision`, {
    dashboard_id: dashboardId,
  });
  if (raw == null) return { status: 'absent', capabilities };
  if (!isRevisionEnvelopeLike(raw)) {
    return { status: 'invalid', capabilities, reason: 'invalid-envelope' };
  }
  if (!isResponsiveCanvasV2Bundle(raw.document)) {
    return { status: 'invalid', capabilities, reason: 'invalid-bundle' };
  }

  return {
    status: 'loaded',
    capabilities,
    envelope: {
      bundle: structuredClone(raw.document),
      revision: raw.revision,
      parentRevision: raw.parentRevision,
      updatedAt: raw.updatedAt,
      clientId: raw.clientId,
    },
  };
}

function validRevisionId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256;
}

function isRevisionEnvelopeLike(value: unknown): value is {
  document: ResponsiveCanvasV2Bundle;
  revision: string;
  parentRevision?: string;
  updatedAt: number;
  clientId: string;
} {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (!validRevisionId(candidate.revision)) return false;
  if (candidate.parentRevision !== undefined && !validRevisionId(candidate.parentRevision)) return false;
  if (candidate.parentRevision === candidate.revision) return false;
  if (typeof candidate.updatedAt !== 'number' || !Number.isFinite(candidate.updatedAt) || candidate.updatedAt < 0) return false;
  if (typeof candidate.clientId !== 'string' || candidate.clientId.length === 0 || candidate.clientId.length > 128) return false;
  return 'document' in candidate;
}

import type { DashboardStorageTransport } from './dashboard-storage';
import {
  dashboardLayoutCapabilitiesFromServer,
  loadDashboardServerCapabilities,
  type DashboardServerCapabilities,
} from './dashboard-server-capabilities';
import type { DashboardRevisionEnvelope } from './dashboard-revision';
import {
  isDashboardDocumentV2,
  normalizeDashboardV2,
  type FrakonDashboardDocumentV2,
} from './layout-model-v2';
import {
  attachResponsiveCanvasV2Bundle,
  isResponsiveCanvasV2Bundle,
  responsiveCanvasV2BundleDocument,
} from './responsive-v2-bundle';

export type DashboardV2ReadResult =
  | {
      status: 'loaded';
      capabilities: DashboardServerCapabilities;
      envelope: DashboardRevisionEnvelope<FrakonDashboardDocumentV2>;
    }
  | {
      status: 'absent' | 'blocked';
      capabilities: DashboardServerCapabilities;
    }
  | {
      status: 'invalid';
      capabilities: DashboardServerCapabilities;
      reason: 'invalid-envelope' | 'unexpected-document-version';
    };

export async function loadDashboardV2ReadOnly(
  transport: DashboardStorageTransport,
  dashboardId: string,
  namespace = 'frakon/dashboard',
): Promise<DashboardV2ReadResult> {
  const capabilities = await loadDashboardServerCapabilities(transport, namespace);
  const layoutCapabilities = dashboardLayoutCapabilitiesFromServer(capabilities);
  if (!layoutCapabilities.readV2 || !capabilities.revisionSync) {
    return { status: 'blocked', capabilities };
  }

  if (capabilities.responsiveCanvasV2.read && capabilities.responsiveCanvasV2.atomicRevision) {
    const responsiveRaw = await transport.request<unknown>(`${namespace}/load_responsive_revision`, {
      dashboard_id: dashboardId,
    });
    if (responsiveRaw != null) {
      if (!isRevisionEnvelopeLike(responsiveRaw) || !isResponsiveCanvasV2Bundle(responsiveRaw.document)) {
        return { status: 'invalid', capabilities, reason: 'invalid-envelope' };
      }
      const bundle = responsiveRaw.document;
      const active = responsiveCanvasV2BundleDocument(bundle, bundle.defaultBreakpoint);
      if (!active) return { status: 'invalid', capabilities, reason: 'invalid-envelope' };
      return {
        status: 'loaded',
        capabilities,
        envelope: {
          document: attachResponsiveCanvasV2Bundle(normalizeDashboardV2(active), bundle),
          revision: responsiveRaw.revision,
          parentRevision: responsiveRaw.parentRevision,
          updatedAt: responsiveRaw.updatedAt,
          clientId: responsiveRaw.clientId,
        },
      };
    }
  }

  const raw = await transport.request<unknown>(`${namespace}/load_revision`, {
    dashboard_id: dashboardId,
  });
  if (raw == null) return { status: 'absent', capabilities };
  if (!isRevisionEnvelopeLike(raw)) {
    return { status: 'invalid', capabilities, reason: 'invalid-envelope' };
  }
  if (!isDashboardDocumentV2(raw.document)) {
    return { status: 'invalid', capabilities, reason: 'unexpected-document-version' };
  }

  return {
    status: 'loaded',
    capabilities,
    envelope: {
      document: normalizeDashboardV2(raw.document),
      revision: raw.revision,
      parentRevision: raw.parentRevision,
      updatedAt: raw.updatedAt,
      clientId: raw.clientId,
    },
  };
}

function isRevisionEnvelopeLike(value: unknown): value is {
  document: unknown;
  revision: string;
  parentRevision?: string;
  updatedAt: number;
  clientId: string;
} {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.revision === 'string'
    && candidate.revision.length > 0
    && (candidate.parentRevision === undefined || typeof candidate.parentRevision === 'string')
    && typeof candidate.updatedAt === 'number'
    && Number.isFinite(candidate.updatedAt)
    && typeof candidate.clientId === 'string'
    && candidate.clientId.length > 0
    && 'document' in candidate;
}

import type { DashboardStorageTransport } from './dashboard-storage';
import {
  dashboardLayoutCapabilitiesFromServer,
  loadDashboardServerCapabilities,
  type DashboardServerCapabilities,
} from './dashboard-server-capabilities';
import type { DashboardRevisionEnvelope } from './dashboard-revision';
import { isDashboardDocumentV2, normalizeDashboardV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';
import { isResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import type { ResponsiveCanvasV2RevisionEnvelope } from './responsive-v2-revision';

export type CanvasV2LoadChainResult =
  | {
      status: 'responsive';
      capabilities: DashboardServerCapabilities;
      envelope: ResponsiveCanvasV2RevisionEnvelope;
    }
  | {
      status: 'single-v2';
      capabilities: DashboardServerCapabilities;
      envelope: DashboardRevisionEnvelope<FrakonDashboardDocumentV2>;
    }
  | {
      status: 'fallback-v1';
      capabilities: DashboardServerCapabilities;
    }
  | {
      status: 'invalid';
      capabilities: DashboardServerCapabilities;
      reason: 'invalid-responsive-envelope' | 'invalid-responsive-bundle' | 'invalid-v2-envelope';
    };

export async function loadCanvasV2HomeAssistantChain(
  transport: DashboardStorageTransport,
  dashboardId: string,
  namespace = 'frakon/dashboard',
): Promise<CanvasV2LoadChainResult> {
  const capabilities = await loadDashboardServerCapabilities(transport, namespace);

  if (capabilities.responsiveCanvasV2.read
    && capabilities.responsiveCanvasV2.atomicRevision
    && capabilities.revisionSync) {
    const rawResponsive = await transport.request<unknown>(`${namespace}/load_responsive_bundle_revision`, {
      dashboard_id: dashboardId,
    });
    if (rawResponsive != null) {
      if (!isRevisionEnvelopeLike(rawResponsive)) {
        return { status: 'invalid', capabilities, reason: 'invalid-responsive-envelope' };
      }
      if (!isResponsiveCanvasV2Bundle(rawResponsive.document)) {
        return { status: 'invalid', capabilities, reason: 'invalid-responsive-bundle' };
      }
      return {
        status: 'responsive',
        capabilities,
        envelope: {
          bundle: structuredClone(rawResponsive.document),
          revision: rawResponsive.revision,
          parentRevision: rawResponsive.parentRevision,
          updatedAt: rawResponsive.updatedAt,
          clientId: rawResponsive.clientId,
        },
      };
    }
  }

  const layoutCapabilities = dashboardLayoutCapabilitiesFromServer(capabilities);
  if (!layoutCapabilities.readV2 || !capabilities.revisionSync) {
    return { status: 'fallback-v1', capabilities };
  }

  const rawV2 = await transport.request<unknown>(`${namespace}/load_revision`, {
    dashboard_id: dashboardId,
  });
  if (rawV2 == null) return { status: 'fallback-v1', capabilities };
  if (!isRevisionEnvelopeLike(rawV2)) {
    return { status: 'invalid', capabilities, reason: 'invalid-v2-envelope' };
  }
  if (!isDashboardDocumentV2(rawV2.document)) {
    return { status: 'fallback-v1', capabilities };
  }

  return {
    status: 'single-v2',
    capabilities,
    envelope: {
      document: normalizeDashboardV2(rawV2.document),
      revision: rawV2.revision,
      parentRevision: rawV2.parentRevision,
      updatedAt: rawV2.updatedAt,
      clientId: rawV2.clientId,
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

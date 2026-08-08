import type { DashboardStorageTransport } from './dashboard-storage';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { loadResponsiveCanvasV2ReadOnly } from './responsive-v2-read-loader';
import type { ResponsiveCanvasV2RevisionEnvelope } from './responsive-v2-revision';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';

export type ResponsiveCanvasV2RecoveryResult =
  | {
      status: 'recovered';
      capabilities: DashboardServerCapabilities;
      envelope: ResponsiveCanvasV2RevisionEnvelope;
      controller: ResponsiveV2DraftController;
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

export async function recoverResponsiveCanvasV2ReadOnly(
  transport: DashboardStorageTransport,
  dashboardId: string,
  namespace = 'frakon/dashboard',
): Promise<ResponsiveCanvasV2RecoveryResult> {
  const loaded = await loadResponsiveCanvasV2ReadOnly(transport, dashboardId, namespace);
  if (loaded.status !== 'loaded') return loaded;

  return {
    status: 'recovered',
    capabilities: loaded.capabilities,
    envelope: structuredClone(loaded.envelope),
    controller: ResponsiveV2DraftController.fromBundle(loaded.envelope.bundle),
  };
}

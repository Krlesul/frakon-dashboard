import {
  RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT,
  RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT,
  RESPONSIVE_CANVAS_V2_STORAGE_NAMESPACE,
  type DashboardServerCapabilities,
} from './dashboard-server-capabilities';
import type { ResponsiveV2DraftController } from './responsive-v2-draft-controller';

export type ResponsiveV2AlphaReadinessStatus =
  | 'unavailable'
  | 'contract-mismatch'
  | 'install-mismatch'
  | 'read-ready'
  | 'dry-run-ready'
  | 'write-enabled';

export interface ResponsiveV2AlphaReadiness {
  status: ResponsiveV2AlphaReadinessStatus;
  contractReady: boolean;
  installReady: boolean;
  readReady: boolean;
  dryRunReady: boolean;
  writeLocked: boolean;
  dirty: boolean;
  blockers: string[];
}

export function responsiveV2AlphaReadiness(
  capabilities: DashboardServerCapabilities | undefined,
  controller?: ResponsiveV2DraftController,
): ResponsiveV2AlphaReadiness {
  const responsive = capabilities?.responsiveCanvasV2;
  const dirty = (controller?.snapshot.dirtyBreakpoints.length ?? 0) > 0;
  const blockers: string[] = [];

  if (!responsive) blockers.push('capabilities-unavailable');
  const contractReady = responsive?.contractCompatible === true;
  if (responsive && !contractReady) blockers.push('contract-incompatible');

  const installReady = contractReady
    && responsive?.storageNamespace === RESPONSIVE_CANVAS_V2_STORAGE_NAMESPACE
    && responsive?.loadEndpoint === RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT
    && responsive?.dryRunEndpoint === RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT;
  if (contractReady && !installReady) blockers.push('transport-metadata-mismatch');

  const readReady = installReady
    && responsive?.read === true
    && responsive.atomicRevision === true
    && capabilities?.revisionSync === true;
  if (installReady && !readReady) blockers.push('responsive-read-not-ready');

  const dryRunReady = readReady && typeof responsive?.dryRunEndpoint === 'string' && dirty;
  if (readReady && dirty && !dryRunReady) blockers.push('dry-run-unavailable');

  const writeLocked = responsive?.write !== true;

  let status: ResponsiveV2AlphaReadinessStatus;
  if (!responsive) status = 'unavailable';
  else if (!contractReady) status = 'contract-mismatch';
  else if (!installReady) status = 'install-mismatch';
  else if (responsive.write === true) status = 'write-enabled';
  else if (dryRunReady) status = 'dry-run-ready';
  else status = 'read-ready';

  return {
    status,
    contractReady,
    installReady,
    readReady,
    dryRunReady,
    writeLocked,
    dirty,
    blockers,
  };
}

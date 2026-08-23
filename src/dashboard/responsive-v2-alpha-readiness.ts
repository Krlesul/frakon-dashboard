import {
  RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT,
  RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT,
  RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT,
  RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT,
  RESPONSIVE_CANVAS_V2_STORAGE_NAMESPACE,
  type DashboardServerCapabilities,
} from './dashboard-server-capabilities';
import {
  RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
  RESPONSIVE_CANVAS_V2_MAX_ITEMS,
  RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES,
} from './responsive-v2-bundle';
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

const REQUIRED_BREAKPOINTS = ['mobile', 'tablet', 'desktop', 'wide'] as const;

function exactBreakpointContract(breakpoints: ReadonlySet<string> | undefined): boolean {
  if (!breakpoints || breakpoints.size !== REQUIRED_BREAKPOINTS.length) return false;
  return REQUIRED_BREAKPOINTS.every((breakpoint) => breakpoints.has(breakpoint));
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

  const transportReady = contractReady
    && responsive?.storageNamespace === RESPONSIVE_CANVAS_V2_STORAGE_NAMESPACE
    && responsive?.loadEndpoint === RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT
    && responsive?.dryRunEndpoint === RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT
    && responsive?.saveEndpoint === RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT
    && responsive?.removeEndpoint === RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT;

  const limitsReady = contractReady
    && responsive?.maxItems === RESPONSIVE_CANVAS_V2_MAX_ITEMS
    && responsive?.maxConstraints === RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS
    && responsive?.maxSerializedBytes === RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES;

  const breakpointsReady = contractReady && exactBreakpointContract(responsive?.breakpoints);

  const installReady = transportReady && limitsReady && breakpointsReady;
  if (contractReady && !transportReady) blockers.push('transport-metadata-mismatch');
  if (contractReady && !limitsReady) blockers.push('validation-limits-mismatch');
  if (contractReady && !breakpointsReady) blockers.push('breakpoint-contract-mismatch');

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

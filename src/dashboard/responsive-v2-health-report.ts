import type { ResponsiveCanvasV2SyncState } from './responsive-v2-sync-controller';

export interface ResponsiveCanvasV2HealthReport {
  status: 'healthy' | 'blocked' | 'conflict' | 'error' | 'unloaded';
  contractVersion?: number;
  contractCompatible: boolean;
  readEnabled: boolean;
  writeEnabled: boolean;
  atomicRevision: boolean;
  revisionSync: boolean;
  loadEndpoint: 'frakon/dashboard/load_responsive_bundle_revision';
  saveEndpoint: 'frakon/dashboard/save_responsive_revision';
  baseRevision?: string;
  dirtyBreakpoints: string[];
  conflictBreakpoints: string[];
  error?: string;
}

export function responsiveCanvasV2HealthReport(state: ResponsiveCanvasV2SyncState): ResponsiveCanvasV2HealthReport {
  const capabilities = state.capabilities?.responsiveCanvasV2;
  const conflictBreakpoints = state.conflict?.merge.conflicts.map((conflict) => conflict.breakpoint) ?? [];
  const dirtyBreakpoints = state.controller?.snapshot.dirtyBreakpoints ?? [];
  const contractCompatible = capabilities?.contractCompatible === true;
  const readEnabled = capabilities?.read === true;
  const writeEnabled = capabilities?.write === true;
  const atomicRevision = capabilities?.atomicRevision === true;
  const revisionSync = state.capabilities?.revisionSync === true;

  let status: ResponsiveCanvasV2HealthReport['status'];
  if (state.error) status = 'error';
  else if (conflictBreakpoints.length) status = 'conflict';
  else if (!state.capabilities && !state.envelope && !state.controller) status = 'unloaded';
  else if (!contractCompatible || !readEnabled || !writeEnabled || !atomicRevision || !revisionSync) status = 'blocked';
  else status = 'healthy';

  return {
    status,
    contractVersion: capabilities?.contractVersion,
    contractCompatible,
    readEnabled,
    writeEnabled,
    atomicRevision,
    revisionSync,
    loadEndpoint: 'frakon/dashboard/load_responsive_bundle_revision',
    saveEndpoint: 'frakon/dashboard/save_responsive_revision',
    baseRevision: state.envelope?.revision,
    dirtyBreakpoints: [...dirtyBreakpoints],
    conflictBreakpoints,
    error: state.error?.message,
  };
}

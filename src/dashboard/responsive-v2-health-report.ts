import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import type { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import type { ResponsiveCanvasV2SyncState } from './responsive-v2-sync-controller';

export interface ResponsiveCanvasV2HealthEditorContext {
  capabilities: DashboardServerCapabilities;
  controller: ResponsiveV2DraftController;
  baseRevision?: string;
  hasUnresolvedConflict: boolean;
}

export interface ResponsiveCanvasV2HealthReport {
  status: 'healthy' | 'blocked' | 'conflict' | 'error' | 'unloaded';
  contractVersion?: number;
  contractCompatible: boolean;
  readEnabled: boolean;
  writeEnabled: boolean;
  atomicRevision: boolean;
  revisionSync: boolean;
  maxItems?: number;
  maxConstraints?: number;
  maxSerializedBytes?: number;
  storageNamespace?: string;
  loadEndpoint?: string;
  saveEndpoint?: string;
  removeEndpoint?: string;
  baseRevision?: string;
  dirtyBreakpoints: string[];
  conflictBreakpoints: string[];
  error?: string;
  editorContext?: ResponsiveCanvasV2HealthEditorContext;
}

interface HealthInputs {
  capabilities?: DashboardServerCapabilities;
  baseRevision?: string;
  controller?: ResponsiveV2DraftController;
  conflictBreakpoints?: string[];
  error?: string;
  unloaded?: boolean;
}

function fromInputs(inputs: HealthInputs): ResponsiveCanvasV2HealthReport {
  const responsive = inputs.capabilities?.responsiveCanvasV2;
  const conflictBreakpoints = inputs.conflictBreakpoints ?? [];
  const dirtyBreakpoints = inputs.controller?.snapshot.dirtyBreakpoints ?? [];
  const contractCompatible = responsive?.contractCompatible === true;
  const readEnabled = responsive?.read === true;
  const writeEnabled = responsive?.write === true;
  const atomicRevision = responsive?.atomicRevision === true;
  const revisionSync = inputs.capabilities?.revisionSync === true;

  let status: ResponsiveCanvasV2HealthReport['status'];
  if (inputs.error) status = 'error';
  else if (conflictBreakpoints.length) status = 'conflict';
  else if (inputs.unloaded === true || (!inputs.capabilities && !inputs.baseRevision && !inputs.controller)) status = 'unloaded';
  else if (!contractCompatible || !readEnabled || !writeEnabled || !atomicRevision || !revisionSync) status = 'blocked';
  else status = 'healthy';

  return {
    status,
    contractVersion: responsive?.contractVersion,
    contractCompatible,
    readEnabled,
    writeEnabled,
    atomicRevision,
    revisionSync,
    maxItems: responsive?.maxItems,
    maxConstraints: responsive?.maxConstraints,
    maxSerializedBytes: responsive?.maxSerializedBytes,
    storageNamespace: responsive?.storageNamespace,
    loadEndpoint: responsive?.loadEndpoint,
    saveEndpoint: responsive?.saveEndpoint,
    removeEndpoint: responsive?.removeEndpoint,
    baseRevision: inputs.baseRevision,
    dirtyBreakpoints: [...dirtyBreakpoints],
    conflictBreakpoints: [...conflictBreakpoints],
    error: inputs.error,
    editorContext: inputs.capabilities && inputs.controller
      ? {
          capabilities: inputs.capabilities,
          controller: inputs.controller,
          baseRevision: inputs.baseRevision,
          hasUnresolvedConflict: conflictBreakpoints.length > 0,
        }
      : undefined,
  };
}

export function responsiveCanvasV2HealthReport(state: ResponsiveCanvasV2SyncState): ResponsiveCanvasV2HealthReport {
  return fromInputs({
    capabilities: state.capabilities,
    baseRevision: state.envelope?.revision,
    controller: state.controller,
    conflictBreakpoints: state.conflict?.merge.conflicts.map((conflict) => conflict.breakpoint) ?? [],
    error: state.error?.message,
    unloaded: !state.capabilities && !state.envelope && !state.controller,
  });
}

export function responsiveCanvasV2HealthReportFromEditorState(input: {
  capabilities?: DashboardServerCapabilities;
  revision?: string;
  controller?: ResponsiveV2DraftController;
  error?: string;
}): ResponsiveCanvasV2HealthReport {
  return fromInputs({
    capabilities: input.capabilities,
    baseRevision: input.revision,
    controller: input.controller,
    error: input.error,
    unloaded: !input.capabilities && !input.revision && !input.controller,
  });
}

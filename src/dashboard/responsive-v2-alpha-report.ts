import type { FrakonDashboardBuildInfo } from './dashboard-build-info';
import type { ResponsiveCanvasV2HealthReport } from './responsive-v2-health-report';

export type ResponsiveV2DryRunObservationStatus =
  | 'not-run'
  | 'valid'
  | 'conflict'
  | 'remote-removed'
  | 'blocked'
  | 'error';

export interface ResponsiveV2DryRunObservation {
  status: ResponsiveV2DryRunObservationStatus;
  candidateRevision?: string;
  remoteRevision?: string;
  reason?: string;
  checkedAt?: number;
}

export interface ResponsiveV2AlphaValidationReport {
  reportVersion: 1;
  generatedAt: number;
  build: {
    version?: string;
    sourceCommit?: string;
    responsiveContractVersion?: number;
    frontendSha256?: string;
  };
  persistence: {
    status: ResponsiveCanvasV2HealthReport['status'];
    contractVersion?: number;
    contractCompatible: boolean;
    readEnabled: boolean;
    writeEnabled: boolean;
    atomicRevision: boolean;
    revisionSync: boolean;
    storageNamespace?: string;
    loadEndpoint?: string;
    dryRunEndpoint?: string;
    saveEndpoint?: string;
    removeEndpoint?: string;
    maxItems?: number;
    maxConstraints?: number;
    maxSerializedBytes?: number;
    dirtyBreakpoints: string[];
    conflictBreakpoints: string[];
  };
  dryRun: ResponsiveV2DryRunObservation;
}

export function responsiveV2AlphaValidationReport(input: {
  health: ResponsiveCanvasV2HealthReport;
  build?: FrakonDashboardBuildInfo;
  dryRun?: ResponsiveV2DryRunObservation;
  now?: () => number;
}): ResponsiveV2AlphaValidationReport {
  const { health, build } = input;
  return {
    reportVersion: 1,
    generatedAt: (input.now ?? Date.now)(),
    build: {
      version: build?.version,
      sourceCommit: build?.sourceCommit,
      responsiveContractVersion: build?.responsiveContractVersion,
      frontendSha256: build?.frontendSha256,
    },
    persistence: {
      status: health.status,
      contractVersion: health.contractVersion,
      contractCompatible: health.contractCompatible,
      readEnabled: health.readEnabled,
      writeEnabled: health.writeEnabled,
      atomicRevision: health.atomicRevision,
      revisionSync: health.revisionSync,
      storageNamespace: health.storageNamespace,
      loadEndpoint: health.loadEndpoint,
      dryRunEndpoint: health.dryRunEndpoint,
      saveEndpoint: health.saveEndpoint,
      removeEndpoint: health.removeEndpoint,
      maxItems: health.maxItems,
      maxConstraints: health.maxConstraints,
      maxSerializedBytes: health.maxSerializedBytes,
      dirtyBreakpoints: [...health.dirtyBreakpoints],
      conflictBreakpoints: [...health.conflictBreakpoints],
    },
    dryRun: input.dryRun ? { ...input.dryRun } : { status: 'not-run' },
  };
}

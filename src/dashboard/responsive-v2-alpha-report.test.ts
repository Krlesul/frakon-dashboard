import { describe, expect, it } from 'vitest';
import { responsiveV2AlphaValidationReport } from './responsive-v2-alpha-report';
import type { ResponsiveCanvasV2HealthReport } from './responsive-v2-health-report';

function health(): ResponsiveCanvasV2HealthReport {
  return {
    status: 'blocked',
    contractVersion: 1,
    contractCompatible: true,
    readEnabled: true,
    writeEnabled: false,
    atomicRevision: true,
    revisionSync: true,
    maxItems: 2000,
    maxConstraints: 4000,
    maxSerializedBytes: 2_000_000,
    storageNamespace: 'frakon_dashboard.responsive_dashboards',
    loadEndpoint: 'load',
    dryRunEndpoint: 'dry-run',
    saveEndpoint: 'save',
    removeEndpoint: 'remove',
    baseRevision: 'private-revision-not-exported',
    dirtyBreakpoints: ['mobile'],
    conflictBreakpoints: [],
    error: undefined,
  };
}

describe('responsive v2 alpha validation report', () => {
  it('exports build and transport diagnostics without dashboard payload or base revision', () => {
    const report = responsiveV2AlphaValidationReport({
      health: health(),
      build: {
        version: '0.16.0-alpha.1',
        sourceCommit: 'abcdef123456',
        responsiveContractVersion: 1,
        frontendSha256: 'a'.repeat(64),
      },
      dryRun: { status: 'valid', candidateRevision: 'candidate-r2', checkedAt: 123 },
      now: () => 456,
    });

    expect(report).toMatchObject({
      reportVersion: 1,
      generatedAt: 456,
      build: { version: '0.16.0-alpha.1', sourceCommit: 'abcdef123456' },
      persistence: {
        writeEnabled: false,
        dryRunEndpoint: 'dry-run',
        dirtyBreakpoints: ['mobile'],
      },
      dryRun: { status: 'valid', candidateRevision: 'candidate-r2', checkedAt: 123 },
    });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('private-revision-not-exported');
    expect(serialized).not.toContain('entity');
    expect(serialized).not.toContain('items');
  });

  it('uses a safe not-run dry-run state when no validation was attempted', () => {
    const report = responsiveV2AlphaValidationReport({ health: health(), now: () => 1 });
    expect(report.dryRun).toEqual({ status: 'not-run' });
  });
});

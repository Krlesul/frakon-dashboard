import { describe, expect, it } from 'vitest';
import { responsiveCanvasV2HealthReport } from './responsive-v2-health-report';
import type { ResponsiveCanvasV2SyncState } from './responsive-v2-sync-controller';

describe('responsive canvas v2 health report', () => {
  it('reports an unloaded controller without inventing capabilities', () => {
    expect(responsiveCanvasV2HealthReport({ loading: false, saving: false })).toMatchObject({
      status: 'unloaded',
      contractCompatible: false,
      readEnabled: false,
      writeEnabled: false,
      dirtyBreakpoints: [],
      conflictBreakpoints: [],
    });
  });

  it('reports current production capabilities as blocked only by write enablement', () => {
    const state: ResponsiveCanvasV2SyncState = {
      loading: false,
      saving: false,
      capabilities: {
        readableDocumentVersions: new Set([1, 2]),
        writableDocumentVersions: new Set([1]),
        revisionSync: true,
        maxItems: 2000,
        responsiveCanvasV2: {
          contractVersion: 1,
          contractCompatible: true,
          read: true,
          write: false,
          atomicRevision: true,
          breakpoints: new Set(['mobile', 'tablet', 'desktop', 'wide']),
        },
      },
    };
    expect(responsiveCanvasV2HealthReport(state)).toMatchObject({
      status: 'blocked',
      contractVersion: 1,
      contractCompatible: true,
      readEnabled: true,
      writeEnabled: false,
      atomicRevision: true,
      revisionSync: true,
      loadEndpoint: 'frakon/dashboard/load_responsive_bundle_revision',
      saveEndpoint: 'frakon/dashboard/save_responsive_revision',
    });
  });

  it('promotes explicit sync errors above capability status', () => {
    const report = responsiveCanvasV2HealthReport({ loading: false, saving: false, error: new Error('boom') });
    expect(report.status).toBe('error');
    expect(report.error).toBe('boom');
  });
});

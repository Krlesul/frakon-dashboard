import { describe, expect, it } from 'vitest';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { responsiveCanvasV2HealthReport, responsiveCanvasV2HealthReportFromEditorState } from './responsive-v2-health-report';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import type { ResponsiveCanvasV2SyncState } from './responsive-v2-sync-controller';

function document(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [],
  };
}

function capabilities(write = false) {
  return {
    readableDocumentVersions: new Set([1, 2]),
    writableDocumentVersions: new Set([1]),
    revisionSync: true,
    maxItems: 2000,
    responsiveCanvasV2: {
      contractVersion: 1,
      contractCompatible: true,
      read: true,
      write,
      atomicRevision: true,
      breakpoints: new Set(['mobile', 'tablet', 'desktop', 'wide']),
    },
  };
}

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
      capabilities: capabilities(false),
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

  it('builds the same blocked production snapshot from editor-owned state', () => {
    const controller = new ResponsiveV2DraftController(document());
    const report = responsiveCanvasV2HealthReportFromEditorState({
      capabilities: capabilities(false),
      revision: 'r12',
      controller,
    });
    expect(report).toMatchObject({
      status: 'blocked',
      baseRevision: 'r12',
      contractCompatible: true,
      readEnabled: true,
      writeEnabled: false,
      dirtyBreakpoints: [],
    });
  });
});

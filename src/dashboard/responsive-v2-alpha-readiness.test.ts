import { describe, expect, it } from 'vitest';
import {
  RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
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
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { ResponsiveV2DraftController } from './responsive-v2-draft-controller';
import { responsiveV2AlphaReadiness } from './responsive-v2-alpha-readiness';

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

function capabilities(write = false): DashboardServerCapabilities {
  return {
    readableDocumentVersions: new Set([1, 2]),
    writableDocumentVersions: new Set([1]),
    revisionSync: true,
    maxItems: 2000,
    responsiveCanvasV2: {
      contractVersion: RESPONSIVE_CANVAS_V2_CONTRACT_VERSION,
      contractCompatible: true,
      read: true,
      write,
      atomicRevision: true,
      breakpoints: new Set(['mobile', 'tablet', 'desktop', 'wide']),
      maxItems: RESPONSIVE_CANVAS_V2_MAX_ITEMS,
      maxConstraints: RESPONSIVE_CANVAS_V2_MAX_CONSTRAINTS,
      maxSerializedBytes: RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES,
      storageNamespace: RESPONSIVE_CANVAS_V2_STORAGE_NAMESPACE,
      loadEndpoint: RESPONSIVE_CANVAS_V2_LOAD_ENDPOINT,
      dryRunEndpoint: RESPONSIVE_CANVAS_V2_DRY_RUN_ENDPOINT,
      saveEndpoint: RESPONSIVE_CANVAS_V2_SAVE_ENDPOINT,
      removeEndpoint: RESPONSIVE_CANVAS_V2_REMOVE_ENDPOINT,
    },
  };
}

describe('responsive v2 alpha readiness', () => {
  it('reports a clean locked server as read-ready', () => {
    const result = responsiveV2AlphaReadiness(capabilities(false), new ResponsiveV2DraftController(document()));
    expect(result).toMatchObject({
      status: 'read-ready',
      contractReady: true,
      installReady: true,
      readReady: true,
      dryRunReady: false,
      writeLocked: true,
      dirty: false,
    });
    expect(result.blockers).toEqual([]);
  });

  it('promotes a dirty draft to dry-run-ready while writes stay locked', () => {
    const controller = new ResponsiveV2DraftController(document());
    const next = {
      ...controller.snapshot.active.document,
      layout: { ...controller.snapshot.active.document.layout, minHeight: 720 },
    };
    controller.applyActive({ status: 'committed', document: next, collisionIds: [] }, false);
    const result = responsiveV2AlphaReadiness(capabilities(false), controller);
    expect(result.status).toBe('dry-run-ready');
    expect(result.dryRunReady).toBe(true);
    expect(result.writeLocked).toBe(true);
  });

  it('fails closed when advertised transport metadata does not match the alpha contract', () => {
    const caps = capabilities(false);
    caps.responsiveCanvasV2.storageNamespace = 'wrong';
    const result = responsiveV2AlphaReadiness(caps, new ResponsiveV2DraftController(document()));
    expect(result.status).toBe('install-mismatch');
    expect(result.installReady).toBe(false);
    expect(result.blockers).toContain('transport-metadata-mismatch');
  });

  it('fails closed when server safety limits differ from the tested alpha contract', () => {
    const caps = capabilities(false);
    caps.responsiveCanvasV2.maxSerializedBytes = RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES + 1;
    const result = responsiveV2AlphaReadiness(caps, new ResponsiveV2DraftController(document()));
    expect(result.status).toBe('install-mismatch');
    expect(result.installReady).toBe(false);
    expect(result.blockers).toContain('validation-limits-mismatch');
  });

  it('fails closed when the exact breakpoint contract differs', () => {
    const caps = capabilities(false);
    caps.responsiveCanvasV2.breakpoints = new Set(['mobile', 'tablet', 'desktop']);
    const result = responsiveV2AlphaReadiness(caps, new ResponsiveV2DraftController(document()));
    expect(result.status).toBe('install-mismatch');
    expect(result.installReady).toBe(false);
    expect(result.blockers).toContain('breakpoint-contract-mismatch');
  });

  it('reports an explicitly unlocked server separately from the alpha locked state', () => {
    const result = responsiveV2AlphaReadiness(capabilities(true), new ResponsiveV2DraftController(document()));
    expect(result.status).toBe('write-enabled');
    expect(result.writeLocked).toBe(false);
  });
});

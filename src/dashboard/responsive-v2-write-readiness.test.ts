import { describe, expect, it } from 'vitest';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { createResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import { responsiveCanvasV2WriteReadiness } from './responsive-v2-write-readiness';

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

function capabilities(overrides: Partial<DashboardServerCapabilities['responsiveCanvasV2']> = {}): DashboardServerCapabilities {
  return {
    readableDocumentVersions: new Set([1, 2]),
    writableDocumentVersions: new Set([1]),
    revisionSync: true,
    maxItems: 2000,
    responsiveCanvasV2: {
      contractVersion: 1,
      contractCompatible: true,
      read: true,
      write: true,
      atomicRevision: true,
      breakpoints: new Set(['mobile', 'tablet', 'desktop', 'wide']),
      ...overrides,
    },
  };
}

describe('responsive canvas v2 write readiness', () => {
  it('allows only a fully supported valid bundle', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: document() }, 'desktop');
    expect(responsiveCanvasV2WriteReadiness(capabilities(), bundle)).toEqual({ allowed: true, blockers: [] });
  });

  it('reports every relevant server-side blocker instead of hiding after the first one', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: document() }, 'desktop');
    const server = capabilities({ contractCompatible: false, read: false, write: false, atomicRevision: false, breakpoints: new Set() });
    server.revisionSync = false;
    expect(responsiveCanvasV2WriteReadiness(server, bundle).blockers).toEqual([
      'contract-incompatible',
      'read-disabled',
      'write-disabled',
      'atomic-revision-disabled',
      'revision-sync-disabled',
      'unsupported-breakpoint',
    ]);
  });

  it('blocks an otherwise enabled server when the responsive contract is incompatible', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: document() }, 'desktop');
    expect(responsiveCanvasV2WriteReadiness(capabilities({ contractVersion: 2, contractCompatible: false }), bundle)).toEqual({
      allowed: false,
      blockers: ['contract-incompatible'],
    });
  });

  it('blocks while a responsive conflict is unresolved', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: document() }, 'desktop');
    expect(responsiveCanvasV2WriteReadiness(capabilities(), bundle, { hasUnresolvedConflict: true })).toEqual({
      allowed: false,
      blockers: ['unresolved-conflict'],
    });
  });

  it('detects a malformed runtime bundle even if it was cast into the TypeScript type', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: document() }, 'desktop');
    const malformed = structuredClone(bundle);
    malformed.documents.desktop!.breakpoint = 'mobile';
    expect(responsiveCanvasV2WriteReadiness(capabilities(), malformed).blockers).toContain('invalid-bundle');
  });
});

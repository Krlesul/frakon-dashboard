import { describe, expect, it } from 'vitest';
import type { DashboardServerCapabilities } from './dashboard-server-capabilities';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { createResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import { responsiveV2DryRunStorageProof } from './responsive-v2-dry-run-storage-proof';
import type { ResponsiveCanvasV2ReadResult } from './responsive-v2-read-loader';

const capabilities = {} as DashboardServerCapabilities;

function loaded(revision: string, x = 0): ResponsiveCanvasV2ReadResult {
  const document: FrakonDashboardDocumentV2 = {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x, y: 0, width: 100, height: 100 } }],
  };
  return {
    status: 'loaded',
    capabilities,
    envelope: {
      bundle: createResponsiveCanvasV2Bundle({ desktop: document }, 'desktop'),
      revision,
      updatedAt: 1,
      clientId: 'server',
    },
  };
}

function absent(): ResponsiveCanvasV2ReadResult {
  return { status: 'absent', capabilities };
}

describe('responsive v2 dry-run storage proof', () => {
  it('proves unchanged persisted data when revision and bundle stay identical', () => {
    expect(responsiveV2DryRunStorageProof(loaded('r1'), loaded('r1'))).toMatchObject({
      invariant: 'unchanged',
      beforeStatus: 'loaded',
      afterStatus: 'loaded',
      beforeRevision: 'r1',
      afterRevision: 'r1',
    });
  });

  it('proves an absent store stayed absent', () => {
    expect(responsiveV2DryRunStorageProof(absent(), absent()).invariant).toBe('unchanged');
  });

  it('reports storage changes during the check without blaming dry-run', () => {
    expect(responsiveV2DryRunStorageProof(loaded('r1'), loaded('r2', 8))).toMatchObject({
      invariant: 'changed-during-check',
      beforeRevision: 'r1',
      afterRevision: 'r2',
    });
  });

  it('is unverifiable when either read path is invalid or blocked', () => {
    const invalid: ResponsiveCanvasV2ReadResult = {
      status: 'invalid',
      reason: 'invalid-envelope',
      capabilities,
    };
    expect(responsiveV2DryRunStorageProof(invalid, loaded('r1')).invariant).toBe('unverifiable');
  });
});

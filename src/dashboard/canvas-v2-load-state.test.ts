import { describe, expect, it } from 'vitest';
import { canvasV2EditorLoadState } from './canvas-v2-load-state';
import type { CanvasV2LoadChainResult } from './canvas-v2-load-chain';
import { normalizeDashboardServerCapabilities } from './dashboard-server-capabilities';

const capabilities = normalizeDashboardServerCapabilities({
  readableDocumentVersions: [1, 2],
  writableDocumentVersions: [1],
  revisionSync: true,
  maxItems: 2000,
  responsiveCanvasV2: {
    read: true,
    write: false,
    atomicRevision: true,
    breakpoints: ['mobile', 'tablet', 'desktop', 'wide'],
  },
});

describe('canvas v2 editor load state', () => {
  it('restores all responsive breakpoints as clean draft bases', () => {
    const result: CanvasV2LoadChainResult = {
      status: 'responsive',
      capabilities,
      envelope: {
        revision: 'rr1',
        updatedAt: 10,
        clientId: 'ha',
        bundle: {
          kind: 'responsive-canvas-v2',
          id: 'home',
          title: 'Home',
          defaultBreakpoint: 'mobile',
          documents: {
            mobile: {
              version: 2,
              id: 'home',
              title: 'Home',
              breakpoint: 'mobile',
              layout: { mode: 'canvas', width: 390, minHeight: 700, snap: { enabled: true, size: 8 } },
              items: [],
            },
            desktop: {
              version: 2,
              id: 'home',
              title: 'Home',
              breakpoint: 'desktop',
              layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
              items: [],
            },
          },
        },
      },
    };
    const state = canvasV2EditorLoadState(result);
    expect(state?.mode).toBe('responsive');
    expect(state?.revision).toBe('rr1');
    expect(state?.snapshot.activeBreakpoint).toBe('mobile');
    expect(Object.keys(state?.snapshot.documents ?? {}).sort()).toEqual(['desktop', 'mobile']);
    expect(state?.snapshot.dirtyBreakpoints).toEqual([]);
  });

  it('wraps a single-v2 revision in the same responsive draft controller API', () => {
    const result: CanvasV2LoadChainResult = {
      status: 'single-v2',
      capabilities,
      envelope: {
        revision: 'v2r1',
        updatedAt: 11,
        clientId: 'ha',
        document: {
          version: 2,
          id: 'home',
          title: 'Home',
          breakpoint: 'desktop',
          layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
          items: [],
        },
      },
    };
    const state = canvasV2EditorLoadState(result);
    expect(state?.mode).toBe('single-v2');
    expect(state?.snapshot.activeBreakpoint).toBe('desktop');
    expect(state?.snapshot.dirtyBreakpoints).toEqual([]);
  });

  it('returns no native editor state for the v1 fallback', () => {
    const state = canvasV2EditorLoadState({ status: 'fallback-v1', capabilities });
    expect(state).toBeUndefined();
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { createResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import { applyResponsiveV2SavedStateToHost } from './responsive-v2-saved-host-adapter';
import type { ResponsiveV2SavedHost } from './responsive-v2-saved-host-adapter';

function document(breakpoint: 'desktop' | 'mobile', x: number): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint,
    layout: { mode: 'canvas', width: breakpoint === 'mobile' ? 390 : 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
    items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x, y: 20, width: 200, height: 120 } }],
  };
}

describe('responsive saved host adapter', () => {
  it('projects a saved responsive revision into clean canvas host state', () => {
    const desktop = document('desktop', 120);
    const mobile = document('mobile', 16);
    const bundle = createResponsiveCanvasV2Bundle({ desktop, mobile }, 'desktop');
    const requestUpdate = vi.fn();
    const host: ResponsiveV2SavedHost = {
      nativeV2Revision: 'old',
      nativeV2DraftDirty: true,
      nativeV2CanUndo: true,
      nativeV2CanRedo: true,
      nativeV2DirtyBreakpoints: ['desktop'],
      message: 'Unsaved',
      requestUpdate,
    };

    applyResponsiveV2SavedStateToHost(host, {
      envelope: { bundle, revision: 'r2', parentRevision: 'r1', updatedAt: 200, clientId: 'client' },
      state: { revision: 'r2', activeBreakpoint: 'mobile', dirtyBreakpoints: [], canUndo: false, canRedo: false },
    });

    expect(host.nativeV2Revision).toBe('r2');
    expect(host.nativeV2Document?.breakpoint).toBe('mobile');
    expect(host.nativeV2Document?.items[0].frame.x).toBe(16);
    expect(host.nativeV2DraftDirty).toBe(false);
    expect(host.nativeV2CanUndo).toBe(false);
    expect(host.nativeV2CanRedo).toBe(false);
    expect(host.nativeV2ActiveBreakpoint).toBe('mobile');
    expect(host.nativeV2AvailableBreakpoints).toEqual(['mobile', 'desktop']);
    expect(host.nativeV2DirtyBreakpoints).toEqual([]);
    expect(host.message).toBeUndefined();
    expect(requestUpdate).toHaveBeenCalledOnce();
  });
});

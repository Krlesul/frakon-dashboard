import { describe, expect, it, vi } from 'vitest';
import { applyResponsiveV2SavedStateToParent } from './responsive-v2-parent-state-bridge';
import type { ResponsiveV2DraftSnapshot } from './responsive-v2-draft-controller';

function snapshot(): ResponsiveV2DraftSnapshot {
  return {
    activeBreakpoint: 'desktop',
    active: {
      document: {
        version: 2,
        id: 'home',
        title: 'Home',
        breakpoint: 'desktop',
        layout: { mode: 'canvas', width: 1440, minHeight: 700, snap: { enabled: true, size: 8 } },
        items: [],
      },
      dirty: false,
      canUndo: false,
      canRedo: false,
    },
    documents: {},
    dirtyBreakpoints: [],
  };
}

describe('responsive v2 parent state bridge', () => {
  it('projects the saved revision and clean snapshot into the canvas host', () => {
    const applyNativeV2Snapshot = vi.fn();
    const requestUpdate = vi.fn();
    const host = { applyNativeV2Snapshot, requestUpdate } as unknown as HTMLElement & {
      nativeV2Revision?: string;
      applyNativeV2Snapshot: typeof applyNativeV2Snapshot;
      requestUpdate: typeof requestUpdate;
    };
    const state = snapshot();

    expect(applyResponsiveV2SavedStateToParent(host, 'r2', state)).toBe(true);
    expect(host.nativeV2Revision).toBe('r2');
    expect(applyNativeV2Snapshot).toHaveBeenCalledWith(state);
    expect(requestUpdate).toHaveBeenCalledOnce();
  });

  it('fails closed when the host does not expose the snapshot bridge', () => {
    const host = {} as HTMLElement;
    expect(applyResponsiveV2SavedStateToParent(host, 'r2', snapshot())).toBe(false);
  });
});

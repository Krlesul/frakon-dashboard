import { describe, expect, it } from 'vitest';
import type { FrakonBreakpoint } from './layout-model';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { createResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import { mergeResponsiveCanvasV2Bundles } from './responsive-v2-merge';

function doc(breakpoint: FrakonBreakpoint, width: number, x = 20): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'house',
    title: 'House',
    breakpoint,
    layout: { mode: 'canvas', width, minHeight: 500, snap: { enabled: true, size: 8 } },
    items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x, y: 20, width: 160, height: 100 } }],
  };
}

function bundle() {
  return createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280), mobile: doc('mobile', 390) }, 'desktop');
}

describe('responsive canvas v2 three-way merge', () => {
  it('merges independent breakpoint edits without conflict', () => {
    const base = bundle();
    const local = structuredClone(base);
    local.documents.desktop!.items[0].frame.x = 90;
    const remote = structuredClone(base);
    remote.documents.mobile!.items[0].frame.x = 44;
    const result = mergeResponsiveCanvasV2Bundles(base, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.bundle.documents.desktop?.items[0].frame.x).toBe(90);
    expect(result.bundle.documents.mobile?.items[0].frame.x).toBe(44);
  });

  it('reports a conflict when both clients edit the same breakpoint differently', () => {
    const base = bundle();
    const local = structuredClone(base);
    local.documents.mobile!.items[0].frame.x = 60;
    const remote = structuredClone(base);
    remote.documents.mobile!.items[0].frame.x = 80;
    const result = mergeResponsiveCanvasV2Bundles(base, local, remote);
    expect(result.conflicts).toEqual([{ breakpoint: 'mobile', reason: 'concurrent-change' }]);
    expect(result.bundle.documents.mobile?.items[0].frame.x).toBe(80);
  });

  it('reports add/remove races instead of silently choosing one side', () => {
    const base = bundle();
    const local = structuredClone(base);
    delete local.documents.mobile;
    const remote = structuredClone(base);
    remote.documents.mobile!.items[0].frame.x = 88;
    const result = mergeResponsiveCanvasV2Bundles(base, local, remote);
    expect(result.conflicts).toEqual([{ breakpoint: 'mobile', reason: 'concurrent-add-remove' }]);
  });

  it('rejects bundles from different dashboards', () => {
    const base = bundle();
    const other = structuredClone(base);
    other.id = 'other';
    expect(() => mergeResponsiveCanvasV2Bundles(base, base, other)).toThrow(/different ids/i);
  });
});

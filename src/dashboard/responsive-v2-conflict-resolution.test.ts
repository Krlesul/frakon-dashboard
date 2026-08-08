import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { createResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import { resolveResponsiveCanvasV2Conflicts } from './responsive-v2-conflict-resolution';
import { mergeResponsiveCanvasV2Bundles } from './responsive-v2-merge';

function doc(breakpoint: FrakonDashboardDocumentV2['breakpoint'], width: number, x = 20): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'house',
    title: 'House',
    breakpoint,
    layout: { mode: 'canvas', width, minHeight: 500, snap: { enabled: true, size: 8 } },
    items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x, y: 20, width: 160, height: 100 } }],
  };
}

function baseBundle() {
  return createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280), mobile: doc('mobile', 390) }, 'desktop');
}

describe('responsive canvas v2 selective conflict resolution', () => {
  it('resolves only the selected breakpoint conflict', () => {
    const base = baseBundle();
    const local = structuredClone(base);
    local.documents.mobile!.items[0].frame.x = 60;
    const remote = structuredClone(base);
    remote.documents.mobile!.items[0].frame.x = 80;
    const merge = mergeResponsiveCanvasV2Bundles(base, local, remote);
    const result = resolveResponsiveCanvasV2Conflicts({ merged: merge.bundle, local, remote, conflicts: merge.conflicts, selections: { mobile: 'local' } });
    expect(result.status).toBe('resolved');
    expect(result.unresolved).toEqual([]);
    expect(result.bundle.documents.mobile?.items[0].frame.x).toBe(60);
    expect(result.bundle.documents.desktop?.items[0].frame.x).toBe(20);
  });

  it('keeps unresolved breakpoint conflicts explicit', () => {
    const base = baseBundle();
    const local = structuredClone(base);
    local.documents.mobile!.items[0].frame.x = 60;
    const remote = structuredClone(base);
    remote.documents.mobile!.items[0].frame.x = 80;
    const merge = mergeResponsiveCanvasV2Bundles(base, local, remote);
    const result = resolveResponsiveCanvasV2Conflicts({ merged: merge.bundle, local, remote, conflicts: merge.conflicts, selections: {} });
    expect(result.status).toBe('incomplete');
    expect(result.unresolved).toEqual(['mobile']);
    expect(result.bundle.documents.mobile?.items[0].frame.x).toBe(80);
  });

  it('can resolve a delete-versus-edit race by choosing the deleted side', () => {
    const base = baseBundle();
    const local = structuredClone(base);
    delete local.documents.mobile;
    const remote = structuredClone(base);
    remote.documents.mobile!.items[0].frame.x = 88;
    const merge = mergeResponsiveCanvasV2Bundles(base, local, remote);
    const result = resolveResponsiveCanvasV2Conflicts({ merged: merge.bundle, local, remote, conflicts: merge.conflicts, selections: { mobile: 'local' } });
    expect(result.status).toBe('resolved');
    expect(result.bundle.documents.mobile).toBeUndefined();
  });
});

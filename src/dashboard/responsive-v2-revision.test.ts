import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { createResponsiveCanvasV2Bundle } from './responsive-v2-bundle';
import {
  compareResponsiveCanvasV2Revisions,
  createResponsiveCanvasV2Revision,
  createResponsiveCanvasV2RevisionFromParent,
} from './responsive-v2-revision';

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

describe('responsive canvas v2 revisions', () => {
  it('changes revision when only one breakpoint geometry changes', () => {
    const first = createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280), mobile: doc('mobile', 390) }, 'desktop');
    const second = createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280), mobile: doc('mobile', 390, 44) }, 'desktop');
    const a = createResponsiveCanvasV2Revision(first, 'client-a', undefined, 1000);
    const b = createResponsiveCanvasV2Revision(second, 'client-a', undefined, 1000);
    expect(a.revision).not.toBe(b.revision);
  });

  it('uses a deterministic dual-fingerprint revision id and separates clients in the same millisecond', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280) }, 'desktop');
    const a1 = createResponsiveCanvasV2Revision(bundle, 'client-a', undefined, 1000);
    const a2 = createResponsiveCanvasV2Revision(bundle, 'client-a', undefined, 1000);
    const b = createResponsiveCanvasV2Revision(bundle, 'client-b', undefined, 1000);
    expect(a1.revision).toBe(a2.revision);
    expect(a1.revision.split('-')).toHaveLength(3);
    expect(a1.revision).not.toBe(b.revision);
  });

  it('tracks parent lineage across atomic bundle saves', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280) }, 'desktop');
    const first = createResponsiveCanvasV2Revision(bundle, 'client-a', undefined, 1000);
    const nextBundle = structuredClone(bundle);
    nextBundle.documents.desktop!.items[0].frame.x = 60;
    const second = createResponsiveCanvasV2Revision(nextBundle, 'client-a', first, 1001);
    expect(second.parentRevision).toBe(first.revision);
    expect(compareResponsiveCanvasV2Revisions(second, first)).toBe('local-ahead');
    expect(compareResponsiveCanvasV2Revisions(first, second)).toBe('remote-ahead');
  });

  it('can create a child revision directly from an opaque parent revision id', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280) }, 'desktop');
    const child = createResponsiveCanvasV2RevisionFromParent(bundle, 'client-a', 'server-r42', 1001);
    expect(child.parentRevision).toBe('server-r42');
    expect(child.clientId).toBe('client-a');
    expect(child.updatedAt).toBe(1001);
  });

  it('classifies unrelated responsive revisions as conflicts', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280) }, 'desktop');
    const a = createResponsiveCanvasV2Revision(bundle, 'client-a', undefined, 1000);
    const b = createResponsiveCanvasV2Revision(bundle, 'client-b', undefined, 1001);
    expect(compareResponsiveCanvasV2Revisions(a, b)).toBe('conflict');
  });
});

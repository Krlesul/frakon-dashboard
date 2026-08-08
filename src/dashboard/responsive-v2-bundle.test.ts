import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { createResponsiveCanvasV2Bundle, isResponsiveCanvasV2Bundle, responsiveCanvasV2BundleDocument } from './responsive-v2-bundle';

function doc(breakpoint: FrakonDashboardDocumentV2['breakpoint'], width: number): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'house',
    title: 'House',
    breakpoint,
    layout: { mode: 'canvas', width, minHeight: 600, snap: { enabled: true, size: 8 } },
    items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 30, width: 160, height: 100 } }],
  };
}

describe('responsive canvas v2 bundle', () => {
  it('normalizes multiple breakpoint documents into one atomic bundle', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280), mobile: doc('mobile', 390) }, 'desktop');
    expect(bundle.kind).toBe('responsive-canvas-v2');
    expect(bundle.id).toBe('house');
    expect(bundle.documents.mobile?.layout.width).toBe(390);
    expect(bundle.documents.desktop?.breakpoint).toBe('desktop');
    expect(isResponsiveCanvasV2Bundle(bundle)).toBe(true);
  });

  it('returns defensive document clones', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280) }, 'desktop');
    const copy = responsiveCanvasV2BundleDocument(bundle, 'desktop')!;
    copy.items[0].frame.x = 999;
    expect(bundle.documents.desktop?.items[0].frame.x).toBe(20);
  });

  it('rejects bundles whose embedded breakpoint or id does not match', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280) }, 'desktop');
    const invalidBreakpoint = structuredClone(bundle);
    invalidBreakpoint.documents.desktop!.breakpoint = 'mobile';
    expect(isResponsiveCanvasV2Bundle(invalidBreakpoint)).toBe(false);
    const invalidId = structuredClone(bundle);
    invalidId.documents.desktop!.id = 'other';
    expect(isResponsiveCanvasV2Bundle(invalidId)).toBe(false);
  });

  it('requires at least one responsive document', () => {
    expect(() => createResponsiveCanvasV2Bundle({}, 'desktop')).toThrow(/at least one document/i);
  });
});

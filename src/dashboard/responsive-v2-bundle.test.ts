import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import {
  createResponsiveCanvasV2Bundle,
  isResponsiveCanvasV2Bundle,
  RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES,
  responsiveCanvasV2BundleDocument,
} from './responsive-v2-bundle';

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

function twoItemDoc(): FrakonDashboardDocumentV2 {
  const desktop = doc('desktop', 1280);
  desktop.items.push({ id: 'b', card: { type: 'custom:b' }, frame: { x: 240, y: 30, width: 160, height: 100 } });
  return desktop;
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

  it('rejects a missing default breakpoint document', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280) }, 'desktop');
    const invalid = structuredClone(bundle);
    invalid.defaultBreakpoint = 'mobile';
    expect(isResponsiveCanvasV2Bundle(invalid)).toBe(false);
  });

  it('rejects duplicate item ids and invalid frame numbers', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: doc('desktop', 1280) }, 'desktop');
    const duplicate = structuredClone(bundle);
    duplicate.documents.desktop!.items.push(structuredClone(duplicate.documents.desktop!.items[0]));
    expect(isResponsiveCanvasV2Bundle(duplicate)).toBe(false);

    const invalidFrame = structuredClone(bundle);
    invalidFrame.documents.desktop!.items[0].frame.x = -1;
    expect(isResponsiveCanvasV2Bundle(invalidFrame)).toBe(false);
  });

  it('rejects invalid constraint references, duplicate ids and self references', () => {
    const missing = createResponsiveCanvasV2Bundle({ desktop: twoItemDoc() }, 'desktop');
    missing.documents.desktop!.constraints = [{ id: 'c1', kind: 'below', sourceId: 'a', targetId: 'missing' }];
    expect(isResponsiveCanvasV2Bundle(missing)).toBe(false);

    const duplicate = createResponsiveCanvasV2Bundle({ desktop: twoItemDoc() }, 'desktop');
    duplicate.documents.desktop!.constraints = [
      { id: 'c1', kind: 'below', sourceId: 'a', targetId: 'b' },
      { id: 'c1', kind: 'right-of', sourceId: 'b', targetId: 'a' },
    ];
    expect(isResponsiveCanvasV2Bundle(duplicate)).toBe(false);

    const self = createResponsiveCanvasV2Bundle({ desktop: twoItemDoc() }, 'desktop');
    self.documents.desktop!.constraints = [{ id: 'c1', kind: 'below', sourceId: 'a', targetId: 'a' }];
    expect(isResponsiveCanvasV2Bundle(self)).toBe(false);
  });

  it('rejects enabled constraint cycles but permits a disabled edge that would otherwise close the cycle', () => {
    const cyclic = createResponsiveCanvasV2Bundle({ desktop: twoItemDoc() }, 'desktop');
    cyclic.documents.desktop!.constraints = [
      { id: 'a-b', kind: 'below', sourceId: 'a', targetId: 'b' },
      { id: 'b-a', kind: 'below', sourceId: 'b', targetId: 'a' },
    ];
    expect(isResponsiveCanvasV2Bundle(cyclic)).toBe(false);

    cyclic.documents.desktop!.constraints[1].enabled = false;
    expect(isResponsiveCanvasV2Bundle(cyclic)).toBe(true);
  });

  it('rejects non-finite constraint numbers', () => {
    const bundle = createResponsiveCanvasV2Bundle({ desktop: twoItemDoc() }, 'desktop');
    bundle.documents.desktop!.constraints = [{ id: 'c1', kind: 'below', sourceId: 'a', targetId: 'b', gap: Number.NaN }];
    expect(isResponsiveCanvasV2Bundle(bundle)).toBe(false);
  });

  it('rejects more than 2000 items across all breakpoint documents', () => {
    const mobile = doc('mobile', 390);
    const desktop = doc('desktop', 1280);
    mobile.items = Array.from({ length: 1001 }, (_, index) => ({
      id: `m-${index}`,
      card: { type: 'custom:a' },
      frame: { x: 0, y: index * 2, width: 1, height: 1 },
    }));
    desktop.items = Array.from({ length: 1000 }, (_, index) => ({
      id: `d-${index}`,
      card: { type: 'custom:a' },
      frame: { x: 0, y: index * 2, width: 1, height: 1 },
    }));
    const bundle = createResponsiveCanvasV2Bundle({ mobile, desktop }, 'desktop');
    expect(isResponsiveCanvasV2Bundle(bundle)).toBe(false);
  });

  it('rejects a JSON-serializable bundle larger than the storage quota', () => {
    const desktop = doc('desktop', 1280);
    desktop.items[0].card = {
      type: 'custom:a',
      payload: 'x'.repeat(RESPONSIVE_CANVAS_V2_MAX_SERIALIZED_BYTES),
    };
    const bundle = createResponsiveCanvasV2Bundle({ desktop }, 'desktop');
    expect(isResponsiveCanvasV2Bundle(bundle)).toBe(false);
  });
});

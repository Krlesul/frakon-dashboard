import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';
import { copyResponsiveCanvasV2Layout } from './responsive-layout-v2-actions';

const desktop: FrakonDashboardDocumentV2 = {
  version: 2,
  id: 'responsive-copy',
  title: 'Responsive copy',
  breakpoint: 'desktop',
  layout: { mode: 'canvas', width: 1280, minHeight: 700, snap: { enabled: true, size: 8 } },
  items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x: 160, y: 80, width: 320, height: 180 } }],
};

describe('responsive layout v2 actions', () => {
  it('copies and scales a source layout into the target breakpoint', () => {
    const result = copyResponsiveCanvasV2Layout({ desktop }, 'desktop', 'mobile');
    expect(result.status).toBe('committed');
    expect(result.documents.mobile?.breakpoint).toBe('mobile');
    expect(result.documents.mobile?.layout.width).toBe(390);
    expect(result.documents.mobile?.items[0].frame.x).toBeCloseTo(48.75);
  });

  it('does not mutate the source document', () => {
    const sourceX = desktop.items[0].frame.x;
    copyResponsiveCanvasV2Layout({ desktop }, 'desktop', 'tablet');
    expect(desktop.items[0].frame.x).toBe(sourceX);
  });

  it('fails closed when the requested source breakpoint is missing', () => {
    const result = copyResponsiveCanvasV2Layout({ desktop }, 'tablet', 'mobile');
    expect(result.status).toBe('missing-source');
    expect(result.documents.mobile).toBeUndefined();
  });
});

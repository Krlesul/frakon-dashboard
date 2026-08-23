import { describe, expect, it } from 'vitest';
import { cssRecordToString, mergeSurfaceStyles, normalizeSurfaceStyle, surfaceStyleToCss } from './surface-style';

describe('surface styles', () => {
  it('clamps unsafe numeric values', () => {
    expect(normalizeSurfaceStyle({ backgroundOpacity: 2, borderRadius: -5, padding: 300 })).toMatchObject({
      backgroundOpacity: 1,
      borderRadius: 0,
      padding: 128,
    });
  });

  it('supports a completely frameless transparent surface', () => {
    const css = surfaceStyleToCss({ fill: 'transparent', border: 'none', shadow: 'none' });
    expect(css.background).toBe('transparent');
    expect(css.border).toBe('none');
    expect(css['box-shadow']).toBe('none');
  });

  it('supports glass surfaces', () => {
    const css = surfaceStyleToCss({ fill: 'glass', backgroundColor: '#ffffff', backgroundOpacity: 0.4, backdropBlur: 24 });
    expect(css.background).toContain('40%');
    expect(css['backdrop-filter']).toBe('blur(24px)');
  });

  it('merges inherited dashboard and card overrides', () => {
    const merged = mergeSurfaceStyles({ fill: 'solid', borderRadius: 18, padding: 12 }, { border: 'none', padding: 4 });
    expect(merged).toMatchObject({ fill: 'solid', border: 'none', borderRadius: 18, padding: 4 });
  });

  it('serializes css records deterministically', () => {
    expect(cssRecordToString({ background: 'transparent', border: 'none' })).toBe('background:transparent;border:none');
  });
});

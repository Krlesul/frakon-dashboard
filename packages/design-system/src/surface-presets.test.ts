import { describe, expect, it } from 'vitest';
import { SURFACE_PRESETS, surfacePreset } from './surface-presets';

describe('surface style presets', () => {
  it('provides every supported preset exactly once', () => {
    expect(SURFACE_PRESETS.map((preset) => preset.id)).toEqual([
      'borderless', 'transparent', 'solid', 'glass', 'gradient', 'image',
    ]);
  });

  it('returns an independent style copy', () => {
    const first = surfacePreset('glass');
    first.borderRadius = 99;
    expect(surfacePreset('glass').borderRadius).toBe(24);
  });

  it('keeps transparent surfaces free from borders and shadows', () => {
    expect(surfacePreset('transparent')).toMatchObject({
      fill: 'transparent',
      border: 'none',
      shadow: 'none',
    });
  });
});

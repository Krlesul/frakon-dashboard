import { describe, expect, it } from 'vitest';
import type { FrakonDashboardDocument } from './layout-model';
import {
  applyDashboardSurfaceStyle,
  applyDefaultCardSurfaceStyle,
  applyItemSurfaceStyle,
  applySurfaceStyleToTarget,
  clearItemSurfaceStyle,
} from './surface-style-actions';

function document(): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 48,
    gap: 12,
    items: [
      { id: 'light', card: { type: 'custom:frakon-light-card' }, x: 0, y: 0, w: 3, h: 2 },
      { id: 'camera', card: { type: 'custom:frakon-camera-card' }, x: 3, y: 0, w: 6, h: 4, locked: true },
    ],
  };
}

describe('surface style actions', () => {
  it('updates dashboard and default card surfaces independently', () => {
    const dashboard = applyDashboardSurfaceStyle(document(), { fill: 'gradient', gradient: 'linear-gradient(red, blue)' });
    const cards = applyDefaultCardSurfaceStyle(dashboard, { fill: 'glass', backdropBlur: 20 });
    expect(cards.surface?.fill).toBe('gradient');
    expect(cards.cardSurface?.fill).toBe('glass');
    expect(cards.cardSurface?.backdropBlur).toBe(20);
  });

  it('applies one normalized style to multiple unlocked items', () => {
    const result = applyItemSurfaceStyle(document(), ['light', 'camera'], { fill: 'transparent', border: 'none' });
    expect(result.items[0].surface?.fill).toBe('transparent');
    expect(result.items[0].surface?.border).toBe('none');
    expect(result.items[1].surface).toBeUndefined();
  });

  it('can explicitly include locked items', () => {
    const result = applyItemSurfaceStyle(document(), ['camera'], { fill: 'solid' }, { includeLocked: true });
    expect(result.items[1].surface?.fill).toBe('solid');
  });

  it('clears individual overrides so cards inherit defaults again', () => {
    const styled = applyItemSurfaceStyle(document(), ['light'], { fill: 'glass' });
    const cleared = clearItemSurfaceStyle(styled, ['light']);
    expect(cleared.items[0].surface).toBeUndefined();
  });

  it('routes a selection target through the common target API', () => {
    const result = applySurfaceStyleToTarget(document(), { kind: 'items', ids: ['light'] }, { borderRadius: 40 });
    expect(result.items[0].surface?.borderRadius).toBe(40);
  });
});

import { describe, expect, it } from 'vitest';
import { smartMovePreview } from './smart-move';

const items = [
  { id: 'moving', x: 0, y: 0, width: 100, height: 100 },
  { id: 'target', x: 204, y: 0, width: 100, height: 100 },
  { id: 'below', x: 0, y: 220, width: 100, height: 100 },
];

describe('smartMovePreview', () => {
  it('applies fine guideline correction after coarse movement', () => {
    const result = smartMovePreview(items, ['moving'], { x: 100, y: 0 }, {
      guidelineThreshold: 8,
    });
    expect(result.items.find((item) => item.id === 'moving')?.x).toBe(104);
    expect(result.guidelines.length).toBeGreaterThan(0);
  });

  it('reports collisions after guideline correction', () => {
    const result = smartMovePreview(items, ['moving'], { x: 110, y: 0 }, {
      guidelineThreshold: 0,
    });
    expect(result.hasCollisions).toBe(true);
    expect(result.collisionIds).toContain('moving');
    expect(result.collisionIds).toContain('target');
  });

  it('preserves grid snapping before fine correction', () => {
    const result = smartMovePreview(items, ['moving'], { x: 91, y: 109 }, {
      gridX: 50,
      gridY: 50,
      guidelineThreshold: 0,
    });
    const moving = result.items.find((item) => item.id === 'moving');
    expect(moving?.x).toBe(100);
    expect(moving?.y).toBe(100);
  });
});

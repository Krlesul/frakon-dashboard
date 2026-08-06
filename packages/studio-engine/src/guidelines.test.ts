import { describe, expect, it } from 'vitest';
import { computeSmartGuidelines, type GuidelineItem } from './guidelines';

const items: GuidelineItem[] = [
  { id: 'moving', x: 94, y: 48, width: 100, height: 80 },
  { id: 'target-a', x: 200, y: 50, width: 100, height: 80 },
  { id: 'target-b', x: 400, y: 50, width: 100, height: 80 },
];

describe('computeSmartGuidelines', () => {
  it('snaps a moving edge to the nearest stationary edge', () => {
    const result = computeSmartGuidelines(items, ['moving'], 8);
    expect(result.deltaX).toBe(6);
    expect(result.guidelines.some((guide) => guide.axis === 'x')).toBe(true);
  });

  it('snaps vertical centers', () => {
    const shifted = items.map((item) => item.id === 'moving' ? { ...item, y: 54 } : item);
    const result = computeSmartGuidelines(shifted, ['moving'], 8);
    expect(result.deltaY).toBe(-4);
    expect(result.guidelines.some((guide) => guide.axis === 'y' && guide.kind === 'center')).toBe(true);
  });

  it('returns no guides when everything is selected', () => {
    expect(computeSmartGuidelines(items, items.map((item) => item.id))).toEqual({
      deltaX: 0,
      deltaY: 0,
      guidelines: [],
    });
  });

  it('detects equal horizontal spacing', () => {
    const spacingItems: GuidelineItem[] = [
      { id: 'left', x: 0, y: 0, width: 100, height: 80 },
      { id: 'moving', x: 196, y: 0, width: 100, height: 80 },
      { id: 'right', x: 300, y: 0, width: 100, height: 80 },
    ];
    const result = computeSmartGuidelines(spacingItems, ['moving'], 8);
    expect(result.deltaX).toBe(4);
    expect(result.guidelines.some((guide) => guide.kind === 'spacing')).toBe(true);
  });
});

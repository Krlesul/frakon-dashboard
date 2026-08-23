import { describe, expect, it } from 'vitest';
import { boundsForItems, resizeGroup, resizeRect } from './resize';

describe('Studio resize transforms', () => {
  it('resizes from the east while preserving the west edge', () => {
    expect(resizeRect({ x:10, y:20, width:100, height:60 }, 'e', { x:25, y:0 }))
      .toEqual({ x:10, y:20, width:125, height:60 });
  });

  it('resizes from the north-west while preserving opposite edges', () => {
    expect(resizeRect({ x:10, y:20, width:100, height:60 }, 'nw', { x:15, y:10 }))
      .toEqual({ x:25, y:30, width:85, height:50 });
  });

  it('enforces minimum dimensions from the dragged edge', () => {
    expect(resizeRect(
      { x:10, y:20, width:100, height:60 },
      'w',
      { x:200, y:0 },
      { minWidth:40 },
    )).toEqual({ x:70, y:20, width:40, height:60 });
  });

  it('preserves aspect ratio for corner resize', () => {
    const resized = resizeRect(
      { x:0, y:0, width:160, height:90 },
      'se',
      { x:80, y:5 },
      { lockAspectRatio:true },
    );
    expect(resized.width / resized.height).toBeCloseTo(16 / 9);
  });

  it('calculates a shared bounding box', () => {
    expect(boundsForItems([
      { x:20, y:40, width:60, height:30 },
      { x:100, y:10, width:50, height:90 },
    ])).toEqual({ x:20, y:10, width:130, height:90 });
  });

  it('scales a group proportionally inside the resized bounds', () => {
    const result = resizeGroup([
      { id:'a', x:0, y:0, width:50, height:50 },
      { id:'b', x:50, y:0, width:50, height:50 },
    ], 'e', { x:100, y:0 });
    expect(result).toEqual([
      { id:'a', x:0, y:0, width:100, height:50 },
      { id:'b', x:100, y:0, width:100, height:50 },
    ]);
  });

  it('preserves locked items during group resize', () => {
    const result = resizeGroup([
      { id:'locked', x:0, y:0, width:40, height:40, locked:true },
      { id:'movable', x:100, y:0, width:40, height:40 },
    ], 'se', { x:40, y:40 });
    expect(result[0]).toEqual({ id:'locked', x:0, y:0, width:40, height:40, locked:true });
    expect(result[1]).toEqual({ id:'movable', x:100, y:0, width:80, height:80 });
  });
});

import { describe, expect, it } from 'vitest';
import { keyboardNudgeDeltaV2, nudgeDashboardV2Selection } from './dashboard-keyboard-nudge-v2';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 400, minHeight: 240, snap: { enabled: true, size: 10 } },
    items: [
      { id: 'a', card: { type: 'custom:a' }, frame: { x: 20, y: 20, width: 80, height: 80 } },
      { id: 'b', card: { type: 'custom:b' }, frame: { x: 120, y: 20, width: 80, height: 80 } },
      { id: 'locked', card: { type: 'custom:locked' }, frame: { x: 20, y: 140, width: 80, height: 60 }, locked: true },
    ],
  };
}

describe('v2 keyboard nudge', () => {
  it('maps arrow keys to snap-sized and shift-sized deltas', () => {
    expect(keyboardNudgeDeltaV2('ArrowRight', 10)).toEqual({ x: 10, y: 0 });
    expect(keyboardNudgeDeltaV2('ArrowUp', 10, true)).toEqual({ x: 0, y: -50 });
    expect(keyboardNudgeDeltaV2('Enter', 10)).toBeUndefined();
  });

  it('moves selected items through the same canvas session rules', () => {
    const result = nudgeDashboardV2Selection(doc(), ['a'], { x: 20, y: 0 });
    expect(result.status).toBe('moved');
    expect(result.document.items.find((item) => item.id === 'a')?.frame.x).toBe(40);
  });

  it('blocks a nudge that would collide and leaves the source geometry unchanged', () => {
    const result = nudgeDashboardV2Selection(doc(), ['a'], { x: 100, y: 0 });
    expect(result.status).toBe('collision');
    expect(result.collisionIds.sort()).toEqual(['a', 'b']);
    expect(result.document.items.find((item) => item.id === 'a')?.frame.x).toBe(20);
  });

  it('does not move locked selected items', () => {
    const result = nudgeDashboardV2Selection(doc(), ['locked'], { x: 20, y: 0 });
    expect(result.status).toBe('unchanged');
    expect(result.document.items.find((item) => item.id === 'locked')?.frame.x).toBe(20);
  });
});

import { describe, expect, it } from 'vitest';
import { keyboardNudgeDelta, nudgeDashboardSelection } from './dashboard-keyboard-nudge';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 6,
  rowHeight: 50,
  gap: 10,
  items: [
    { id: 'a', x: 0, y: 0, w: 2, h: 1, card: { type: 'custom:a' } },
    { id: 'b', x: 3, y: 0, w: 1, h: 1, card: { type: 'custom:b' } },
    { id: 'locked', x: 0, y: 2, w: 1, h: 1, locked: true, card: { type: 'custom:c' } },
  ],
};

describe('dashboard keyboard nudge', () => {
  it('maps arrow keys to one-cell movement and Shift-sized movement', () => {
    expect(keyboardNudgeDelta('ArrowLeft')).toEqual({ x: -1, y: 0 });
    expect(keyboardNudgeDelta('ArrowDown')).toEqual({ x: 0, y: 1 });
    expect(keyboardNudgeDelta('ArrowRight', true)).toEqual({ x: 5, y: 0 });
    expect(keyboardNudgeDelta('x')).toBeUndefined();
  });

  it('moves a selected item by grid units', () => {
    const result = nudgeDashboardSelection(document, ['a'], { x: 1, y: 1 });
    expect(result.status).toBe('moved');
    expect(result.document.items[0]).toMatchObject({ x: 1, y: 1 });
  });

  it('keeps locked selected items stationary', () => {
    const result = nudgeDashboardSelection(document, ['locked'], { x: 1, y: 0 });
    expect(result.status).toBe('unchanged');
    expect(result.document.items[2]).toMatchObject({ x: 0, y: 2 });
  });

  it('clamps movement at the dashboard bounds', () => {
    const result = nudgeDashboardSelection(document, ['a'], { x: -5, y: -5 });
    expect(result.status).toBe('unchanged');
    expect(result.document.items[0]).toMatchObject({ x: 0, y: 0 });
  });

  it('rejects a nudge that would collide with another card', () => {
    const result = nudgeDashboardSelection(document, ['a'], { x: 2, y: 0 });
    expect(result.status).toBe('collision');
    expect(result.collisionIds).toEqual(['a', 'b']);
    expect(result.document.items[0]).toMatchObject({ x: 0, y: 0 });
  });

  it('moves a multi-selection atomically while ignoring locked members', () => {
    const result = nudgeDashboardSelection(document, ['a', 'locked'], { x: 0, y: 1 });
    expect(result.status).toBe('moved');
    expect(result.document.items[0]).toMatchObject({ y: 1 });
    expect(result.document.items[2]).toMatchObject({ y: 2 });
  });
});

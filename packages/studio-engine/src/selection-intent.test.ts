import { describe, expect, it } from 'vitest';
import { applySelectionPointerIntent } from './selection-intent';

describe('Selection pointer intent', () => {
  it('replaces selection on a normal click', () => {
    expect(applySelectionPointerIntent({ ids:['a','b'], anchorId:'b' }, { targetId:'c' }))
      .toEqual({ ids:['c'], anchorId:'c' });
  });

  it('toggles with Ctrl or Command', () => {
    expect(applySelectionPointerIntent({ ids:['a'], anchorId:'a' }, { targetId:'b', ctrlKey:true }).ids)
      .toEqual(['a','b']);
    expect(applySelectionPointerIntent({ ids:['a','b'], anchorId:'b' }, { targetId:'b', metaKey:true }).ids)
      .toEqual(['a']);
  });

  it('adds with Shift and clears on background click', () => {
    expect(applySelectionPointerIntent({ ids:['a'], anchorId:'a' }, { targetId:'b', shiftKey:true }).ids)
      .toEqual(['a','b']);
    expect(applySelectionPointerIntent({ ids:['a'], anchorId:'a' }, {})).toEqual({ ids:[] });
  });

  it('can preserve selection when background interaction starts a pan', () => {
    const state = { ids:['a'], anchorId:'a' };
    expect(applySelectionPointerIntent(state, { preserveOnBackground:true })).toBe(state);
  });
});

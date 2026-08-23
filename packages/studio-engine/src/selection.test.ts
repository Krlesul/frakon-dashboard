import { describe, expect, it } from 'vitest';
import {
  addToSelection,
  clearSelection,
  isSelected,
  removeFromSelection,
  replaceSelection,
  selectByMarquee,
  selectOnly,
  toggleSelection,
} from './selection';

describe('Studio selection engine', () => {
  it('supports single selection and clearing', () => {
    expect(selectOnly('camera')).toEqual({ ids:['camera'], anchorId:'camera' });
    expect(clearSelection()).toEqual({ ids:[] });
  });

  it('adds, removes and toggles ids without duplicates', () => {
    const first = addToSelection(selectOnly('a'), 'b');
    expect(addToSelection(first, 'b').ids).toEqual(['a','b']);
    expect(removeFromSelection(first, 'a')).toEqual({ ids:['b'], anchorId:'b' });
    expect(toggleSelection(first, 'b').ids).toEqual(['a']);
    expect(toggleSelection(first, 'c').ids).toEqual(['a','b','c']);
  });

  it('normalizes explicit replacement and tracks membership', () => {
    const state = replaceSelection(['a','a','b'], 'a');
    expect(state).toEqual({ ids:['a','b'], anchorId:'a' });
    expect(isSelected(state, 'b')).toBe(true);
    expect(isSelected(state, 'c')).toBe(false);
  });

  it('selects intersecting items with a marquee dragged in any direction', () => {
    const items = [
      { id:'a', x:0, y:0, width:100, height:100 },
      { id:'b', x:120, y:0, width:100, height:100 },
      { id:'locked-ui', x:20, y:20, width:20, height:20, selectable:false },
    ];
    expect(selectByMarquee(items, { x:160, y:80, width:-180, height:-100 }).ids)
      .toEqual(['a','b']);
  });

  it('supports full containment and additive marquee selection', () => {
    const items = [
      { id:'a', x:10, y:10, width:20, height:20 },
      { id:'b', x:90, y:90, width:30, height:30 },
    ];
    const contained = selectByMarquee(items, { x:0, y:0, width:100, height:100 }, { mode:'contain' });
    expect(contained.ids).toEqual(['a']);
    const additive = selectByMarquee(items, { x:80, y:80, width:50, height:50 }, {
      additive:true,
      current:contained,
    });
    expect(additive.ids).toEqual(['a','b']);
  });
});

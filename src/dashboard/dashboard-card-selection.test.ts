import { describe, expect, it } from 'vitest';
import { dashboardPointerMoveSelection, selectDashboardCard } from './dashboard-card-selection';
import type { FrakonGridItem } from './layout-model';

const items: FrakonGridItem[] = [
  { id:'a', x:0, y:0, w:2, h:2, card:{ type:'custom:frakon-card' } },
  { id:'b', x:2, y:0, w:2, h:2, card:{ type:'custom:frakon-card' } },
  { id:'locked', x:4, y:0, w:2, h:2, locked:true, card:{ type:'custom:frakon-card' } },
];

describe('dashboard card selection', () => {
  it('supports replace, additive and toggle selection intents', () => {
    const first = selectDashboardCard(undefined, 'a');
    const second = selectDashboardCard(first, 'b', { shiftKey:true });
    expect(second.ids).toEqual(['a','b']);
    expect(selectDashboardCard(second, 'a', { ctrlKey:true }).ids).toEqual(['b']);
  });

  it('moves the whole selected unlocked group when grabbing a selected item', () => {
    const selection = { ids:['a','b','locked'], anchorId:'b' };
    expect(dashboardPointerMoveSelection(selection, items[0], items)).toEqual(['a','b']);
  });

  it('moves only the grabbed item when it is outside the current selection', () => {
    const selection = { ids:['a'], anchorId:'a' };
    expect(dashboardPointerMoveSelection(selection, items[1], items)).toEqual(['b']);
  });

  it('never starts a pointer move from a locked card', () => {
    expect(dashboardPointerMoveSelection({ ids:['locked'], anchorId:'locked' }, items[2], items)).toEqual([]);
  });
});

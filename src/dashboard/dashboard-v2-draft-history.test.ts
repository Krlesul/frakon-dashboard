import { describe, expect, it } from 'vitest';
import { DashboardV2DraftHistory } from './dashboard-v2-draft-history';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

function doc(x = 0): FrakonDashboardDocumentV2 {
  return {
    version: 2,
    id: 'home',
    title: 'Home',
    breakpoint: 'desktop',
    layout: { mode: 'canvas', width: 500, minHeight: 300, snap: { enabled: true, size: 10 } },
    items: [{ id: 'a', card: { type: 'custom:a' }, frame: { x, y: 0, width: 100, height: 100 } }],
  };
}

describe('DashboardV2DraftHistory', () => {
  it('supports atomic undo and redo', () => {
    const history = new DashboardV2DraftHistory(doc());
    history.push(doc(20));
    history.push(doc(40));
    expect(history.undo().items[0]?.frame.x).toBe(20);
    expect(history.undo().items[0]?.frame.x).toBe(0);
    expect(history.redo().items[0]?.frame.x).toBe(20);
  });

  it('clears redo after a new branch and reset clears all history', () => {
    const history = new DashboardV2DraftHistory(doc());
    history.push(doc(20));
    history.undo();
    history.push(doc(30));
    expect(history.canRedo).toBe(false);
    history.reset(doc(50));
    expect(history.canUndo).toBe(false);
    expect(history.value.items[0]?.frame.x).toBe(50);
  });

  it('returns defensive clones', () => {
    const history = new DashboardV2DraftHistory(doc());
    const value = history.value;
    value.items[0]!.frame.x = 999;
    expect(history.value.items[0]?.frame.x).toBe(0);
  });
});

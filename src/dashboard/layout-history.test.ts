import { describe, expect, it } from 'vitest';
import { DashboardHistory } from './layout-history';
import type { FrakonDashboardDocument } from './layout-model';

const document = (title: string): FrakonDashboardDocument => ({
  version: 1,
  id: 'home',
  title,
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  items: [],
});

describe('DashboardHistory', () => {
  it('supports undo and redo', () => {
    const history = new DashboardHistory(document('A'));
    history.push(document('B'));
    history.push(document('C'));
    expect(history.undo().title).toBe('B');
    expect(history.undo().title).toBe('A');
    expect(history.redo().title).toBe('B');
  });

  it('clears redo after a new branch', () => {
    const history = new DashboardHistory(document('A'));
    history.push(document('B'));
    history.undo();
    history.push(document('C'));
    expect(history.canRedo).toBe(false);
    expect(history.value.title).toBe('C');
  });
});

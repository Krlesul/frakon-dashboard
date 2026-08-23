import { describe, expect, it } from 'vitest';
import { conflictLabel, presentDashboardConflict, summarizeConflictValue } from './dashboard-conflict-presentation';

describe('dashboard conflict presentation', () => {
  it('creates human readable labels for document and card paths', () => {
    expect(conflictLabel('title')).toBe('Dashboard title');
    expect(conflictLabel('items.light')).toBe('Card · light');
    expect(conflictLabel('constraints')).toBe('Layout rules');
  });

  it('summarizes primitive, array and grid item values', () => {
    expect(summarizeConflictValue('Home')).toBe('Home');
    expect(summarizeConflictValue([1, 2])).toBe('2 items');
    expect(summarizeConflictValue({ x: 1, y: 2, w: 3, h: 4 })).toBe('1, 2 · 3 × 4');
    expect(summarizeConflictValue(undefined)).toBe('Removed');
  });

  it('presents both local and remote values', () => {
    const presentation = presentDashboardConflict({
      path: 'items.camera',
      base: { x: 0, y: 0, w: 2, h: 2 },
      local: { x: 1, y: 0, w: 2, h: 2 },
      remote: { x: 0, y: 2, w: 3, h: 2 },
    });

    expect(presentation.label).toBe('Card · camera');
    expect(presentation.localSummary).toBe('1, 0 · 2 × 2');
    expect(presentation.remoteSummary).toBe('0, 2 · 3 × 2');
  });
});

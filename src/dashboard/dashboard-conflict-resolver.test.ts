import { describe, expect, it } from 'vitest';
import { mergeDashboardDocuments } from './dashboard-conflict-resolver';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

function item(id: string, x: number): FrakonGridItem {
  return { id, x, y: 0, w: 2, h: 2, card: { type: `custom:${id}` } };
}

function dashboard(items: FrakonGridItem[], title = 'Home'): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'home',
    title,
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 80,
    gap: 12,
    items,
  };
}

describe('mergeDashboardDocuments', () => {
  it('merges independent card changes cleanly', () => {
    const base = dashboard([item('light', 0), item('camera', 4)]);
    const local = dashboard([item('light', 1), item('camera', 4)]);
    const remote = dashboard([item('light', 0), item('camera', 6)]);

    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(true);
    expect(result.document.items.find((entry) => entry.id === 'light')?.x).toBe(1);
    expect(result.document.items.find((entry) => entry.id === 'camera')?.x).toBe(6);
  });

  it('detects concurrent changes to the same card', () => {
    const base = dashboard([item('light', 0)]);
    const local = dashboard([item('light', 1)]);
    const remote = dashboard([item('light', 2)]);

    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(false);
    expect(result.conflicts[0]?.path).toBe('items.light');
    expect(result.document.items[0]?.x).toBe(1);
  });

  it('keeps a one-sided card addition or removal', () => {
    const base = dashboard([item('light', 0)]);
    const local = dashboard([item('light', 0), item('camera', 4)]);
    const remote = dashboard([]);

    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(true);
    expect(result.document.items.map((entry) => entry.id)).toEqual(['camera']);
  });

  it('reports conflicting top-level changes', () => {
    const base = dashboard([], 'Home');
    const local = dashboard([], 'Local');
    const remote = dashboard([], 'Remote');

    const result = mergeDashboardDocuments(base, local, remote);
    expect(result.clean).toBe(false);
    expect(result.conflicts[0]?.path).toBe('title');
    expect(result.document.title).toBe('Local');
  });
});

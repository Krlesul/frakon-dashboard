import { describe, expect, it } from 'vitest';
import { mergeDashboardDocuments } from './dashboard-conflict-resolver';
import { resolveDashboardConflicts } from './dashboard-selective-conflict-resolution';
import type { FrakonDashboardDocument } from './layout-model';

function dashboard(title: string, lightX: number, cameraX: number): FrakonDashboardDocument {
  return {
    version: 1,
    id: 'home',
    title,
    breakpoint: 'desktop',
    columns: 12,
    rowHeight: 80,
    gap: 12,
    items: [
      { id: 'light', x: lightX, y: 0, w: 2, h: 2, card: { type: 'light' } },
      { id: 'camera', x: cameraX, y: 0, w: 2, h: 2, card: { type: 'camera' } },
    ],
  };
}

describe('resolveDashboardConflicts', () => {
  it('resolves each conflicting path independently', () => {
    const base = dashboard('Home', 0, 4);
    const local = dashboard('Local home', 1, 4);
    const remote = dashboard('Remote home', 3, 4);
    const merge = mergeDashboardDocuments(base, local, remote);

    const result = resolveDashboardConflicts(merge, {
      title: 'remote',
      'items.light': 'local',
    });

    expect(result.complete).toBe(true);
    expect(result.document.title).toBe('Remote home');
    expect(result.document.items.find((item) => item.id === 'light')?.x).toBe(1);
  });

  it('reports unresolved paths until every conflict has a selection', () => {
    const merge = mergeDashboardDocuments(
      dashboard('Home', 0, 4),
      dashboard('Local', 1, 4),
      dashboard('Remote', 3, 4),
    );

    const result = resolveDashboardConflicts(merge, { title: 'local' });

    expect(result.complete).toBe(false);
    expect(result.unresolved.map((conflict) => conflict.path)).toEqual(['items.light']);
  });

  it('can accept a remote deletion of a card', () => {
    const base = dashboard('Home', 0, 4);
    const local = dashboard('Home', 2, 4);
    const remote = { ...dashboard('Home', 0, 4), items: base.items.filter((item) => item.id !== 'light') };
    const merge = mergeDashboardDocuments(base, local, remote);

    const result = resolveDashboardConflicts(merge, { 'items.light': 'remote' });

    expect(result.complete).toBe(true);
    expect(result.document.items.some((item) => item.id === 'light')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { setDashboardAutoLayoutOverrides } from './auto-layout-overrides';
import type { FrakonDashboardDocument } from './layout-model';

const document: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  items: [{ id: 'camera', card: { type: 'custom:frakon-camera-card' }, x: 0, y: 0, w: 4, h: 3 }],
};

describe('auto-layout overrides', () => {
  it('sets bounded priority and semantic group without mutating the source', () => {
    const result = setDashboardAutoLayoutOverrides(document, 'camera', { priority: 140, semanticGroup: ' outdoor ' });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].card).toMatchObject({ priority: 100, layout_group: 'outdoor' });
    expect(document.items[0].card).not.toHaveProperty('priority');
  });

  it('removes manual overrides', () => {
    const configured: FrakonDashboardDocument = {
      ...document,
      items: [{ ...document.items[0], card: { ...document.items[0].card, priority: 92, layout_group: 'security' } }],
    };
    const result = setDashboardAutoLayoutOverrides(configured, 'camera', { priority: null, semanticGroup: null });
    expect(result.status).toBe('committed');
    expect(result.document.items[0].card).not.toHaveProperty('priority');
    expect(result.document.items[0].card).not.toHaveProperty('layout_group');
  });

  it('returns unchanged for an unknown card', () => {
    expect(setDashboardAutoLayoutOverrides(document, 'missing', { priority: 50 }).status).toBe('unchanged');
  });
});

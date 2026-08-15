import { describe, expect, it } from 'vitest';
import { detectBreakpoint, documentForBreakpoint } from './responsive-layout';
import type { FrakonDashboardDocument } from './layout-model';

const base: FrakonDashboardDocument = {
  version: 1,
  id: 'home',
  title: 'Home',
  breakpoint: 'desktop',
  columns: 12,
  rowHeight: 48,
  gap: 12,
  items: [{ id: 'a', card: { type: 'custom:frakon-card' }, x: 6, y: 0, w: 6, h: 3 }],
};

describe('responsive dashboard layout', () => {
  it('detects breakpoints', () => {
    expect(detectBreakpoint(390)).toBe('mobile');
    expect(detectBreakpoint(800)).toBe('tablet');
    expect(detectBreakpoint(1200)).toBe('desktop');
    expect(detectBreakpoint(1800)).toBe('wide');
  });

  it('scales horizontal placement and width', () => {
    const mobile = documentForBreakpoint(base, 'mobile');
    expect(mobile.columns).toBe(4);
    expect(mobile.items[0]).toMatchObject({ x: 2, w: 2 });
  });

  it('removes hidden layers and their runtime-only constraints without mutating the source', () => {
    const source: FrakonDashboardDocument = {
      ...base,
      items: [
        ...base.items,
        { id: 'hidden', card: { type: 'custom:hidden' }, x: 0, y: 4, w: 2, h: 2, hidden: true },
      ],
      constraints: [
        { id: 'a-left-hidden', kind: 'left-of', sourceId: 'a', targetId: 'hidden', gap: 1, priority: 50 },
      ],
    };
    const mobile = documentForBreakpoint(source, 'mobile');
    expect(mobile.items.map((item) => item.id)).toEqual(['a']);
    expect(mobile.constraints).toEqual([]);
    expect(source.items[1].hidden).toBe(true);
    expect(source.constraints).toHaveLength(1);
  });
});
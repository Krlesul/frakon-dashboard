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
});

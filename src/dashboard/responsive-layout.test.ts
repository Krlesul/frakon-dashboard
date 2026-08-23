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
  items: [
    { id: 'visible', card: { type: 'custom:frakon-card' }, x: 6, y: 0, w: 3, h: 3 },
    { id: 'peer', card: { type: 'custom:frakon-sensor-card' }, x: 9, y: 0, w: 3, h: 3 },
    { id: 'hidden', card: { type: 'custom:frakon-room-card' }, x: 3, y: 4, w: 3, h: 2, hidden: true },
  ],
  constraints: [
    { id: 'visible-hidden', kind: 'align-left', sourceId: 'visible', targetId: 'hidden', priority: 40 },
    { id: 'visible-peer', kind: 'right-of', sourceId: 'peer', targetId: 'visible', gap: 1, priority: 30 },
  ],
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
    expect(mobile.items.find((item) => item.id === 'visible')).toMatchObject({ x: 2, w: 1 });
    expect(mobile.items.find((item) => item.id === 'peer')).toMatchObject({ x: 3, w: 1 });
  });

  it('excludes hidden cards and their dangling constraints from runtime projection', () => {
    const mobile = documentForBreakpoint(base, 'mobile');
    expect(mobile.items.map((item) => item.id)).toEqual(['visible', 'peer']);
    expect(mobile.constraints?.map((constraint) => constraint.id)).toEqual(['visible-peer']);
  });

  it('preserves and scales hidden geometry for editor/optimizer projection', () => {
    const mobile = documentForBreakpoint(base, 'mobile', undefined, { includeHidden: true });
    expect(mobile.items.map((item) => item.id)).toEqual(['visible', 'peer', 'hidden']);
    expect(mobile.items.find((item) => item.id === 'hidden')).toMatchObject({
      x: 1,
      y: 4,
      w: 1,
      h: 2,
      hidden: true,
    });
    expect(mobile.constraints?.map((constraint) => constraint.id)).toEqual([
      'visible-hidden',
      'visible-peer',
    ]);
  });

  it('never mutates canonical hidden state, geometry or constraints', () => {
    const before = structuredClone(base);
    documentForBreakpoint(base, 'mobile');
    documentForBreakpoint(base, 'wide', undefined, { includeHidden: true });
    expect(base).toEqual(before);
  });
});

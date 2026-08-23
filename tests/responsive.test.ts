import { describe, expect, it } from 'vitest';
import { resolveBreakpoint, resolveGridSize } from '../src/layout/responsive';

describe('responsive layout', () => {
  it('resolves supported breakpoints', () => {
    expect(resolveBreakpoint(390)).toBe('mobile');
    expect(resolveBreakpoint(800)).toBe('tablet');
    expect(resolveBreakpoint(1280)).toBe('desktop');
    expect(resolveBreakpoint(1920)).toBe('wide');
  });

  it('uses custom size for the active breakpoint', () => {
    expect(resolveGridSize({ tablet: { columns: 6, rows: 4 } }, 800)).toEqual({ columns: 6, rows: 4 });
  });

  it('falls back to a safe default', () => {
    expect(resolveGridSize(undefined, 390)).toMatchObject({ columns: 4, rows: 3 });
  });
});

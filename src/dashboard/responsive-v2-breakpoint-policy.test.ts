import { describe, expect, it } from 'vitest';
import { resolveResponsiveCanvasV2Breakpoint } from './responsive-v2-breakpoint-policy';

describe('responsive canvas v2 breakpoint policy', () => {
  it('detects breakpoints from width in auto mode', () => {
    expect(resolveResponsiveCanvasV2Breakpoint({ kind: 'auto' }, 390)).toBe('mobile');
    expect(resolveResponsiveCanvasV2Breakpoint({ kind: 'auto' }, 834)).toBe('tablet');
    expect(resolveResponsiveCanvasV2Breakpoint({ kind: 'auto' }, 1280)).toBe('desktop');
    expect(resolveResponsiveCanvasV2Breakpoint({ kind: 'auto' }, 1800)).toBe('wide');
  });

  it('keeps the chosen breakpoint in manual mode regardless of width', () => {
    expect(resolveResponsiveCanvasV2Breakpoint({ kind: 'manual', breakpoint: 'desktop' }, 390)).toBe('desktop');
    expect(resolveResponsiveCanvasV2Breakpoint({ kind: 'manual', breakpoint: 'mobile' }, 1800)).toBe('mobile');
  });
});

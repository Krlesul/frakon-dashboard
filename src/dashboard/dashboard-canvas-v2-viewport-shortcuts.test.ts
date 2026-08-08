import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2ViewportShortcut } from './dashboard-canvas-v2-viewport-shortcuts';

function event(key: string, code = '', overrides: Partial<KeyboardEvent> = {}) {
  return {
    key,
    code,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...overrides,
  } as KeyboardEvent;
}

describe('dashboard canvas v2 viewport shortcuts', () => {
  it('maps 0 to fit and 1 to 100 percent', () => {
    expect(dashboardCanvasV2ViewportShortcut(event('0', 'Digit0'))).toEqual({ kind: 'fit' });
    expect(dashboardCanvasV2ViewportShortcut(event('1', 'Digit1'))).toEqual({ kind: 'reset' });
  });

  it('ignores modified shortcuts so browser and editor commands keep precedence', () => {
    expect(dashboardCanvasV2ViewportShortcut(event('0', 'Digit0', { ctrlKey: true }))).toBeUndefined();
    expect(dashboardCanvasV2ViewportShortcut(event('1', 'Digit1', { shiftKey: true }))).toBeUndefined();
  });
});

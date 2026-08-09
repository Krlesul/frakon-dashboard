import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2ClipboardShortcut } from './dashboard-canvas-v2-clipboard-shortcuts';

describe('dashboard canvas v2 clipboard shortcuts', () => {
  it('maps copy cut and paste only while canvas is focused', () => {
    expect(dashboardCanvasV2ClipboardShortcut({ key: 'c', ctrlKey: true, canvasFocused: true, canCopy: true, canPaste: false })).toBe('copy');
    expect(dashboardCanvasV2ClipboardShortcut({ key: 'X', metaKey: true, canvasFocused: true, canCopy: true, canPaste: false })).toBe('cut');
    expect(dashboardCanvasV2ClipboardShortcut({ key: 'v', ctrlKey: true, canvasFocused: true, canCopy: false, canPaste: true })).toBe('paste');
    expect(dashboardCanvasV2ClipboardShortcut({ key: 'c', ctrlKey: true, canvasFocused: false, canCopy: true, canPaste: false })).toBeUndefined();
  });

  it('does not steal browser shortcuts when the action is unavailable', () => {
    expect(dashboardCanvasV2ClipboardShortcut({ key: 'c', ctrlKey: true, canvasFocused: true, canCopy: false, canPaste: true })).toBeUndefined();
    expect(dashboardCanvasV2ClipboardShortcut({ key: 'v', metaKey: true, canvasFocused: true, canCopy: true, canPaste: false })).toBeUndefined();
  });

  it('ignores missing modifiers, alt-modified keys and unrelated shortcuts', () => {
    expect(dashboardCanvasV2ClipboardShortcut({ key: 'c', canvasFocused: true, canCopy: true, canPaste: true })).toBeUndefined();
    expect(dashboardCanvasV2ClipboardShortcut({ key: 'c', ctrlKey: true, altKey: true, canvasFocused: true, canCopy: true, canPaste: true })).toBeUndefined();
    expect(dashboardCanvasV2ClipboardShortcut({ key: 'd', ctrlKey: true, canvasFocused: true, canCopy: true, canPaste: true })).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { dashboardCanvasV2EditorShortcut } from './dashboard-canvas-v2-editor-shortcuts';

describe('dashboard canvas v2 editor shortcuts', () => {
  it('maps delete and backspace to delete selection', () => {
    expect(dashboardCanvasV2EditorShortcut({ key: 'Delete' })).toEqual({ kind: 'item', action: 'delete' });
    expect(dashboardCanvasV2EditorShortcut({ key: 'Backspace' })).toEqual({ kind: 'item', action: 'delete' });
  });

  it('maps Ctrl/Cmd+D to duplicate', () => {
    expect(dashboardCanvasV2EditorShortcut({ key: 'd', ctrlKey: true })).toEqual({ kind: 'item', action: 'duplicate' });
    expect(dashboardCanvasV2EditorShortcut({ key: 'D', metaKey: true })).toEqual({ kind: 'item', action: 'duplicate' });
  });

  it('maps Ctrl/Cmd+C and V to internal clipboard actions', () => {
    expect(dashboardCanvasV2EditorShortcut({ key: 'c', ctrlKey: true })).toEqual({ kind: 'clipboard', action: 'copy' });
    expect(dashboardCanvasV2EditorShortcut({ key: 'C', metaKey: true })).toEqual({ kind: 'clipboard', action: 'copy' });
    expect(dashboardCanvasV2EditorShortcut({ key: 'v', ctrlKey: true })).toEqual({ kind: 'clipboard', action: 'paste' });
    expect(dashboardCanvasV2EditorShortcut({ key: 'V', metaKey: true })).toEqual({ kind: 'clipboard', action: 'paste' });
  });

  it('maps bracket shortcuts to layer moves', () => {
    expect(dashboardCanvasV2EditorShortcut({ key: ']', ctrlKey: true })).toEqual({ kind: 'layer', action: 'bring-forward' });
    expect(dashboardCanvasV2EditorShortcut({ key: '[', metaKey: true })).toEqual({ kind: 'layer', action: 'send-backward' });
    expect(dashboardCanvasV2EditorShortcut({ key: ']', ctrlKey: true, shiftKey: true })).toEqual({ kind: 'layer', action: 'bring-front' });
    expect(dashboardCanvasV2EditorShortcut({ key: '[', metaKey: true, shiftKey: true })).toEqual({ kind: 'layer', action: 'send-back' });
  });

  it('ignores unrelated keys', () => {
    expect(dashboardCanvasV2EditorShortcut({ key: 'Enter' })).toBeUndefined();
    expect(dashboardCanvasV2EditorShortcut({ key: 'd' })).toBeUndefined();
  });
});

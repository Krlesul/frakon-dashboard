import { describe, expect, it } from 'vitest';
import { dashboardGridEditorShortcut } from './dashboard-grid-editor-shortcuts';

describe('grid dashboard editor shortcuts', () => {
  it('maps delete and backspace without a modifier', () => {
    expect(dashboardGridEditorShortcut({ key: 'Delete' })).toEqual({ kind: 'item', action: 'delete' });
    expect(dashboardGridEditorShortcut({ key: 'Backspace' })).toEqual({ kind: 'item', action: 'delete' });
  });

  it('maps Ctrl/Cmd+D to duplicate', () => {
    expect(dashboardGridEditorShortcut({ key: 'd', ctrlKey: true })).toEqual({ kind: 'item', action: 'duplicate' });
    expect(dashboardGridEditorShortcut({ key: 'D', metaKey: true })).toEqual({ kind: 'item', action: 'duplicate' });
  });

  it('maps bracket shortcuts to one-step layer movement', () => {
    expect(dashboardGridEditorShortcut({ key: ']', ctrlKey: true })).toEqual({ kind: 'layer', action: 'bring-forward' });
    expect(dashboardGridEditorShortcut({ key: '[', metaKey: true })).toEqual({ kind: 'layer', action: 'send-backward' });
  });

  it('maps Shift+bracket shortcuts to absolute layer movement', () => {
    expect(dashboardGridEditorShortcut({ key: ']', ctrlKey: true, shiftKey: true })).toEqual({ kind: 'layer', action: 'bring-front' });
    expect(dashboardGridEditorShortcut({ key: '[', metaKey: true, shiftKey: true })).toEqual({ kind: 'layer', action: 'send-back' });
  });

  it('does not claim unrelated shortcuts', () => {
    expect(dashboardGridEditorShortcut({ key: 'x', ctrlKey: true })).toBeUndefined();
    expect(dashboardGridEditorShortcut({ key: 'Delete', ctrlKey: true })).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { resolveStudioHistoryShortcut } from './studio-history-shortcuts';

describe('resolveStudioHistoryShortcut', () => {
  it('resolves Ctrl or Command Z as undo', () => {
    expect(resolveStudioHistoryShortcut({ key: 'z', ctrlKey: true })).toBe('undo');
    expect(resolveStudioHistoryShortcut({ key: 'Z', metaKey: true })).toBe('undo');
  });

  it('resolves shifted Z and Ctrl Y as redo', () => {
    expect(resolveStudioHistoryShortcut({ key: 'z', metaKey: true, shiftKey: true })).toBe('redo');
    expect(resolveStudioHistoryShortcut({ key: 'y', ctrlKey: true })).toBe('redo');
  });

  it('ignores commands with Alt or without a command modifier', () => {
    expect(resolveStudioHistoryShortcut({ key: 'z' })).toBeUndefined();
    expect(resolveStudioHistoryShortcut({ key: 'z', ctrlKey: true, altKey: true })).toBeUndefined();
  });

  it('ignores shortcuts while editing form controls', () => {
    expect(resolveStudioHistoryShortcut({
      key: 'z',
      ctrlKey: true,
      target: { tagName: 'INPUT' },
    })).toBeUndefined();
    expect(resolveStudioHistoryShortcut({
      key: 'z',
      metaKey: true,
      target: { tagName: 'textarea' },
    })).toBeUndefined();
    expect(resolveStudioHistoryShortcut({
      key: 'z',
      metaKey: true,
      target: { isContentEditable: true },
    })).toBeUndefined();
  });
});

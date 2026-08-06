export type StudioHistoryShortcut = 'undo' | 'redo';

export interface StudioHistoryKeyboardEvent {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  target?: EventTarget | null;
}

function isEditableTarget(target: EventTarget | null | undefined): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.matches('input, textarea, select, [contenteditable="true"]');
}

export function resolveStudioHistoryShortcut(
  event: StudioHistoryKeyboardEvent,
): StudioHistoryShortcut | undefined {
  if (isEditableTarget(event.target)) return undefined;
  if (event.altKey) return undefined;

  const command = Boolean(event.ctrlKey || event.metaKey);
  if (!command) return undefined;

  const key = event.key.toLowerCase();
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && !event.shiftKey) return 'redo';
  return undefined;
}

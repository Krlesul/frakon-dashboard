export type StudioHistoryShortcut = 'undo' | 'redo';

export interface StudioHistoryEventTarget {
  tagName?: string;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
}

export interface StudioHistoryKeyboardEvent {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  target?: EventTarget | StudioHistoryEventTarget | null;
}

function isEditableTarget(
  target: EventTarget | StudioHistoryEventTarget | null | undefined,
): boolean {
  if (!target || typeof target !== 'object') return false;
  const candidate = target as StudioHistoryEventTarget;
  if (candidate.isContentEditable === true) return true;
  const tagName = candidate.tagName?.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
  return candidate.getAttribute?.('contenteditable') === 'true';
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

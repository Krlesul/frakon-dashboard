import {
  addToSelection,
  clearSelection,
  selectOnly,
  toggleSelection,
  type SelectionState,
} from './selection';

export interface SelectionPointerIntent {
  targetId?: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  preserveOnBackground?: boolean;
}

export function applySelectionPointerIntent(
  current: SelectionState,
  intent: SelectionPointerIntent,
): SelectionState {
  const id = intent.targetId;
  if (!id) return intent.preserveOnBackground ? current : clearSelection();

  if (intent.ctrlKey || intent.metaKey) {
    return toggleSelection(current, id);
  }

  if (intent.shiftKey) {
    return addToSelection(current, id);
  }

  return selectOnly(id);
}

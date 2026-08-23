import {
  addToSelection,
  replaceSelection,
  selectByMarquee,
  selectOnly,
  toggleSelection,
  type SelectionRect,
  type SelectionState,
} from '../../packages/studio-engine/src/selection';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface CanvasV2SelectionModifiers {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export function selectCanvasV2Item(
  state: SelectionState,
  itemId: string,
  modifiers: CanvasV2SelectionModifiers = {},
): SelectionState {
  if (modifiers.ctrlKey || modifiers.metaKey) return toggleSelection(state, itemId);
  if (modifiers.shiftKey) return addToSelection(state, itemId);
  return selectOnly(itemId);
}

export function selectCanvasV2ByMarquee(
  document: FrakonDashboardDocumentV2,
  marquee: SelectionRect,
  current: SelectionState = { ids: [] },
  additive = false,
): SelectionState {
  return selectByMarquee(
    document.items.map((item) => ({ id: item.id, ...item.frame })),
    marquee,
    { current, additive, mode: 'intersect' },
  );
}

export function canvasV2MoveSelection(
  state: SelectionState,
  itemId: string,
  document: FrakonDashboardDocumentV2,
): string[] {
  const selected = state.ids.includes(itemId) ? state.ids : [itemId];
  const byId = new Map(document.items.map((item) => [item.id, item]));
  return selected.filter((id) => !byId.get(id)?.locked);
}

export function normalizeCanvasV2Selection(
  state: SelectionState,
  document: FrakonDashboardDocumentV2,
): SelectionState {
  const ids = new Set(document.items.map((item) => item.id));
  const selected = state.ids.filter((id) => ids.has(id));
  return replaceSelection(selected, state.anchorId && ids.has(state.anchorId) ? state.anchorId : undefined);
}

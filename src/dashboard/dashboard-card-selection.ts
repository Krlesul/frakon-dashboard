import { applySelectionPointerIntent } from '../../packages/studio-engine/src/selection-intent';
import { EMPTY_SELECTION, normalizeSelection, type SelectionState } from '../../packages/studio-engine/src/selection';
import type { FrakonGridItem } from './layout-model';

export interface DashboardCardSelectionModifiers {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export function selectDashboardCard(
  current: SelectionState = EMPTY_SELECTION,
  itemId: string | undefined,
  modifiers: DashboardCardSelectionModifiers = {},
): SelectionState {
  return normalizeSelection(applySelectionPointerIntent(current, {
    targetId: itemId,
    shiftKey: modifiers.shiftKey,
    ctrlKey: modifiers.ctrlKey,
    metaKey: modifiers.metaKey,
  }));
}

export function dashboardPointerMoveSelection(
  selection: SelectionState,
  item: FrakonGridItem,
  items: FrakonGridItem[],
): string[] {
  if (item.locked) return [];
  const available = new Set(items.filter((candidate) => !candidate.locked).map((candidate) => candidate.id));
  if (!selection.ids.includes(item.id)) return [item.id];
  return selection.ids.filter((id) => available.has(id));
}

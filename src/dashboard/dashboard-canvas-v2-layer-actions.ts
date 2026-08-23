import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export type DashboardCanvasV2LayerAction = 'bring-front' | 'send-back' | 'bring-forward' | 'send-backward';

export interface DashboardCanvasV2LayerActionResult {
  status: 'committed' | 'unchanged' | 'invalid';
  document: FrakonDashboardDocumentV2;
  reason?: string;
}

function sameOrder(a: FrakonDashboardDocumentV2, b: FrakonDashboardDocumentV2): boolean {
  return a.items.map((item) => item.id).join('\u0000') === b.items.map((item) => item.id).join('\u0000');
}

function selectedMovableIds(document: FrakonDashboardDocumentV2, selectedIds: Iterable<string>): Set<string> {
  const selected = new Set(selectedIds);
  return new Set(document.items.filter((item) => selected.has(item.id) && !item.locked).map((item) => item.id));
}

export function applyDashboardCanvasV2LayerAction(
  document: FrakonDashboardDocumentV2,
  selectedIds: Iterable<string>,
  action: DashboardCanvasV2LayerAction,
): DashboardCanvasV2LayerActionResult {
  const moving = selectedMovableIds(document, selectedIds);
  if (!moving.size) {
    return { status: 'invalid', document: structuredClone(document), reason: 'At least one unlocked selected item is required.' };
  }

  const items = document.items.map((item) => structuredClone(item));
  let ordered = items;
  if (action === 'bring-front' || action === 'send-back') {
    const selected = items.filter((item) => moving.has(item.id));
    const rest = items.filter((item) => !moving.has(item.id));
    ordered = action === 'bring-front' ? [...rest, ...selected] : [...selected, ...rest];
  } else if (action === 'bring-forward') {
    ordered = [...items];
    for (let index = ordered.length - 2; index >= 0; index -= 1) {
      if (!moving.has(ordered[index].id) || moving.has(ordered[index + 1].id)) continue;
      [ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]];
    }
  } else {
    ordered = [...items];
    for (let index = 1; index < ordered.length; index += 1) {
      if (!moving.has(ordered[index].id) || moving.has(ordered[index - 1].id)) continue;
      [ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]];
    }
  }

  const next = { ...structuredClone(document), items: ordered };
  return { status: sameOrder(document, next) ? 'unchanged' : 'committed', document: next };
}

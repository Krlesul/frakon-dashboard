export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectableItem extends SelectionRect {
  id: string;
  selectable?: boolean;
}

export type MarqueeSelectionMode = 'intersect' | 'contain';

export interface SelectionState {
  ids: string[];
  anchorId?: string;
}

export const EMPTY_SELECTION: SelectionState = { ids: [] };

function normalizeIds(ids: Iterable<string>): string[] {
  return [...new Set([...ids].filter(Boolean))];
}

function normalizedRect(rect: SelectionRect): SelectionRect {
  const x2 = rect.x + rect.width;
  const y2 = rect.y + rect.height;
  return {
    x: Math.min(rect.x, x2),
    y: Math.min(rect.y, y2),
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
}

function intersects(a: SelectionRect, b: SelectionRect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function contains(container: SelectionRect, item: SelectionRect): boolean {
  return item.x >= container.x
    && item.y >= container.y
    && item.x + item.width <= container.x + container.width
    && item.y + item.height <= container.y + container.height;
}

export function normalizeSelection(state: SelectionState): SelectionState {
  const ids = normalizeIds(state.ids);
  return {
    ids,
    anchorId: state.anchorId && ids.includes(state.anchorId) ? state.anchorId : ids.at(-1),
  };
}

export function clearSelection(): SelectionState {
  return { ids: [] };
}

export function selectOnly(id: string): SelectionState {
  return id ? { ids: [id], anchorId: id } : clearSelection();
}

export function addToSelection(state: SelectionState, id: string): SelectionState {
  if (!id) return normalizeSelection(state);
  return normalizeSelection({ ids: [...state.ids, id], anchorId: id });
}

export function removeFromSelection(state: SelectionState, id: string): SelectionState {
  return normalizeSelection({
    ids: state.ids.filter((candidate) => candidate !== id),
    anchorId: state.anchorId === id ? undefined : state.anchorId,
  });
}

export function toggleSelection(state: SelectionState, id: string): SelectionState {
  return state.ids.includes(id)
    ? removeFromSelection(state, id)
    : addToSelection(state, id);
}

export function replaceSelection(ids: Iterable<string>, anchorId?: string): SelectionState {
  return normalizeSelection({ ids: normalizeIds(ids), anchorId });
}

export function selectByMarquee(
  items: SelectableItem[],
  marquee: SelectionRect,
  options: {
    mode?: MarqueeSelectionMode;
    additive?: boolean;
    current?: SelectionState;
  } = {},
): SelectionState {
  const area = normalizedRect(marquee);
  const mode = options.mode ?? 'intersect';
  const matched = items
    .filter((item) => item.selectable !== false)
    .filter((item) => {
      const rect = normalizedRect(item);
      return mode === 'contain' ? contains(area, rect) : intersects(area, rect);
    })
    .map((item) => item.id);

  const ids = options.additive
    ? [...(options.current?.ids ?? []), ...matched]
    : matched;

  return replaceSelection(ids, matched.at(-1) ?? options.current?.anchorId);
}

export function isSelected(state: SelectionState, id: string): boolean {
  return state.ids.includes(id);
}

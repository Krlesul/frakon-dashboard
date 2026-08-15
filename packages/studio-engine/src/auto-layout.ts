export type AutoLayoutStrategy = 'priority-first' | 'comfortable' | 'balanced' | 'compact' | 'focus';

export interface AutoLayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  locked?: boolean;
  priority?: number;
  semanticGroup?: string;
  preferredWidth?: number;
  preferredHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface AutoLayoutOptions {
  columns: number;
  strategy?: AutoLayoutStrategy;
  variant?: number;
}

export interface AutoLayoutProposal {
  strategy: AutoLayoutStrategy;
  variant: number;
  items: AutoLayoutItem[];
}

const STRATEGIES: AutoLayoutStrategy[] = ['priority-first', 'comfortable', 'compact', 'focus'];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function overlaps(a: AutoLayoutItem, b: AutoLayoutItem): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function normalizedPriority(item: AutoLayoutItem): number {
  return Number.isFinite(item.priority) ? Math.max(0, item.priority ?? 0) : 0;
}

function preferredSize(
  item: AutoLayoutItem,
  columns: number,
  strategy: AutoLayoutStrategy,
  rank: number,
): Pick<AutoLayoutItem, 'w' | 'h'> {
  const minW = Math.max(1, item.minWidth ?? 1);
  const minH = Math.max(1, item.minHeight ?? 1);
  const maxW = Math.min(columns, Math.max(minW, item.maxWidth ?? columns));
  const maxH = Math.max(minH, item.maxHeight ?? 24);
  const baseW = item.preferredWidth ?? item.w;
  const baseH = item.preferredHeight ?? item.h;
  const priority = normalizedPriority(item);

  let width = baseW;
  let height = baseH;

  if (strategy === 'compact') {
    width = Math.min(baseW, Math.max(minW, Math.ceil(columns / 4)));
    height = Math.min(baseH, Math.max(minH, 2));
  } else if (strategy === 'comfortable' || strategy === 'balanced') {
    width = Math.max(baseW, Math.ceil(columns / 3));
    height = Math.max(baseH, 3);
  } else if (strategy === 'priority-first') {
    const boost = priority >= 80 ? 2 : priority >= 50 ? 1 : 0;
    width = baseW + boost;
    height = baseH + (priority >= 80 ? 1 : 0);
  } else if (strategy === 'focus') {
    if (rank === 0) {
      width = Math.max(baseW, Math.ceil(columns * 0.66));
      height = Math.max(baseH, 5);
    } else if (rank <= 2) {
      width = Math.max(baseW, Math.ceil(columns / 3));
      height = Math.max(baseH, 3);
    }
  }

  return {
    w: clamp(width, minW, maxW),
    h: clamp(height, minH, maxH),
  };
}

function firstFreePosition(
  item: AutoLayoutItem,
  placed: AutoLayoutItem[],
  columns: number,
  startColumn = 0,
): Pick<AutoLayoutItem, 'x' | 'y'> {
  const maxX = Math.max(0, columns - item.w);
  for (let y = 0; y < 10000; y += 1) {
    for (let offset = 0; offset <= maxX; offset += 1) {
      const x = (startColumn + offset) % (maxX + 1);
      const candidate = { ...item, x, y };
      if (!placed.some((existing) => overlaps(candidate, existing))) return { x, y };
    }
  }
  return { x: 0, y: placed.reduce((maximum, existing) => Math.max(maximum, existing.y + existing.h), 0) };
}

function rotate<T>(items: T[], amount: number): T[] {
  if (items.length === 0) return items;
  const normalized = ((amount % items.length) + items.length) % items.length;
  return [...items.slice(normalized), ...items.slice(0, normalized)];
}

function semanticGroupKey(item: AutoLayoutItem): string {
  const configured = item.semanticGroup?.trim();
  return configured ? configured : `__single:${item.id}`;
}

export function orderAutoLayoutItems(items: AutoLayoutItem[], strategy: AutoLayoutStrategy): AutoLayoutItem[] {
  const sorted = [...items].sort((a, b) => normalizedPriority(b) - normalizedPriority(a) || a.id.localeCompare(b.id));
  const groups = new Map<string, AutoLayoutItem[]>();
  for (const item of sorted) {
    const key = semanticGroupKey(item);
    const queue = groups.get(key) ?? [];
    queue.push(item);
    groups.set(key, queue);
  }

  const orderedGroups = [...groups.entries()].sort(([firstKey, first], [secondKey, second]) => {
    const priorityDelta = normalizedPriority(second[0]) - normalizedPriority(first[0]);
    return priorityDelta || firstKey.localeCompare(secondKey);
  });

  if (strategy !== 'comfortable' && strategy !== 'balanced') {
    return orderedGroups.flatMap(([, group]) => group);
  }

  // Comfortable mode deliberately interleaves semantic groups. This prevents
  // one large domain (for example sensors) from monopolising the first viewport.
  const queues = orderedGroups.map(([, group]) => [...group]);
  const result: AutoLayoutItem[] = [];
  while (queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const item = queue.shift();
      if (item) result.push(item);
    }
  }
  return result;
}

export function strategyForVariant(variant: number): AutoLayoutStrategy {
  return STRATEGIES[((Math.max(0, Math.floor(variant)) % STRATEGIES.length) + STRATEGIES.length) % STRATEGIES.length];
}

export function generateAutoLayoutProposal(
  items: AutoLayoutItem[],
  options: AutoLayoutOptions,
): AutoLayoutProposal {
  const columns = Math.max(1, Math.round(options.columns));
  const variant = Math.max(0, Math.floor(options.variant ?? 0));
  const strategy = options.strategy ?? strategyForVariant(variant);
  const locked = items
    .filter((item) => item.locked)
    .map((item) => ({
      ...item,
      x: clamp(item.x, 0, Math.max(0, columns - Math.max(1, item.w))),
      y: Math.max(0, Math.round(item.y)),
      w: clamp(item.w, 1, columns),
      h: Math.max(1, Math.round(item.h)),
    }));

  const movable = items.filter((item) => !item.locked);
  const fairOrdered = orderAutoLayoutItems(movable, strategy);
  const ordered = rotate(fairOrdered, Math.floor(variant / STRATEGIES.length));
  const placed = [...locked];

  ordered.forEach((source, rank) => {
    const size = preferredSize(source, columns, strategy, rank);
    const candidate: AutoLayoutItem = { ...source, ...size, x: 0, y: 0, locked: false };
    const position = firstFreePosition(candidate, placed, columns, variant + rank);
    placed.push({ ...candidate, ...position });
  });

  const byId = new Map(placed.map((item) => [item.id, item]));
  return {
    strategy,
    variant,
    items: items.map((item) => byId.get(item.id) ?? item),
  };
}

export function nextAutoLayoutProposal(
  items: AutoLayoutItem[],
  columns: number,
  currentVariant = -1,
): AutoLayoutProposal {
  return generateAutoLayoutProposal(items, { columns, variant: currentVariant + 1 });
}

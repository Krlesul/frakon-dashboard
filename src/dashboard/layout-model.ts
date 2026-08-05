export type FrakonBreakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export interface FrakonGridItem {
  id: string;
  card: Record<string, unknown>;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  locked?: boolean;
}

export interface FrakonDashboardDocument {
  version: 1;
  id: string;
  title: string;
  breakpoint: FrakonBreakpoint;
  columns: number;
  rowHeight: number;
  gap: number;
  items: FrakonGridItem[];
}

export function clampGridItem(item: FrakonGridItem, columns: number): FrakonGridItem {
  const minW = Math.max(1, item.minW ?? 1);
  const minH = Math.max(1, item.minH ?? 1);
  const maxW = Math.min(columns, Math.max(minW, item.maxW ?? columns));
  const maxH = Math.max(minH, item.maxH ?? 24);
  const w = Math.min(maxW, Math.max(minW, Math.round(item.w)));
  const h = Math.min(maxH, Math.max(minH, Math.round(item.h)));
  const x = Math.min(Math.max(0, Math.round(item.x)), Math.max(0, columns - w));
  const y = Math.max(0, Math.round(item.y));
  return { ...item, x, y, w, h };
}

export function normalizeDashboard(document: FrakonDashboardDocument): FrakonDashboardDocument {
  const columns = Math.max(1, Math.round(document.columns));
  return {
    ...document,
    version: 1,
    columns,
    rowHeight: Math.max(24, Math.round(document.rowHeight)),
    gap: Math.max(0, Math.round(document.gap)),
    items: document.items.map((item) => clampGridItem(item, columns)),
  };
}

export function updateGridItem(
  document: FrakonDashboardDocument,
  id: string,
  patch: Partial<Pick<FrakonGridItem, 'x' | 'y' | 'w' | 'h'>>,
): FrakonDashboardDocument {
  return normalizeDashboard({
    ...document,
    items: document.items.map((item) => item.id === id && !item.locked ? { ...item, ...patch } : item),
  });
}

export function addGridItem(document: FrakonDashboardDocument, item: FrakonGridItem): FrakonDashboardDocument {
  if (document.items.some((existing) => existing.id === item.id)) throw new Error(`Duplicate dashboard item id: ${item.id}`);
  return normalizeDashboard({ ...document, items: [...document.items, item] });
}

export function removeGridItem(document: FrakonDashboardDocument, id: string): FrakonDashboardDocument {
  const target = document.items.find((item) => item.id === id);
  if (target?.locked) return document;
  return { ...document, items: document.items.filter((item) => item.id !== id) };
}

export function setGridItemLocked(document: FrakonDashboardDocument, id: string, locked: boolean): FrakonDashboardDocument {
  return { ...document, items: document.items.map((item) => item.id === id ? { ...item, locked } : item) };
}

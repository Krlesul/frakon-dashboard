import type { SurfaceStyle } from '../../packages/design-system/src/surface-style';
import type { LayoutConstraint } from '../../packages/studio-engine/src/constraints';
import { projectDashboardGridToCanvas } from './dashboard-canvas-placement';
import type { FrakonBreakpoint, FrakonDashboardDocument, FrakonGridItem } from './layout-model';

export interface FrakonCanvasFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrakonCanvasItem {
  id: string;
  card: Record<string, unknown>;
  frame: FrakonCanvasFrame;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  locked?: boolean;
  surface?: SurfaceStyle;
}

export interface FrakonCanvasSnapSettings {
  enabled: boolean;
  size: number;
}

export interface FrakonCanvasLayout {
  mode: 'canvas';
  width: number;
  minHeight: number;
  snap: FrakonCanvasSnapSettings;
}

export interface FrakonDashboardDocumentV2 {
  version: 2;
  id: string;
  title: string;
  breakpoint: FrakonBreakpoint;
  layout: FrakonCanvasLayout;
  surface?: SurfaceStyle;
  cardSurface?: SurfaceStyle;
  constraints?: LayoutConstraint[];
  items: FrakonCanvasItem[];
}

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function optionalPositive(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.max(1, value);
}

export function normalizeCanvasFrame(frame: FrakonCanvasFrame, canvasWidth: number): FrakonCanvasFrame {
  const width = Math.max(1, Math.min(canvasWidth, finite(frame.width, 1)));
  const height = Math.max(1, finite(frame.height, 1));
  return {
    x: Math.max(0, Math.min(Math.max(0, canvasWidth - width), finite(frame.x, 0))),
    y: Math.max(0, finite(frame.y, 0)),
    width,
    height,
  };
}

function normalizeCanvasItem(item: FrakonCanvasItem, canvasWidth: number): FrakonCanvasItem {
  const requestedMinWidth = optionalPositive(item.minWidth);
  const requestedMinHeight = optionalPositive(item.minHeight);
  const requestedMaxWidth = optionalPositive(item.maxWidth);
  const requestedMaxHeight = optionalPositive(item.maxHeight);
  const base = normalizeCanvasFrame(item.frame, canvasWidth);
  const minWidth = Math.min(canvasWidth, requestedMinWidth ?? 1);
  const maxWidth = Math.max(minWidth, Math.min(canvasWidth, requestedMaxWidth ?? canvasWidth));
  const minHeight = requestedMinHeight ?? 1;
  const maxHeight = Math.max(minHeight, requestedMaxHeight ?? Number.MAX_SAFE_INTEGER);
  const width = Math.min(maxWidth, Math.max(minWidth, base.width));
  const height = Math.min(maxHeight, Math.max(minHeight, base.height));

  return {
    ...structuredClone(item),
    minWidth: requestedMinWidth === undefined ? undefined : minWidth,
    minHeight: requestedMinHeight === undefined ? undefined : minHeight,
    maxWidth: requestedMaxWidth === undefined ? undefined : maxWidth,
    maxHeight: requestedMaxHeight === undefined ? undefined : maxHeight,
    frame: {
      x: Math.max(0, Math.min(Math.max(0, canvasWidth - width), base.x)),
      y: base.y,
      width,
      height,
    },
  };
}

export function normalizeDashboardV2(document: FrakonDashboardDocumentV2): FrakonDashboardDocumentV2 {
  const width = Math.max(1, finite(document.layout.width, 1));
  const minHeight = Math.max(1, finite(document.layout.minHeight, 1));
  const snapSize = Math.max(1, finite(document.layout.snap.size, 8));
  const uniqueItems = new Map<string, FrakonCanvasItem>();

  for (const item of document.items) {
    if (!item.id) continue;
    uniqueItems.set(item.id, normalizeCanvasItem(item, width));
  }

  const ids = new Set(uniqueItems.keys());
  const constraints = document.constraints?.filter(
    (constraint) => constraint.id && ids.has(constraint.sourceId) && ids.has(constraint.targetId),
  ).map((constraint) => structuredClone(constraint));

  return {
    ...structuredClone(document),
    version: 2,
    layout: {
      mode: 'canvas',
      width,
      minHeight,
      snap: {
        enabled: document.layout.snap.enabled !== false,
        size: snapSize,
      },
    },
    constraints,
    items: [...uniqueItems.values()],
  };
}

function projectedMinHeight(document: FrakonDashboardDocument, canvasWidth: number): number {
  const projection = projectDashboardGridToCanvas(document, canvasWidth);
  return Math.max(
    document.rowHeight,
    ...projection.items.map((item) => item.y + item.height),
  );
}

function gridSpanToPixelWidth(span: number | undefined, columnWidth: number, gap: number): number | undefined {
  if (span === undefined) return undefined;
  const safeSpan = Math.max(1, span);
  return safeSpan * columnWidth + Math.max(0, safeSpan - 1) * gap;
}

function gridSpanToPixelHeight(span: number | undefined, rowHeight: number, gap: number): number | undefined {
  if (span === undefined) return undefined;
  const safeSpan = Math.max(1, span);
  return safeSpan * rowHeight + Math.max(0, safeSpan - 1) * gap;
}

export function migrateDashboardV1ToV2(
  document: FrakonDashboardDocument,
  canvasWidth: number,
): FrakonDashboardDocumentV2 {
  const projection = projectDashboardGridToCanvas(document, canvasWidth);
  const projectedById = new Map(projection.items.map((item) => [item.id, item]));

  const items: FrakonCanvasItem[] = document.items.map((item: FrakonGridItem) => {
    const projected = projectedById.get(item.id);
    if (!projected) throw new Error(`Missing canvas projection for item ${item.id}.`);
    return {
      id: item.id,
      card: structuredClone(item.card),
      frame: {
        x: projected.x,
        y: projected.y,
        width: projected.width,
        height: projected.height,
      },
      minWidth: gridSpanToPixelWidth(item.minW, projection.columnWidth, document.gap),
      minHeight: gridSpanToPixelHeight(item.minH, document.rowHeight, document.gap),
      maxWidth: gridSpanToPixelWidth(item.maxW, projection.columnWidth, document.gap),
      maxHeight: gridSpanToPixelHeight(item.maxH, document.rowHeight, document.gap),
      locked: item.locked,
      surface: item.surface ? structuredClone(item.surface) : undefined,
    };
  });

  return normalizeDashboardV2({
    version: 2,
    id: document.id,
    title: document.title,
    breakpoint: document.breakpoint,
    layout: {
      mode: 'canvas',
      width: Math.max(1, canvasWidth),
      minHeight: projectedMinHeight(document, canvasWidth),
      snap: { enabled: true, size: Math.max(1, document.gap || 8) },
    },
    surface: document.surface ? structuredClone(document.surface) : undefined,
    cardSurface: document.cardSurface ? structuredClone(document.cardSurface) : undefined,
    constraints: document.constraints?.map((constraint) => structuredClone(constraint)),
    items,
  });
}

export function isDashboardDocumentV2(value: unknown): value is FrakonDashboardDocumentV2 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<FrakonDashboardDocumentV2>;
  return candidate.version === 2
    && typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && candidate.layout?.mode === 'canvas'
    && Array.isArray(candidate.items);
}

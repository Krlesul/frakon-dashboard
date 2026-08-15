import type { SurfaceStyle } from '../../packages/design-system/src/surface-style';
import type { LayoutConstraint } from '../../packages/studio-engine/src/constraints';
import { projectDashboardGridToCanvas } from './dashboard-canvas-placement';
import { dashboardWithinSerializedByteLimit } from './dashboard-document-limits';
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

const BREAKPOINTS = new Set(['mobile', 'tablet', 'desktop', 'wide']);
const MAX_ITEMS = 2000;
const MAX_CONSTRAINTS = 4000;
const CONSTRAINT_KINDS = new Set([
  'align-left',
  'align-center-x',
  'align-right',
  'align-top',
  'align-center-y',
  'align-bottom',
  'below',
  'right-of',
  'match-width',
  'match-height',
]);

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function positiveNumber(value: unknown): value is number {
  return finiteNumber(value) && value > 0;
}

function optionalPositiveNumber(value: unknown): boolean {
  return value === undefined || positiveNumber(value);
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}

function identifier(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

function migrationVisibleDocument(document: FrakonDashboardDocument): FrakonDashboardDocument {
  const items = document.items.filter((item) => item.hidden !== true);
  const ids = new Set(items.map((item) => item.id));
  return {
    ...document,
    items,
    constraints: document.constraints?.filter(
      (constraint) => ids.has(constraint.sourceId) && ids.has(constraint.targetId),
    ),
  };
}

/**
 * Build a read-only v2 migration candidate. The current v2 schema does not yet
 * encode hidden state, so hidden v1 layers are deliberately omitted rather than
 * being exposed as visible cards. Migration previews are never persistence-safe
 * until native hidden-layer semantics and the v2 write gate are explicitly enabled.
 */
export function migrateDashboardV1ToV2(
  document: FrakonDashboardDocument,
  canvasWidth: number,
): FrakonDashboardDocumentV2 {
  const migrationDocument = migrationVisibleDocument(document);
  const projection = projectDashboardGridToCanvas(migrationDocument, canvasWidth);
  const projectedById = new Map(projection.items.map((item) => [item.id, item]));

  const items: FrakonCanvasItem[] = migrationDocument.items.map((item: FrakonGridItem) => {
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
      minWidth: gridSpanToPixelWidth(item.minW, projection.columnWidth, migrationDocument.gap),
      minHeight: gridSpanToPixelHeight(item.minH, migrationDocument.rowHeight, migrationDocument.gap),
      maxWidth: gridSpanToPixelWidth(item.maxW, projection.columnWidth, migrationDocument.gap),
      maxHeight: gridSpanToPixelHeight(item.maxH, migrationDocument.rowHeight, migrationDocument.gap),
      locked: item.locked,
      surface: item.surface ? structuredClone(item.surface) : undefined,
    };
  });

  return normalizeDashboardV2({
    version: 2,
    id: migrationDocument.id,
    title: migrationDocument.title,
    breakpoint: migrationDocument.breakpoint,
    layout: {
      mode: 'canvas',
      width: Math.max(1, canvasWidth),
      minHeight: projectedMinHeight(migrationDocument, canvasWidth),
      snap: { enabled: true, size: Math.max(1, migrationDocument.gap || 8) },
    },
    surface: migrationDocument.surface ? structuredClone(migrationDocument.surface) : undefined,
    cardSurface: migrationDocument.cardSurface ? structuredClone(migrationDocument.cardSurface) : undefined,
    constraints: migrationDocument.constraints?.map((constraint) => structuredClone(constraint)),
    items,
  });
}

export function isDashboardDocumentV2(value: unknown): value is FrakonDashboardDocumentV2 {
  if (!record(value)) return false;
  if (value.version !== 2) return false;
  if (!identifier(value.id, 128)) return false;
  if (typeof value.title !== 'string') return false;
  if (typeof value.breakpoint !== 'string' || !BREAKPOINTS.has(value.breakpoint)) return false;

  const layout = value.layout;
  if (!validCanvasLayout(layout)) return false;
  if (!Array.isArray(value.items) || value.items.length > MAX_ITEMS) return false;

  const itemIds = new Set<string>();
  for (const item of value.items) {
    if (!validCanvasItem(item, layout.width)) return false;
    if (itemIds.has(item.id)) return false;
    itemIds.add(item.id);
  }
  return validConstraints(value.constraints, itemIds)
    && dashboardWithinSerializedByteLimit(value);
}

function validCanvasLayout(value: unknown): value is FrakonCanvasLayout {
  if (!record(value) || value.mode !== 'canvas') return false;
  if (!positiveNumber(value.width) || !positiveNumber(value.minHeight)) return false;
  if (!record(value.snap)) return false;
  return typeof value.snap.enabled === 'boolean' && positiveNumber(value.snap.size);
}

function validCanvasItem(value: unknown, canvasWidth: number): value is FrakonCanvasItem {
  if (!record(value)) return false;
  if (!identifier(value.id, 128)) return false;
  if ('hidden' in value) return false;
  if (!record(value.card) || typeof value.card.type !== 'string' || !value.card.type) return false;
  if (!record(value.frame)) return false;
  if (!finiteNumber(value.frame.x) || value.frame.x < 0) return false;
  if (!finiteNumber(value.frame.y) || value.frame.y < 0) return false;
  if (!positiveNumber(value.frame.width) || !positiveNumber(value.frame.height)) return false;
  if (value.frame.x + value.frame.width > canvasWidth) return false;
  if (!optionalPositiveNumber(value.minWidth)
    || !optionalPositiveNumber(value.minHeight)
    || !optionalPositiveNumber(value.maxWidth)
    || !optionalPositiveNumber(value.maxHeight)) return false;
  if (!optionalBoolean(value.locked)) return false;

  const minWidth = value.minWidth;
  const minHeight = value.minHeight;
  const maxWidth = value.maxWidth;
  const maxHeight = value.maxHeight;
  if (positiveNumber(minWidth) && minWidth > canvasWidth) return false;
  if (positiveNumber(maxWidth) && maxWidth > canvasWidth) return false;
  if (positiveNumber(minWidth) && positiveNumber(maxWidth) && minWidth > maxWidth) return false;
  if (positiveNumber(minHeight) && positiveNumber(maxHeight) && minHeight > maxHeight) return false;

  const effectiveMinWidth = positiveNumber(minWidth) ? minWidth : 1;
  const effectiveMaxWidth = positiveNumber(maxWidth) ? maxWidth : canvasWidth;
  const effectiveMinHeight = positiveNumber(minHeight) ? minHeight : 1;
  const effectiveMaxHeight = positiveNumber(maxHeight) ? maxHeight : Number.MAX_SAFE_INTEGER;
  if (value.frame.width < effectiveMinWidth || value.frame.width > effectiveMaxWidth) return false;
  if (value.frame.height < effectiveMinHeight || value.frame.height > effectiveMaxHeight) return false;
  return true;
}

function validConstraints(value: unknown, itemIds: Set<string>): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > MAX_CONSTRAINTS) return false;
  const constraintIds = new Set<string>();
  for (const constraint of value) {
    if (!record(constraint)) return false;
    if (!identifier(constraint.id, 256) || constraintIds.has(constraint.id)) return false;
    if (typeof constraint.kind !== 'string' || !CONSTRAINT_KINDS.has(constraint.kind)) return false;
    if (!identifier(constraint.sourceId, 128) || !identifier(constraint.targetId, 128)) return false;
    if (constraint.sourceId === constraint.targetId) return false;
    if (!itemIds.has(constraint.sourceId) || !itemIds.has(constraint.targetId)) return false;
    if (constraint.gap !== undefined && !finiteNumber(constraint.gap)) return false;
    if (constraint.priority !== undefined && !finiteNumber(constraint.priority)) return false;
    if (!optionalBoolean(constraint.enabled)) return false;
    constraintIds.add(constraint.id);
  }
  return true;
}

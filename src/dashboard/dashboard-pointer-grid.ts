import { previewMove } from '../../packages/studio-engine/src/move';
import { resizeRect, type ResizeHandle } from '../../packages/studio-engine/src/resize';
import type { FrakonDashboardDocument, FrakonGridItem } from './layout-model';

export interface DashboardGridMetrics {
  columnStep: number;
  rowStep: number;
}

export interface DashboardPointerDelta {
  x: number;
  y: number;
}

export interface DashboardPointerPreview {
  items: FrakonGridItem[];
  collisionIds: string[];
  hasCollisions: boolean;
}

export function dashboardGridMetrics(
  containerWidth: number,
  columns: number,
  rowHeight: number,
  gap: number,
): DashboardGridMetrics {
  const safeColumns = Math.max(1, Math.round(columns));
  const safeGap = Math.max(0, gap);
  const usableWidth = Math.max(safeColumns, containerWidth - safeGap * (safeColumns - 1));
  const columnWidth = usableWidth / safeColumns;
  return {
    columnStep: columnWidth + safeGap,
    rowStep: Math.max(1, rowHeight) + safeGap,
  };
}

export function pointerDeltaToDashboardGrid(
  delta: DashboardPointerDelta,
  metrics: DashboardGridMetrics,
): DashboardPointerDelta {
  return {
    x: Math.round(delta.x / Math.max(1, metrics.columnStep)),
    y: Math.round(delta.y / Math.max(1, metrics.rowStep)),
  };
}

function maximumHorizontalDelta(document: FrakonDashboardDocument, selected: Set<string>): number {
  const movable = document.items.filter((item) => selected.has(item.id) && !item.locked);
  if (movable.length === 0) return 0;
  return document.columns - Math.max(...movable.map((item) => item.x + item.w));
}

function minimumHorizontalDelta(document: FrakonDashboardDocument, selected: Set<string>): number {
  const movable = document.items.filter((item) => selected.has(item.id) && !item.locked);
  if (movable.length === 0) return 0;
  return -Math.min(...movable.map((item) => item.x));
}

export function previewDashboardPointerMove(
  document: FrakonDashboardDocument,
  selectedIds: Iterable<string>,
  pointerDelta: DashboardPointerDelta,
  containerWidth: number,
): DashboardPointerPreview {
  const selected = new Set(selectedIds);
  const metrics = dashboardGridMetrics(containerWidth, document.columns, document.rowHeight, document.gap);
  const gridDelta = pointerDeltaToDashboardGrid(pointerDelta, metrics);
  const boundedDelta = {
    x: Math.min(maximumHorizontalDelta(document, selected), Math.max(minimumHorizontalDelta(document, selected), gridDelta.x)),
    y: gridDelta.y,
  };
  const preview = previewMove(
    document.items.map((item) => ({ id: item.id, x: item.x, y: item.y, width: item.w, height: item.h, locked: item.locked })),
    selected,
    boundedDelta,
    { minX: 0, minY: 0, gridX: 1, gridY: 1 },
  );
  return {
    items: document.items.map((item) => {
      const moved = preview.items.find((candidate) => candidate.id === item.id);
      return moved ? { ...item, x: moved.x, y: moved.y } : { ...item };
    }),
    collisionIds: preview.collisionIds,
    hasCollisions: preview.hasCollisions,
  };
}

export function previewDashboardPointerResize(
  document: FrakonDashboardDocument,
  itemId: string,
  handle: ResizeHandle,
  pointerDelta: DashboardPointerDelta,
  containerWidth: number,
): DashboardPointerPreview {
  const item = document.items.find((candidate) => candidate.id === itemId);
  if (!item || item.locked) return { items: document.items.map((candidate) => ({ ...candidate })), collisionIds: [], hasCollisions: false };
  const metrics = dashboardGridMetrics(containerWidth, document.columns, document.rowHeight, document.gap);
  const gridDelta = pointerDeltaToDashboardGrid(pointerDelta, metrics);
  const resized = resizeRect(
    { x: item.x, y: item.y, width: item.w, height: item.h },
    handle,
    gridDelta,
    { minWidth: 1, minHeight: 1, maxWidth: document.columns },
  );
  const x = Math.max(0, Math.min(document.columns - 1, Math.round(resized.x)));
  const y = Math.max(0, Math.round(resized.y));
  const w = Math.max(1, Math.min(document.columns - x, Math.round(resized.width)));
  const h = Math.max(1, Math.round(resized.height));
  const items = document.items.map((candidate) => candidate.id === itemId ? { ...candidate, x, y, w, h } : { ...candidate });
  const collisionIds = previewMove(
    items.map((candidate) => ({ id: candidate.id, x: candidate.x, y: candidate.y, width: candidate.w, height: candidate.h, locked: candidate.locked })),
    [],
    { x: 0, y: 0 },
  ).collisionIds;
  return { items, collisionIds, hasCollisions: collisionIds.length > 0 };
}

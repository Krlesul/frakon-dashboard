import { previewMove } from '../../packages/studio-engine/src/move';
import type { FrakonDashboardDocument } from './layout-model';

export interface DashboardKeyboardNudgeResult {
  status: 'moved' | 'collision' | 'unchanged';
  document: FrakonDashboardDocument;
  collisionIds: string[];
}

export function keyboardNudgeDelta(
  key: string,
  largeStep = false,
): { x: number; y: number } | undefined {
  const unit = largeStep ? 5 : 1;
  switch (key) {
    case 'ArrowLeft': return { x: -unit, y: 0 };
    case 'ArrowRight': return { x: unit, y: 0 };
    case 'ArrowUp': return { x: 0, y: -unit };
    case 'ArrowDown': return { x: 0, y: unit };
    default: return undefined;
  }
}

export function nudgeDashboardSelection(
  document: FrakonDashboardDocument,
  selectedIds: Iterable<string>,
  delta: { x: number; y: number },
): DashboardKeyboardNudgeResult {
  const selected = new Set(selectedIds);
  const movable = document.items.filter(
    (item) => selected.has(item.id) && !item.locked && !item.hidden,
  );
  if (!movable.length || (!delta.x && !delta.y)) {
    return { status: 'unchanged', document: structuredClone(document), collisionIds: [] };
  }
  const movableIds = new Set(movable.map((item) => item.id));

  const minDeltaX = -Math.min(...movable.map((item) => item.x));
  const maxDeltaX = document.columns - Math.max(...movable.map((item) => item.x + item.w));
  const minDeltaY = -Math.min(...movable.map((item) => item.y));
  const bounded = {
    x: Math.min(maxDeltaX, Math.max(minDeltaX, Math.round(delta.x))),
    y: Math.max(minDeltaY, Math.round(delta.y)),
  };

  if (!bounded.x && !bounded.y) {
    return { status: 'unchanged', document: structuredClone(document), collisionIds: [] };
  }

  const preview = previewMove(
    document.items.map((item) => ({
      id: item.id,
      x: item.x,
      y: item.y,
      width: item.w,
      height: item.h,
      locked: item.locked || item.hidden,
    })),
    movableIds,
    bounded,
    { minX: 0, minY: 0, gridX: 1, gridY: 1 },
  );

  if (preview.hasCollisions) {
    return {
      status: 'collision',
      document: structuredClone(document),
      collisionIds: [...preview.collisionIds],
    };
  }

  const items = document.items.map((item) => {
    const moved = preview.items.find((candidate) => candidate.id === item.id);
    return moved ? { ...item, x: moved.x, y: moved.y } : { ...item };
  });
  const changed = items.some((item, index) => item.x !== document.items[index]?.x || item.y !== document.items[index]?.y);
  return {
    status: changed ? 'moved' : 'unchanged',
    document: { ...document, items },
    collisionIds: [],
  };
}

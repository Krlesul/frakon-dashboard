import type { ConstraintDiagnostic } from '../../packages/studio-engine/src/constraints';
import { applyDashboardCanvasV2Constraints } from './dashboard-canvas-v2-constraints';
import { canvasV2CollisionIds } from './dashboard-canvas-v2-session';
import { normalizeDashboardV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';

export type DashboardCanvasV2SelectionAction =
  | 'align-left'
  | 'align-center-x'
  | 'align-right'
  | 'align-top'
  | 'align-center-y'
  | 'align-bottom'
  | 'match-width'
  | 'match-height'
  | 'distribute-horizontal'
  | 'distribute-vertical'
  | 'equal-gap-horizontal'
  | 'equal-gap-vertical';

export interface DashboardCanvasV2SelectionActionResult {
  status: 'committed' | 'collision' | 'unchanged' | 'invalid';
  document: FrakonDashboardDocumentV2;
  collisionIds: string[];
  constraintDiagnostics: ConstraintDiagnostic[];
  reason?: string;
}

function same(a: FrakonDashboardDocumentV2, b: FrakonDashboardDocumentV2): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function movableSelected(document: FrakonDashboardDocumentV2, selected: Set<string>) {
  return document.items.filter((item) => selected.has(item.id) && !item.locked);
}

function distributedFrames(
  document: FrakonDashboardDocumentV2,
  selected: Set<string>,
  axis: 'x' | 'y',
  mode: 'centers' | 'gaps',
): Map<string, number> | undefined {
  const items = movableSelected(document, selected).sort((a, b) => {
    const ac = axis === 'x' ? a.frame.x + a.frame.width / 2 : a.frame.y + a.frame.height / 2;
    const bc = axis === 'x' ? b.frame.x + b.frame.width / 2 : b.frame.y + b.frame.height / 2;
    return ac - bc;
  });
  if (items.length < 3) return undefined;

  const result = new Map<string, number>();
  const first = items[0];
  const last = items[items.length - 1];
  if (mode === 'centers') {
    const firstCenter = axis === 'x' ? first.frame.x + first.frame.width / 2 : first.frame.y + first.frame.height / 2;
    const lastCenter = axis === 'x' ? last.frame.x + last.frame.width / 2 : last.frame.y + last.frame.height / 2;
    const step = (lastCenter - firstCenter) / (items.length - 1);
    items.slice(1, -1).forEach((item, index) => {
      const size = axis === 'x' ? item.frame.width : item.frame.height;
      result.set(item.id, firstCenter + step * (index + 1) - size / 2);
    });
    return result;
  }

  const start = axis === 'x' ? first.frame.x : first.frame.y;
  const end = axis === 'x' ? last.frame.x + last.frame.width : last.frame.y + last.frame.height;
  const totalSize = items.reduce((sum, item) => sum + (axis === 'x' ? item.frame.width : item.frame.height), 0);
  const gap = (end - start - totalSize) / (items.length - 1);
  if (gap < 0) return undefined;
  let cursor = start + (axis === 'x' ? first.frame.width : first.frame.height) + gap;
  items.slice(1, -1).forEach((item) => {
    result.set(item.id, cursor);
    cursor += (axis === 'x' ? item.frame.width : item.frame.height) + gap;
  });
  return result;
}

export function applyDashboardCanvasV2SelectionAction(
  document: FrakonDashboardDocumentV2,
  selectedIds: Iterable<string>,
  action: DashboardCanvasV2SelectionAction,
): DashboardCanvasV2SelectionActionResult {
  const selected = new Set(selectedIds);
  const items = document.items.filter((item) => selected.has(item.id));
  if (items.length < 2) {
    return { status: 'invalid', document: structuredClone(document), collisionIds: [], constraintDiagnostics: [], reason: 'At least two selected items are required.' };
  }
  const anchor = items[0];
  const left = Math.min(...items.map((item) => item.frame.x));
  const top = Math.min(...items.map((item) => item.frame.y));
  const right = Math.max(...items.map((item) => item.frame.x + item.frame.width));
  const bottom = Math.max(...items.map((item) => item.frame.y + item.frame.height));
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const horizontalDistribution = action === 'distribute-horizontal' || action === 'equal-gap-horizontal'
    ? distributedFrames(document, selected, 'x', action === 'distribute-horizontal' ? 'centers' : 'gaps')
    : undefined;
  const verticalDistribution = action === 'distribute-vertical' || action === 'equal-gap-vertical'
    ? distributedFrames(document, selected, 'y', action === 'distribute-vertical' ? 'centers' : 'gaps')
    : undefined;

  if ((action.startsWith('distribute-') || action.startsWith('equal-gap-')) && movableSelected(document, selected).length < 3) {
    return { status: 'invalid', document: structuredClone(document), collisionIds: [], constraintDiagnostics: [], reason: 'At least three unlocked selected items are required for distribution.' };
  }
  if (action === 'equal-gap-horizontal' && !horizontalDistribution) {
    return { status: 'invalid', document: structuredClone(document), collisionIds: [], constraintDiagnostics: [], reason: 'Selected items do not have enough horizontal space for non-overlapping equal gaps.' };
  }
  if (action === 'equal-gap-vertical' && !verticalDistribution) {
    return { status: 'invalid', document: structuredClone(document), collisionIds: [], constraintDiagnostics: [], reason: 'Selected items do not have enough vertical space for non-overlapping equal gaps.' };
  }

  const candidate = normalizeDashboardV2({
    ...document,
    items: document.items.map((item) => {
      if (!selected.has(item.id) || item.locked) return structuredClone(item);
      const frame = { ...item.frame };
      switch (action) {
        case 'align-left': frame.x = left; break;
        case 'align-center-x': frame.x = centerX - frame.width / 2; break;
        case 'align-right': frame.x = right - frame.width; break;
        case 'align-top': frame.y = top; break;
        case 'align-center-y': frame.y = centerY - frame.height / 2; break;
        case 'align-bottom': frame.y = bottom - frame.height; break;
        case 'match-width': frame.width = anchor.frame.width; break;
        case 'match-height': frame.height = anchor.frame.height; break;
        case 'distribute-horizontal':
        case 'equal-gap-horizontal':
          if (horizontalDistribution?.has(item.id)) frame.x = horizontalDistribution.get(item.id)!;
          break;
        case 'distribute-vertical':
        case 'equal-gap-vertical':
          if (verticalDistribution?.has(item.id)) frame.y = verticalDistribution.get(item.id)!;
          break;
      }
      return { ...structuredClone(item), frame };
    }),
  });

  const solved = applyDashboardCanvasV2Constraints(candidate);
  const collisionIds = canvasV2CollisionIds(solved.document.items);
  if (collisionIds.length) {
    return {
      status: 'collision',
      document: structuredClone(document),
      collisionIds,
      constraintDiagnostics: solved.diagnostics,
    };
  }
  return {
    status: same(document, solved.document) ? 'unchanged' : 'committed',
    document: solved.document,
    collisionIds: [],
    constraintDiagnostics: solved.diagnostics,
  };
}

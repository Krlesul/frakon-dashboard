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
  | 'match-height';

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

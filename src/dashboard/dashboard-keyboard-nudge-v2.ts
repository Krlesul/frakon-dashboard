import type { ConstraintDiagnostic } from '../../packages/studio-engine/src/constraints';
import { DashboardCanvasV2Session } from './dashboard-canvas-v2-session';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardKeyboardNudgeV2Result {
  status: 'moved' | 'collision' | 'unchanged';
  document: FrakonDashboardDocumentV2;
  collisionIds: string[];
  constraintDiagnostics: ConstraintDiagnostic[];
}

export function nudgeDashboardV2Selection(
  document: FrakonDashboardDocumentV2,
  selectedIds: Iterable<string>,
  delta: { x: number; y: number },
): DashboardKeyboardNudgeV2Result {
  const selected = [...new Set(selectedIds)];
  if (!selected.length || (!delta.x && !delta.y)) {
    return { status: 'unchanged', document: structuredClone(document), collisionIds: [], constraintDiagnostics: [] };
  }

  const session = new DashboardCanvasV2Session(
    document,
    { kind: 'move', selectedIds: selected },
    { x: 0, y: 0 },
  );
  const result = session.commit(delta);
  return {
    status: result.status === 'committed' ? 'moved' : result.status,
    document: result.document,
    collisionIds: result.collisionIds,
    constraintDiagnostics: result.constraintDiagnostics,
  };
}

export function keyboardNudgeDeltaV2(
  key: string,
  snapSize: number,
  largeStep = false,
): { x: number; y: number } | undefined {
  const unit = Math.max(1, snapSize) * (largeStep ? 5 : 1);
  switch (key) {
    case 'ArrowLeft': return { x: -unit, y: 0 };
    case 'ArrowRight': return { x: unit, y: 0 };
    case 'ArrowUp': return { x: 0, y: -unit };
    case 'ArrowDown': return { x: 0, y: unit };
    default: return undefined;
  }
}

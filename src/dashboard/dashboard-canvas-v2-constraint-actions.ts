import type { ConstraintDiagnostic, ConstraintKind, LayoutConstraint } from '../../packages/studio-engine/src/constraints';
import { applyDashboardCanvasV2Constraints } from './dashboard-canvas-v2-constraints';
import { canvasV2CollisionIds } from './dashboard-canvas-v2-session';
import { normalizeDashboardV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2ConstraintPatch {
  kind?: ConstraintKind;
  sourceId?: string;
  targetId?: string;
  gap?: number | null;
  priority?: number | null;
  enabled?: boolean;
}

export interface DashboardCanvasV2ConstraintEditResult {
  status: 'committed' | 'collision' | 'unchanged' | 'invalid';
  document: FrakonDashboardDocumentV2;
  collisionIds: string[];
  constraintDiagnostics: ConstraintDiagnostic[];
  reason?: string;
}

function sameDocument(a: FrakonDashboardDocumentV2, b: FrakonDashboardDocumentV2): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function invalidResult(document: FrakonDashboardDocumentV2, reason: string): DashboardCanvasV2ConstraintEditResult {
  return { status: 'invalid', document: structuredClone(document), collisionIds: [], constraintDiagnostics: [], reason };
}

function nextConstraintId(document: FrakonDashboardDocumentV2, sourceId: string, targetId: string, kind: ConstraintKind): string {
  const base = `${sourceId}-${kind}-${targetId}`.replace(/[^a-zA-Z0-9_-]+/g, '-');
  const existing = new Set((document.constraints ?? []).map((constraint) => constraint.id));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function validateRefs(document: FrakonDashboardDocumentV2, sourceId: string, targetId: string): string | undefined {
  const ids = new Set(document.items.map((item) => item.id));
  if (!ids.has(sourceId)) return `Missing source item ${sourceId}.`;
  if (!ids.has(targetId)) return `Missing target item ${targetId}.`;
  if (sourceId === targetId) return 'Constraint source and target must be different items.';
  return undefined;
}

function solveCandidate(source: FrakonDashboardDocumentV2, candidate: FrakonDashboardDocumentV2): DashboardCanvasV2ConstraintEditResult {
  const normalized = normalizeDashboardV2(candidate);
  const solved = applyDashboardCanvasV2Constraints(normalized);
  const collisionIds = canvasV2CollisionIds(solved.document.items);
  if (collisionIds.length) {
    return {
      status: 'collision',
      document: structuredClone(source),
      collisionIds,
      constraintDiagnostics: solved.diagnostics,
    };
  }
  return {
    status: sameDocument(source, solved.document) ? 'unchanged' : 'committed',
    document: solved.document,
    collisionIds: [],
    constraintDiagnostics: solved.diagnostics,
  };
}

export function addDashboardCanvasV2Constraint(
  document: FrakonDashboardDocumentV2,
  input: Omit<LayoutConstraint, 'id'> & { id?: string },
): DashboardCanvasV2ConstraintEditResult {
  const invalid = validateRefs(document, input.sourceId, input.targetId);
  if (invalid) return invalidResult(document, invalid);
  const id = input.id?.trim() || nextConstraintId(document, input.sourceId, input.targetId, input.kind);
  if ((document.constraints ?? []).some((constraint) => constraint.id === id)) {
    return invalidResult(document, `Constraint ${id} already exists.`);
  }
  const constraint: LayoutConstraint = {
    id,
    kind: input.kind,
    sourceId: input.sourceId,
    targetId: input.targetId,
    gap: input.gap,
    priority: input.priority,
    enabled: input.enabled,
  };
  return solveCandidate(document, { ...document, constraints: [...(document.constraints ?? []), constraint] });
}

export function patchDashboardCanvasV2Constraint(
  document: FrakonDashboardDocumentV2,
  constraintId: string,
  patch: DashboardCanvasV2ConstraintPatch,
): DashboardCanvasV2ConstraintEditResult {
  const existing = (document.constraints ?? []).find((constraint) => constraint.id === constraintId);
  if (!existing) return invalidResult(document, `Missing constraint ${constraintId}.`);
  const sourceId = patch.sourceId ?? existing.sourceId;
  const targetId = patch.targetId ?? existing.targetId;
  const invalid = validateRefs(document, sourceId, targetId);
  if (invalid) return invalidResult(document, invalid);
  const next: LayoutConstraint = {
    ...existing,
    kind: patch.kind ?? existing.kind,
    sourceId,
    targetId,
    gap: patch.gap === null ? undefined : patch.gap ?? existing.gap,
    priority: patch.priority === null ? undefined : patch.priority ?? existing.priority,
    enabled: patch.enabled ?? existing.enabled,
  };
  return solveCandidate(document, {
    ...document,
    constraints: (document.constraints ?? []).map((constraint) => constraint.id === constraintId ? next : structuredClone(constraint)),
  });
}

export function removeDashboardCanvasV2Constraint(
  document: FrakonDashboardDocumentV2,
  constraintId: string,
): DashboardCanvasV2ConstraintEditResult {
  const constraints = (document.constraints ?? []).filter((constraint) => constraint.id !== constraintId);
  if (constraints.length === (document.constraints ?? []).length) {
    return invalidResult(document, `Missing constraint ${constraintId}.`);
  }
  return solveCandidate(document, { ...document, constraints });
}

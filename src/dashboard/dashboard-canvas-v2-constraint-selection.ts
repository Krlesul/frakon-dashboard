import type { SelectionState } from '../../packages/studio-engine/src/selection';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2ConstraintSelection {
  constraintId: string;
  selection: SelectionState;
}

export function selectDashboardCanvasV2Constraint(
  document: FrakonDashboardDocumentV2,
  constraintId: string,
): DashboardCanvasV2ConstraintSelection | undefined {
  const constraint = (document.constraints ?? []).find((candidate) => candidate.id === constraintId);
  if (!constraint) return undefined;
  if (!document.items.some((item) => item.id === constraint.sourceId)) return undefined;
  return {
    constraintId: constraint.id,
    selection: { ids: [constraint.sourceId], anchorId: constraint.sourceId },
  };
}

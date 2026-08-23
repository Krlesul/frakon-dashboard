import { solveConstraints, type ConstraintDiagnostic } from '../../packages/studio-engine/src/constraints';
import {
  normalizeDashboardV2,
  type FrakonDashboardDocumentV2,
} from './layout-model-v2';

export interface DashboardCanvasV2ConstraintResult {
  document: FrakonDashboardDocumentV2;
  diagnostics: ConstraintDiagnostic[];
}

export function applyDashboardCanvasV2Constraints(
  document: FrakonDashboardDocumentV2,
): DashboardCanvasV2ConstraintResult {
  if (!document.constraints?.length) {
    return { document: normalizeDashboardV2(document), diagnostics: [] };
  }

  const solved = solveConstraints(
    document.items.map((item) => ({ id: item.id, locked: item.locked, ...item.frame })),
    document.constraints,
  );
  const byId = new Map(solved.items.map((item) => [item.id, item]));
  return {
    document: normalizeDashboardV2({
      ...document,
      items: document.items.map((item) => {
        const solvedItem = byId.get(item.id);
        return solvedItem
          ? {
              ...item,
              frame: {
                x: solvedItem.x,
                y: solvedItem.y,
                width: solvedItem.width,
                height: solvedItem.height,
              },
            }
          : item;
      }),
    }),
    diagnostics: solved.diagnostics,
  };
}

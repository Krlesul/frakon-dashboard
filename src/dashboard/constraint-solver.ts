import {
  solveConstraints,
  type ConstraintDiagnostic,
  type ConstraintItem,
} from '../../packages/studio-engine/src/constraints';
import {
  normalizeDashboard,
  type FrakonDashboardDocument,
  type FrakonGridItem,
} from './layout-model';

export interface DashboardConstraintSolveResult {
  document: FrakonDashboardDocument;
  diagnostics: ConstraintDiagnostic[];
}

function toConstraintItem(item: FrakonGridItem): ConstraintItem {
  return {
    id: item.id,
    x: item.x,
    y: item.y,
    width: item.w,
    height: item.h,
    locked: item.locked,
  };
}

export function solveDashboardConstraints(
  document: FrakonDashboardDocument,
): DashboardConstraintSolveResult {
  const constraints = document.constraints ?? [];
  if (constraints.length === 0) {
    return {
      document: normalizeDashboard(document),
      diagnostics: [],
    };
  }

  const result = solveConstraints(document.items.map(toConstraintItem), constraints);
  const solvedById = new Map(result.items.map((item) => [item.id, item]));
  const solvedDocument = normalizeDashboard({
    ...document,
    items: document.items.map((item) => {
      const solved = solvedById.get(item.id);
      if (!solved || item.locked) return item;
      return {
        ...item,
        x: solved.x,
        y: solved.y,
        w: solved.width,
        h: solved.height,
      };
    }),
  });

  return {
    document: solvedDocument,
    diagnostics: result.diagnostics,
  };
}

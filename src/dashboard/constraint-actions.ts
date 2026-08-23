import type { LayoutConstraint } from '../../packages/studio-engine/src/constraints';
import { normalizeDashboard, type FrakonDashboardDocument } from './layout-model';

function normalizeConstraint(constraint: LayoutConstraint): LayoutConstraint {
  return {
    ...constraint,
    gap: constraint.gap === undefined ? undefined : Math.max(0, Number(constraint.gap) || 0),
    priority: constraint.priority === undefined ? undefined : Math.round(Number(constraint.priority) || 0),
    enabled: constraint.enabled !== false,
  };
}

export function addConstraint(
  document: FrakonDashboardDocument,
  constraint: LayoutConstraint,
): FrakonDashboardDocument {
  if (constraint.sourceId === constraint.targetId) {
    throw new Error('A layout constraint cannot target its own source item.');
  }
  if (document.constraints?.some((existing) => existing.id === constraint.id)) {
    throw new Error(`Duplicate layout constraint id: ${constraint.id}`);
  }
  return normalizeDashboard({
    ...document,
    constraints: [...(document.constraints ?? []), normalizeConstraint(constraint)],
  });
}

export function updateConstraint(
  document: FrakonDashboardDocument,
  id: string,
  patch: Partial<Omit<LayoutConstraint, 'id'>>,
): FrakonDashboardDocument {
  return normalizeDashboard({
    ...document,
    constraints: (document.constraints ?? []).map((constraint) => {
      if (constraint.id !== id) return constraint;
      const updated = normalizeConstraint({ ...constraint, ...patch, id });
      if (updated.sourceId === updated.targetId) {
        throw new Error('A layout constraint cannot target its own source item.');
      }
      return updated;
    }),
  });
}

export function removeConstraint(
  document: FrakonDashboardDocument,
  id: string,
): FrakonDashboardDocument {
  return {
    ...document,
    constraints: (document.constraints ?? []).filter((constraint) => constraint.id !== id),
  };
}

export function setConstraintEnabled(
  document: FrakonDashboardDocument,
  id: string,
  enabled: boolean,
): FrakonDashboardDocument {
  return updateConstraint(document, id, { enabled });
}

export function setConstraintPriority(
  document: FrakonDashboardDocument,
  id: string,
  priority: number,
): FrakonDashboardDocument {
  return updateConstraint(document, id, { priority });
}

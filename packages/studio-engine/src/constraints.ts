import type { TransformRect } from './resize';

export type ConstraintKind =
  | 'align-left'
  | 'align-center-x'
  | 'align-right'
  | 'align-top'
  | 'align-center-y'
  | 'align-bottom'
  | 'below'
  | 'right-of'
  | 'match-width'
  | 'match-height';

export interface ConstraintItem extends TransformRect {
  id: string;
  locked?: boolean;
}

export interface LayoutConstraint {
  id: string;
  kind: ConstraintKind;
  sourceId: string;
  targetId: string;
  gap?: number;
  priority?: number;
  enabled?: boolean;
}

export interface ConstraintDiagnostic {
  constraintId: string;
  status: 'applied' | 'skipped' | 'missing-item' | 'locked';
  message: string;
}

export interface ConstraintResult {
  items: ConstraintItem[];
  diagnostics: ConstraintDiagnostic[];
}

function applyConstraint(
  source: ConstraintItem,
  target: ConstraintItem,
  constraint: LayoutConstraint,
): ConstraintItem {
  const gap = constraint.gap ?? 0;
  switch (constraint.kind) {
    case 'align-left':
      return { ...source, x: target.x };
    case 'align-center-x':
      return { ...source, x: target.x + (target.width - source.width) / 2 };
    case 'align-right':
      return { ...source, x: target.x + target.width - source.width };
    case 'align-top':
      return { ...source, y: target.y };
    case 'align-center-y':
      return { ...source, y: target.y + (target.height - source.height) / 2 };
    case 'align-bottom':
      return { ...source, y: target.y + target.height - source.height };
    case 'below':
      return { ...source, y: target.y + target.height + gap };
    case 'right-of':
      return { ...source, x: target.x + target.width + gap };
    case 'match-width':
      return { ...source, width: target.width };
    case 'match-height':
      return { ...source, height: target.height };
  }
}

export function solveConstraints(
  items: ConstraintItem[],
  constraints: LayoutConstraint[],
): ConstraintResult {
  const byId = new Map(items.map((item) => [item.id, { ...item }]));
  const diagnostics: ConstraintDiagnostic[] = [];
  const ordered = constraints
    .filter((constraint) => constraint.enabled !== false)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id));

  for (const constraint of ordered) {
    const source = byId.get(constraint.sourceId);
    const target = byId.get(constraint.targetId);
    if (!source || !target) {
      diagnostics.push({
        constraintId: constraint.id,
        status: 'missing-item',
        message: `Constraint references missing item: ${!source ? constraint.sourceId : constraint.targetId}.`,
      });
      continue;
    }
    if (source.locked) {
      diagnostics.push({
        constraintId: constraint.id,
        status: 'locked',
        message: `Source item ${source.id} is locked.`,
      });
      continue;
    }

    byId.set(source.id, applyConstraint(source, target, constraint));
    diagnostics.push({
      constraintId: constraint.id,
      status: 'applied',
      message: `${constraint.kind} applied from ${source.id} to ${target.id}.`,
    });
  }

  return {
    items: items.map((item) => byId.get(item.id) ?? { ...item }),
    diagnostics,
  };
}

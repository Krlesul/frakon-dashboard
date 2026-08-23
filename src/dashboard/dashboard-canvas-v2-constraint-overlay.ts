import type { ConstraintKind, LayoutConstraint } from '../../packages/studio-engine/src/constraints';
import type { FrakonCanvasItem, FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2ConstraintOverlayLine {
  constraintId: string;
  kind: ConstraintKind;
  sourceId: string;
  targetId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
  label: string;
  enabled: boolean;
}

function center(item: FrakonCanvasItem): { x: number; y: number } {
  return {
    x: item.frame.x + item.frame.width / 2,
    y: item.frame.y + item.frame.height / 2,
  };
}

function label(constraint: LayoutConstraint): string {
  const gap = constraint.gap ?? 0;
  if (constraint.kind === 'below' || constraint.kind === 'right-of') {
    return `${constraint.kind} · ${gap}px`;
  }
  return constraint.kind;
}

export function dashboardCanvasV2ConstraintOverlay(
  document: FrakonDashboardDocumentV2,
  selectedIds: Iterable<string> = [],
): DashboardCanvasV2ConstraintOverlayLine[] {
  const selected = new Set(selectedIds);
  const byId = new Map(document.items.map((item) => [item.id, item]));
  return (document.constraints ?? []).flatMap((constraint) => {
    const source = byId.get(constraint.sourceId);
    const target = byId.get(constraint.targetId);
    if (!source || !target) return [];
    if (selected.size && !selected.has(source.id) && !selected.has(target.id)) return [];
    const from = center(source);
    const to = center(target);
    return [{
      constraintId: constraint.id,
      kind: constraint.kind,
      sourceId: source.id,
      targetId: target.id,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      labelX: (from.x + to.x) / 2,
      labelY: (from.y + to.y) / 2,
      label: label(constraint),
      enabled: constraint.enabled !== false,
    }];
  });
}

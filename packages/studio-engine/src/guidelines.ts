import type { TransformRect } from './resize';

export type GuidelineAxis = 'x' | 'y';
export type GuidelineKind = 'start' | 'center' | 'end' | 'spacing';

export interface Guideline {
  axis: GuidelineAxis;
  kind: GuidelineKind;
  position: number;
  sourceId?: string;
  targetId?: string;
  distance?: number;
}

export interface GuidelineItem extends TransformRect {
  id: string;
}

export interface GuidelineSnapResult {
  deltaX: number;
  deltaY: number;
  guidelines: Guideline[];
}

interface AxisAnchor {
  kind: Exclude<GuidelineKind, 'spacing'>;
  position: number;
}

function anchors(rect: TransformRect, axis: GuidelineAxis): AxisAnchor[] {
  const start = axis === 'x' ? rect.x : rect.y;
  const size = axis === 'x' ? rect.width : rect.height;
  return [
    { kind: 'start', position: start },
    { kind: 'center', position: start + size / 2 },
    { kind: 'end', position: start + size },
  ];
}

function perpendicularGap(a: TransformRect, b: TransformRect, axis: GuidelineAxis): number {
  const aStart = axis === 'x' ? a.y : a.x;
  const aSize = axis === 'x' ? a.height : a.width;
  const bStart = axis === 'x' ? b.y : b.x;
  const bSize = axis === 'x' ? b.height : b.width;
  const aEnd = aStart + aSize;
  const bEnd = bStart + bSize;
  if (aStart < bEnd && aEnd > bStart) return 0;
  return Math.max(bStart - aEnd, aStart - bEnd, 0);
}

function isPerpendicularlyRelevant(
  a: TransformRect,
  b: TransformRect,
  axis: GuidelineAxis,
  threshold: number,
): boolean {
  return perpendicularGap(a, b, axis) <= threshold;
}

function isAdjacentEdgePair(source: AxisAnchor, target: AxisAnchor): boolean {
  return (source.kind === 'end' && target.kind === 'start')
    || (source.kind === 'start' && target.kind === 'end');
}

function bestAxisSnap(
  moving: GuidelineItem[],
  stationary: GuidelineItem[],
  axis: GuidelineAxis,
  threshold: number,
): { delta: number; guidelines: Guideline[] } {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestDelta = 0;
  let bestGuidelines: Guideline[] = [];

  for (const source of moving) {
    for (const target of stationary) {
      if (!isPerpendicularlyRelevant(source, target, axis, threshold)) continue;

      for (const sourceAnchor of anchors(source, axis)) {
        for (const targetAnchor of anchors(target, axis)) {
          const delta = targetAnchor.position - sourceAnchor.position;
          const distance = Math.abs(delta);
          if (distance > threshold || distance > bestDistance) continue;

          const adjacent = isAdjacentEdgePair(sourceAnchor, targetAnchor);
          const guideline: Guideline = {
            axis,
            kind: adjacent ? 'spacing' : sourceAnchor.kind,
            position: targetAnchor.position,
            sourceId: source.id,
            targetId: target.id,
            distance: adjacent ? 0 : undefined,
          };

          if (distance < bestDistance) {
            bestDistance = distance;
            bestDelta = delta;
            bestGuidelines = [guideline];
          } else if (distance === bestDistance && delta === bestDelta) {
            bestGuidelines.push(guideline);
          }
        }
      }
    }
  }

  return { delta: bestDistance === Number.POSITIVE_INFINITY ? 0 : bestDelta, guidelines: bestGuidelines };
}

function spacingGuidelines(
  moving: GuidelineItem[],
  stationary: GuidelineItem[],
  axis: GuidelineAxis,
  threshold: number,
): { delta: number; guidelines: Guideline[] } | undefined {
  if (moving.length !== 1 || stationary.length < 2) return undefined;
  const source = moving[0];
  const startKey = axis === 'x' ? 'x' : 'y';
  const sizeKey = axis === 'x' ? 'width' : 'height';
  const ordered = [...stationary].sort((a, b) => a[startKey] - b[startKey]);

  let bestDistance = Number.POSITIVE_INFINITY;
  let result: { delta: number; guidelines: Guideline[] } | undefined;

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const first = ordered[index];
    const second = ordered[index + 1];
    if (!isPerpendicularlyRelevant(source, first, axis, threshold)
      || !isPerpendicularlyRelevant(source, second, axis, threshold)) continue;

    const gap = second[startKey] - (first[startKey] + first[sizeKey]);
    if (gap < 0) continue;

    const desiredStart = first[startKey] + first[sizeKey] + gap;
    const delta = desiredStart - source[startKey];
    const distance = Math.abs(delta);
    if (distance > threshold || distance >= bestDistance) continue;

    bestDistance = distance;
    result = {
      delta,
      guidelines: [{
        axis,
        kind: 'spacing',
        position: desiredStart,
        sourceId: source.id,
        targetId: `${first.id}:${second.id}`,
        distance: gap,
      }],
    };
  }

  return result;
}

export function computeSmartGuidelines(
  items: GuidelineItem[],
  movingIds: Iterable<string>,
  threshold = 8,
): GuidelineSnapResult {
  const selected = new Set(movingIds);
  const moving = items.filter((item) => selected.has(item.id));
  const stationary = items.filter((item) => !selected.has(item.id));
  if (moving.length === 0 || stationary.length === 0) {
    return { deltaX: 0, deltaY: 0, guidelines: [] };
  }

  const xSnap = bestAxisSnap(moving, stationary, 'x', threshold);
  const ySnap = bestAxisSnap(moving, stationary, 'y', threshold);
  const xSpacing = spacingGuidelines(moving, stationary, 'x', threshold);
  const ySpacing = spacingGuidelines(moving, stationary, 'y', threshold);

  const useXSpacing = xSpacing && Math.abs(xSpacing.delta) <= Math.abs(xSnap.delta || Number.POSITIVE_INFINITY);
  const useYSpacing = ySpacing && Math.abs(ySpacing.delta) <= Math.abs(ySnap.delta || Number.POSITIVE_INFINITY);

  const xResult = useXSpacing ? xSpacing : xSnap;
  const yResult = useYSpacing ? ySpacing : ySnap;

  return {
    deltaX: xResult?.delta ?? 0,
    deltaY: yResult?.delta ?? 0,
    guidelines: [
      ...(xResult?.guidelines ?? []),
      ...(yResult?.guidelines ?? []),
    ],
  };
}

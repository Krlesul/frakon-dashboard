import { computeSmartGuidelines, type Guideline, type GuidelineItem } from './guidelines';
import { collisionIds, moveItems, type MoveConstraints, type MoveDelta, type MoveItem } from './move';

export interface SmartMovePreview {
  items: MoveItem[];
  collisionIds: string[];
  hasCollisions: boolean;
  guidelines: Guideline[];
}

export interface SmartMoveOptions extends MoveConstraints {
  guidelineThreshold?: number;
}

/**
 * Computes a deterministic drag preview in three stages:
 * 1. coarse movement and optional grid snap,
 * 2. fine smart-guideline correction,
 * 3. collision detection on the corrected result.
 */
export function smartMovePreview(
  items: MoveItem[],
  selectedIds: Iterable<string>,
  delta: MoveDelta,
  options: SmartMoveOptions = {},
): SmartMovePreview {
  const selected = [...selectedIds];
  const coarse = moveItems(items, selected, delta, options);
  const guidelineItems: GuidelineItem[] = coarse.map((item) => ({
    id: item.id,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  }));
  const snap = computeSmartGuidelines(
    guidelineItems,
    selected,
    options.guidelineThreshold ?? 8,
  );
  const corrected = moveItems(
    coarse,
    selected,
    { x: snap.deltaX, y: snap.deltaY },
    {
      minX: options.minX,
      minY: options.minY,
    },
  );
  const collisions = collisionIds(corrected);
  return {
    items: corrected,
    collisionIds: collisions,
    hasCollisions: collisions.length > 0,
    guidelines: snap.guidelines,
  };
}

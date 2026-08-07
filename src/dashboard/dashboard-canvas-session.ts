import { collisionIds, moveItems } from '../../packages/studio-engine/src/move';
import { resizeRect, type ResizeHandle } from '../../packages/studio-engine/src/resize';
import {
  canvasPlacementToGridItem,
  canvasPlacementWithinBounds,
  projectDashboardGridToCanvas,
  type DashboardCanvasPlacement,
  type DashboardCanvasRect,
} from './dashboard-canvas-placement';
import type { FrakonDashboardDocument } from './layout-model';

export type DashboardCanvasInteraction =
  | { kind: 'move'; selectedIds: string[] }
  | { kind: 'resize'; itemId: string; handle: ResizeHandle };

export interface DashboardCanvasPoint { x: number; y: number }

export interface DashboardCanvasPreview {
  items: DashboardCanvasRect[];
  collisionIds: string[];
  hasCollisions: boolean;
}

export interface DashboardCanvasCommitResult {
  status: 'committed' | 'collision' | 'unchanged';
  document: FrakonDashboardDocument;
  collisionIds: string[];
}

function gridCollisionIds(document: FrakonDashboardDocument): string[] {
  return collisionIds(document.items.map((item) => ({
    id: item.id,
    x: item.x,
    y: item.y,
    width: item.w,
    height: item.h,
    locked: item.locked,
  })));
}

export class DashboardCanvasSession {
  private readonly projection;
  private latest?: DashboardCanvasPreview;

  constructor(
    private readonly source: FrakonDashboardDocument,
    private readonly interaction: DashboardCanvasInteraction,
    private readonly start: DashboardCanvasPoint,
    private readonly canvasWidth: number,
  ) {
    this.projection = projectDashboardGridToCanvas(source, canvasWidth);
  }

  preview(current: DashboardCanvasPoint): DashboardCanvasPreview {
    const delta = { x: current.x - this.start.x, y: current.y - this.start.y };
    let items: DashboardCanvasRect[];

    if (this.interaction.kind === 'move') {
      const moved = moveItems(
        this.projection.items,
        this.interaction.selectedIds,
        delta,
        { minX: 0, minY: 0 },
      );
      items = moved.map((item) => {
        const bounded = canvasPlacementWithinBounds(
          { x: item.x, y: item.y, width: item.width, height: item.height },
          this.canvasWidth,
        );
        return { ...item, ...bounded };
      });
    } else {
      const target = this.projection.items.find((item) => item.id === this.interaction.itemId);
      if (!target || target.locked) {
        items = this.projection.items.map((item) => ({ ...item }));
      } else {
        const resized = resizeRect(target, this.interaction.handle, delta, {
          minWidth: 24,
          minHeight: 24,
          maxWidth: this.canvasWidth,
        });
        const bounded = canvasPlacementWithinBounds(resized, this.canvasWidth);
        items = this.projection.items.map((item) => item.id === target.id ? { ...item, ...bounded } : { ...item });
      }
    }

    const collisions = collisionIds(items);
    this.latest = { items, collisionIds: collisions, hasCollisions: collisions.length > 0 };
    return this.latest;
  }

  commit(current: DashboardCanvasPoint): DashboardCanvasCommitResult {
    const preview = this.preview(current);
    if (preview.hasCollisions) {
      return { status: 'collision', document: structuredClone(this.source), collisionIds: [...preview.collisionIds] };
    }

    const byId = new Map(preview.items.map((item) => [item.id, item]));
    const items = this.source.items.map((item) => {
      const placement = byId.get(item.id);
      if (!placement || item.locked) return { ...item };
      return canvasPlacementToGridItem(
        item,
        placement as DashboardCanvasPlacement,
        this.source,
        this.canvasWidth,
      );
    });
    const projectedDocument = { ...this.source, items };
    const projectedCollisions = gridCollisionIds(projectedDocument);
    if (projectedCollisions.length) {
      return {
        status: 'collision',
        document: structuredClone(this.source),
        collisionIds: projectedCollisions,
      };
    }

    const unchanged = items.every((item, index) => {
      const source = this.source.items[index];
      return source && item.x === source.x && item.y === source.y && item.w === source.w && item.h === source.h;
    });

    return {
      status: unchanged ? 'unchanged' : 'committed',
      document: projectedDocument,
      collisionIds: [],
    };
  }

  cancel(): FrakonDashboardDocument {
    return structuredClone(this.source);
  }
}

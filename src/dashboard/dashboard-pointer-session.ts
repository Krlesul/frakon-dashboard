import type { ResizeHandle } from '../../packages/studio-engine/src/resize';
import type { FrakonDashboardDocument } from './layout-model';
import { applyDashboardConstraintsToPointerPreview } from './dashboard-pointer-constraints';
import {
  previewDashboardPointerMove,
  previewDashboardPointerResize,
  type DashboardPointerDelta,
  type DashboardPointerPreview,
} from './dashboard-pointer-grid';

export interface DashboardPointerPoint {
  x: number;
  y: number;
}

export type DashboardPointerInteraction =
  | { kind: 'move'; selectedIds: string[] }
  | { kind: 'resize'; itemId: string; handle: ResizeHandle };

export interface DashboardPointerCommitResult {
  status: 'committed' | 'collision' | 'unchanged';
  document: FrakonDashboardDocument;
  collisionIds: string[];
}

export class DashboardPointerSession {
  private latest?: DashboardPointerPreview;

  constructor(
    private readonly source: FrakonDashboardDocument,
    private readonly interaction: DashboardPointerInteraction,
    private readonly start: DashboardPointerPoint,
    private readonly containerWidth: number,
  ) {}

  preview(current: DashboardPointerPoint): DashboardPointerPreview {
    const delta: DashboardPointerDelta = {
      x: current.x - this.start.x,
      y: current.y - this.start.y,
    };
    const manual = this.interaction.kind === 'move'
      ? previewDashboardPointerMove(this.source, this.interaction.selectedIds, delta, this.containerWidth)
      : previewDashboardPointerResize(this.source, this.interaction.itemId, this.interaction.handle, delta, this.containerWidth);
    this.latest = applyDashboardConstraintsToPointerPreview(this.source, manual);
    return this.latest;
  }

  commit(current: DashboardPointerPoint): DashboardPointerCommitResult {
    const preview = this.preview(current);
    if (preview.hasCollisions) {
      return {
        status: 'collision',
        document: structuredClone(this.source),
        collisionIds: [...preview.collisionIds],
      };
    }
    const unchanged = this.source.items.every((item, index) => {
      const next = preview.items[index];
      return next && item.id === next.id && item.x === next.x && item.y === next.y && item.w === next.w && item.h === next.h;
    });
    return {
      status: unchanged ? 'unchanged' : 'committed',
      document: { ...this.source, items: preview.items.map((item) => ({ ...item })) },
      collisionIds: [],
    };
  }

  cancel(): FrakonDashboardDocument {
    return structuredClone(this.source);
  }
}

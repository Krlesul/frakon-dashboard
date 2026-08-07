import { resizeRect, type ResizeHandle } from '../../packages/studio-engine/src/resize';
import {
  normalizeDashboardV2,
  type FrakonCanvasFrame,
  type FrakonCanvasItem,
  type FrakonDashboardDocumentV2,
} from './layout-model-v2';

export type DashboardCanvasV2Interaction =
  | { kind: 'move'; selectedIds: string[] }
  | { kind: 'resize'; itemId: string; handle: ResizeHandle };

export interface DashboardCanvasV2Point { x: number; y: number }

export interface DashboardCanvasV2Preview {
  document: FrakonDashboardDocumentV2;
  collisionIds: string[];
  hasCollisions: boolean;
}

export interface DashboardCanvasV2CommitResult {
  status: 'committed' | 'collision' | 'unchanged';
  document: FrakonDashboardDocumentV2;
  collisionIds: string[];
}

function overlap(a: FrakonCanvasFrame, b: FrakonCanvasFrame): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

export function canvasV2CollisionIds(items: FrakonCanvasItem[]): string[] {
  const ids = new Set<string>();
  for (let index = 0; index < items.length; index += 1) {
    for (let other = index + 1; other < items.length; other += 1) {
      if (overlap(items[index].frame, items[other].frame)) {
        ids.add(items[index].id);
        ids.add(items[other].id);
      }
    }
  }
  return [...ids];
}

function snap(value: number, size: number, enabled: boolean): number {
  return enabled ? Math.round(value / size) * size : value;
}

function sameGeometry(left: FrakonDashboardDocumentV2, right: FrakonDashboardDocumentV2): boolean {
  if (left.items.length !== right.items.length) return false;
  const rightById = new Map(right.items.map((item) => [item.id, item]));
  return left.items.every((item) => {
    const candidate = rightById.get(item.id);
    return candidate
      && item.frame.x === candidate.frame.x
      && item.frame.y === candidate.frame.y
      && item.frame.width === candidate.frame.width
      && item.frame.height === candidate.frame.height;
  });
}

function sourceBounds(items: FrakonCanvasItem[]): FrakonCanvasFrame | undefined {
  if (!items.length) return undefined;
  const left = Math.min(...items.map((item) => item.frame.x));
  const top = Math.min(...items.map((item) => item.frame.y));
  const right = Math.max(...items.map((item) => item.frame.x + item.frame.width));
  const bottom = Math.max(...items.map((item) => item.frame.y + item.frame.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export class DashboardCanvasV2Session {
  private readonly source: FrakonDashboardDocumentV2;

  constructor(
    source: FrakonDashboardDocumentV2,
    private readonly interaction: DashboardCanvasV2Interaction,
    private readonly start: DashboardCanvasV2Point,
  ) {
    this.source = normalizeDashboardV2(source);
  }

  preview(current: DashboardCanvasV2Point): DashboardCanvasV2Preview {
    const rawDelta = { x: current.x - this.start.x, y: current.y - this.start.y };
    const snapEnabled = this.source.layout.snap.enabled;
    const snapSize = this.source.layout.snap.size;
    const delta = {
      x: snap(rawDelta.x, snapSize, snapEnabled),
      y: snap(rawDelta.y, snapSize, snapEnabled),
    };

    let items: FrakonCanvasItem[];
    if (this.interaction.kind === 'move') {
      const selected = new Set(this.interaction.selectedIds);
      const movable = this.source.items.filter((item) => selected.has(item.id) && !item.locked);
      const bounds = sourceBounds(movable);
      if (!bounds) {
        items = this.source.items.map((item) => structuredClone(item));
      } else {
        const minDx = -bounds.x;
        const maxDx = this.source.layout.width - (bounds.x + bounds.width);
        const minDy = -bounds.y;
        const dx = Math.min(maxDx, Math.max(minDx, delta.x));
        const dy = Math.max(minDy, delta.y);
        items = this.source.items.map((item) => selected.has(item.id) && !item.locked
          ? { ...structuredClone(item), frame: { ...item.frame, x: item.frame.x + dx, y: item.frame.y + dy } }
          : structuredClone(item));
      }
    } else {
      const targetId = this.interaction.itemId;
      items = this.source.items.map((item) => {
        if (item.id !== targetId || item.locked) return structuredClone(item);
        const resized = resizeRect(item.frame, this.interaction.handle, delta, {
          minWidth: item.minWidth,
          minHeight: item.minHeight,
          maxWidth: Math.min(this.source.layout.width, item.maxWidth ?? this.source.layout.width),
          maxHeight: item.maxHeight,
        });
        const width = Math.min(this.source.layout.width, resized.width);
        const x = Math.max(0, Math.min(this.source.layout.width - width, resized.x));
        const y = Math.max(0, resized.y);
        return {
          ...structuredClone(item),
          frame: {
            x: snap(x, snapSize, snapEnabled),
            y: snap(y, snapSize, snapEnabled),
            width: Math.max(1, snap(width, snapSize, snapEnabled)),
            height: Math.max(1, snap(resized.height, snapSize, snapEnabled)),
          },
        };
      });
    }

    const normalized = normalizeDashboardV2({ ...this.source, items });
    const collisionIds = canvasV2CollisionIds(normalized.items);
    return {
      document: normalized,
      collisionIds,
      hasCollisions: collisionIds.length > 0,
    };
  }

  commit(current: DashboardCanvasV2Point): DashboardCanvasV2CommitResult {
    const preview = this.preview(current);
    if (preview.hasCollisions) {
      return {
        status: 'collision',
        document: structuredClone(this.source),
        collisionIds: preview.collisionIds,
      };
    }

    const bottom = Math.max(
      this.source.layout.minHeight,
      ...preview.document.items.map((item) => item.frame.y + item.frame.height),
    );
    const document = normalizeDashboardV2({
      ...preview.document,
      layout: { ...preview.document.layout, minHeight: bottom },
    });
    return {
      status: sameGeometry(this.source, document) ? 'unchanged' : 'committed',
      document,
      collisionIds: [],
    };
  }

  cancel(): FrakonDashboardDocumentV2 {
    return structuredClone(this.source);
  }
}

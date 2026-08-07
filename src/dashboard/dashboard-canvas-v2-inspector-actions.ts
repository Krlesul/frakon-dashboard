import { canvasV2CollisionIds } from './dashboard-canvas-v2-session';
import { normalizeDashboardV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';

export interface DashboardCanvasV2InspectorItemPatch {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minWidth?: number | null;
  minHeight?: number | null;
  maxWidth?: number | null;
  maxHeight?: number | null;
  locked?: boolean;
}

export interface DashboardCanvasV2InspectorEditResult {
  status: 'committed' | 'collision' | 'unchanged' | 'missing-item';
  document: FrakonDashboardDocumentV2;
  collisionIds: string[];
}

function sameDocument(left: FrakonDashboardDocumentV2, right: FrakonDashboardDocumentV2): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function optionalLimit(value: number | null | undefined, current: number | undefined): number | undefined {
  if (value === undefined) return current;
  if (value === null) return undefined;
  return Number.isFinite(value) ? Math.max(1, value) : current;
}

export function patchDashboardCanvasV2Item(
  document: FrakonDashboardDocumentV2,
  itemId: string,
  patch: DashboardCanvasV2InspectorItemPatch,
): DashboardCanvasV2InspectorEditResult {
  if (!document.items.some((item) => item.id === itemId)) {
    return { status: 'missing-item', document: structuredClone(document), collisionIds: [] };
  }

  const candidate = normalizeDashboardV2({
    ...document,
    items: document.items.map((item) => item.id === itemId
      ? {
          ...structuredClone(item),
          locked: patch.locked ?? item.locked,
          minWidth: optionalLimit(patch.minWidth, item.minWidth),
          minHeight: optionalLimit(patch.minHeight, item.minHeight),
          maxWidth: optionalLimit(patch.maxWidth, item.maxWidth),
          maxHeight: optionalLimit(patch.maxHeight, item.maxHeight),
          frame: {
            x: patch.x ?? item.frame.x,
            y: patch.y ?? item.frame.y,
            width: patch.width ?? item.frame.width,
            height: patch.height ?? item.frame.height,
          },
        }
      : structuredClone(item)),
  });

  const collisionIds = canvasV2CollisionIds(candidate.items);
  if (collisionIds.length) {
    return { status: 'collision', document: structuredClone(document), collisionIds };
  }
  return {
    status: sameDocument(document, candidate) ? 'unchanged' : 'committed',
    document: candidate,
    collisionIds: [],
  };
}

export function patchDashboardCanvasV2Snap(
  document: FrakonDashboardDocumentV2,
  patch: { enabled?: boolean; size?: number },
): DashboardCanvasV2InspectorEditResult {
  const candidate = normalizeDashboardV2({
    ...document,
    layout: {
      ...document.layout,
      snap: {
        enabled: patch.enabled ?? document.layout.snap.enabled,
        size: patch.size ?? document.layout.snap.size,
      },
    },
  });
  return {
    status: sameDocument(document, candidate) ? 'unchanged' : 'committed',
    document: candidate,
    collisionIds: [],
  };
}

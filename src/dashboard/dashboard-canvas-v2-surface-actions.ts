import { normalizeSurfaceStyle, type SurfaceStyle } from '../../packages/design-system/src/surface-style';
import { normalizeDashboardV2, type FrakonDashboardDocumentV2 } from './layout-model-v2';

export type DashboardCanvasV2SurfaceTarget =
  | { kind: 'dashboard' }
  | { kind: 'card-defaults' }
  | { kind: 'items'; ids: Iterable<string> };

export interface DashboardCanvasV2SurfaceActionResult {
  status: 'committed' | 'unchanged' | 'invalid';
  document: FrakonDashboardDocumentV2;
  reason?: string;
}

function same(a: FrakonDashboardDocumentV2, b: FrakonDashboardDocumentV2): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function applyDashboardCanvasV2SurfaceStyle(
  document: FrakonDashboardDocumentV2,
  target: DashboardCanvasV2SurfaceTarget,
  style: SurfaceStyle,
): DashboardCanvasV2SurfaceActionResult {
  const normalized = normalizeSurfaceStyle(style);
  let candidate: FrakonDashboardDocumentV2;
  if (target.kind === 'dashboard') {
    candidate = normalizeDashboardV2({ ...document, surface: normalized });
  } else if (target.kind === 'card-defaults') {
    candidate = normalizeDashboardV2({ ...document, cardSurface: normalized });
  } else {
    const selected = new Set(target.ids);
    if (!selected.size) return { status: 'invalid', document: structuredClone(document), reason: 'At least one item must be selected.' };
    candidate = normalizeDashboardV2({
      ...document,
      items: document.items.map((item) => selected.has(item.id) && !item.locked
        ? { ...structuredClone(item), surface: structuredClone(normalized) }
        : structuredClone(item)),
    });
  }
  return { status: same(document, candidate) ? 'unchanged' : 'committed', document: candidate };
}

export function clearDashboardCanvasV2SurfaceStyle(
  document: FrakonDashboardDocumentV2,
  target: DashboardCanvasV2SurfaceTarget,
): DashboardCanvasV2SurfaceActionResult {
  const candidate = structuredClone(document);
  if (target.kind === 'dashboard') delete candidate.surface;
  else if (target.kind === 'card-defaults') delete candidate.cardSurface;
  else {
    const selected = new Set(target.ids);
    if (!selected.size) return { status: 'invalid', document: structuredClone(document), reason: 'At least one item must be selected.' };
    candidate.items = candidate.items.map((item) => {
      if (!selected.has(item.id) || item.locked) return item;
      const next = { ...item };
      delete next.surface;
      return next;
    });
  }
  const normalized = normalizeDashboardV2(candidate);
  return { status: same(document, normalized) ? 'unchanged' : 'committed', document: normalized };
}

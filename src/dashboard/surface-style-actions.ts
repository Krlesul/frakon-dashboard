import { normalizeSurfaceStyle, type SurfaceStyle } from '../../packages/design-system/src/surface-style';
import type { FrakonDashboardDocument } from './layout-model';

export type DashboardSurfaceTarget =
  | { kind: 'dashboard' }
  | { kind: 'card-defaults' }
  | { kind: 'items'; ids: string[] };

export function applyDashboardSurfaceStyle(
  document: FrakonDashboardDocument,
  style: SurfaceStyle,
): FrakonDashboardDocument {
  return {
    ...document,
    surface: normalizeSurfaceStyle(style),
  };
}

export function applyDefaultCardSurfaceStyle(
  document: FrakonDashboardDocument,
  style: SurfaceStyle,
): FrakonDashboardDocument {
  return {
    ...document,
    cardSurface: normalizeSurfaceStyle(style),
  };
}

export function applyItemSurfaceStyle(
  document: FrakonDashboardDocument,
  ids: Iterable<string>,
  style: SurfaceStyle,
  options: { includeLocked?: boolean } = {},
): FrakonDashboardDocument {
  const selected = new Set(ids);
  if (selected.size === 0) return document;
  const normalized = normalizeSurfaceStyle(style);
  return {
    ...document,
    items: document.items.map((item) => {
      if (!selected.has(item.id)) return item;
      if (item.locked && options.includeLocked !== true) return item;
      return { ...item, surface: structuredClone(normalized) };
    }),
  };
}

export function clearItemSurfaceStyle(
  document: FrakonDashboardDocument,
  ids: Iterable<string>,
  options: { includeLocked?: boolean } = {},
): FrakonDashboardDocument {
  const selected = new Set(ids);
  if (selected.size === 0) return document;
  return {
    ...document,
    items: document.items.map((item) => {
      if (!selected.has(item.id)) return item;
      if (item.locked && options.includeLocked !== true) return item;
      const { surface: _surface, ...rest } = item;
      return rest;
    }),
  };
}

export function applySurfaceStyleToTarget(
  document: FrakonDashboardDocument,
  target: DashboardSurfaceTarget,
  style: SurfaceStyle,
): FrakonDashboardDocument {
  if (target.kind === 'dashboard') return applyDashboardSurfaceStyle(document, style);
  if (target.kind === 'card-defaults') return applyDefaultCardSurfaceStyle(document, style);
  return applyItemSurfaceStyle(document, target.ids, style);
}

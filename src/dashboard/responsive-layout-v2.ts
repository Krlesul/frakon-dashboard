import type { FrakonBreakpoint } from './layout-model';
import { normalizeDashboardV2, type FrakonCanvasItem, type FrakonDashboardDocumentV2 } from './layout-model-v2';
import { canvasV2CollisionIds } from './dashboard-canvas-v2-session';

export type ResponsiveCanvasV2Widths = Record<FrakonBreakpoint, number>;
export type ResponsiveCanvasV2Documents = Partial<Record<FrakonBreakpoint, FrakonDashboardDocumentV2>>;

export const defaultResponsiveCanvasV2Widths: ResponsiveCanvasV2Widths = {
  mobile: 390,
  tablet: 834,
  desktop: 1280,
  wide: 1680,
};

export interface ResponsiveCanvasV2DeriveResult {
  document: FrakonDashboardDocumentV2;
  collisionIds: string[];
}

function scaleOptional(value: number | undefined, scale: number): number | undefined {
  return value === undefined ? undefined : Math.max(1, value * scale);
}

function scaleItemHorizontally(item: FrakonCanvasItem, scale: number): FrakonCanvasItem {
  return {
    ...structuredClone(item),
    frame: {
      x: item.frame.x * scale,
      y: item.frame.y,
      width: item.frame.width * scale,
      height: item.frame.height,
    },
    minWidth: scaleOptional(item.minWidth, scale),
    maxWidth: scaleOptional(item.maxWidth, scale),
  };
}

export function deriveDashboardCanvasV2Breakpoint(
  source: FrakonDashboardDocumentV2,
  breakpoint: FrakonBreakpoint,
  widths: ResponsiveCanvasV2Widths = defaultResponsiveCanvasV2Widths,
): ResponsiveCanvasV2DeriveResult {
  const targetWidth = Math.max(1, widths[breakpoint]);
  const scale = targetWidth / Math.max(1, source.layout.width);
  const document = normalizeDashboardV2({
    ...structuredClone(source),
    breakpoint,
    layout: {
      ...structuredClone(source.layout),
      width: targetWidth,
    },
    items: source.items.map((item) => scaleItemHorizontally(item, scale)),
  });
  return { document, collisionIds: canvasV2CollisionIds(document.items) };
}

export function createResponsiveCanvasV2Documents(
  source: FrakonDashboardDocumentV2,
  widths: ResponsiveCanvasV2Widths = defaultResponsiveCanvasV2Widths,
): ResponsiveCanvasV2Documents {
  const breakpoints: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];
  return Object.fromEntries(
    breakpoints.map((breakpoint) => [breakpoint, deriveDashboardCanvasV2Breakpoint(source, breakpoint, widths).document]),
  ) as ResponsiveCanvasV2Documents;
}

function deriveMissingItem(
  sourceItem: FrakonCanvasItem,
  sourceWidth: number,
  targetWidth: number,
): FrakonCanvasItem {
  return scaleItemHorizontally(sourceItem, targetWidth / Math.max(1, sourceWidth));
}

export function synchronizeResponsiveCanvasV2SharedState(
  documents: ResponsiveCanvasV2Documents,
  sourceBreakpoint: FrakonBreakpoint,
): ResponsiveCanvasV2Documents {
  const source = documents[sourceBreakpoint];
  if (!source) return structuredClone(documents);
  const sourceIds = new Set(source.items.map((item) => item.id));

  const result: ResponsiveCanvasV2Documents = {};
  for (const breakpoint of ['mobile', 'tablet', 'desktop', 'wide'] as FrakonBreakpoint[]) {
    const target = documents[breakpoint];
    if (!target) continue;
    if (breakpoint === sourceBreakpoint) {
      result[breakpoint] = structuredClone(source);
      continue;
    }

    const targetById = new Map(target.items.map((item) => [item.id, item]));
    const items = source.items.map((sourceItem) => {
      const existing = targetById.get(sourceItem.id);
      if (!existing) return deriveMissingItem(sourceItem, source.layout.width, target.layout.width);
      return {
        ...structuredClone(existing),
        card: structuredClone(sourceItem.card),
        locked: sourceItem.locked,
        surface: sourceItem.surface ? structuredClone(sourceItem.surface) : undefined,
      };
    });

    result[breakpoint] = normalizeDashboardV2({
      ...structuredClone(target),
      id: source.id,
      title: source.title,
      surface: source.surface ? structuredClone(source.surface) : undefined,
      cardSurface: source.cardSurface ? structuredClone(source.cardSurface) : undefined,
      constraints: source.constraints?.filter(
        (constraint) => sourceIds.has(constraint.sourceId) && sourceIds.has(constraint.targetId),
      ).map((constraint) => structuredClone(constraint)),
      items,
    });
  }
  return result;
}

export function resolveResponsiveCanvasV2Document(
  documents: ResponsiveCanvasV2Documents,
  breakpoint: FrakonBreakpoint,
): FrakonDashboardDocumentV2 | undefined {
  const exact = documents[breakpoint];
  if (exact) return structuredClone(exact);
  const fallbackOrder: FrakonBreakpoint[] = breakpoint === 'mobile'
    ? ['tablet', 'desktop', 'wide']
    : breakpoint === 'tablet'
      ? ['desktop', 'mobile', 'wide']
      : breakpoint === 'desktop'
        ? ['wide', 'tablet', 'mobile']
        : ['desktop', 'tablet', 'mobile'];
  const fallback = fallbackOrder.map((candidate) => documents[candidate]).find(Boolean);
  if (!fallback) return undefined;
  return deriveDashboardCanvasV2Breakpoint(fallback, breakpoint).document;
}

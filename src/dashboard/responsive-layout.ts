import type { FrakonBreakpoint, FrakonDashboardDocument } from './layout-model';

export interface ResponsiveColumns {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

export const defaultResponsiveColumns: ResponsiveColumns = {
  mobile: 4,
  tablet: 8,
  desktop: 12,
  wide: 16,
};

export function detectBreakpoint(width: number): FrakonBreakpoint {
  if (width < 600) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1600) return 'desktop';
  return 'wide';
}

export function documentForBreakpoint(
  document: FrakonDashboardDocument,
  breakpoint: FrakonBreakpoint,
  columns: ResponsiveColumns = defaultResponsiveColumns,
): FrakonDashboardDocument {
  const nextColumns = Math.max(1, Math.round(columns[breakpoint]));
  const scale = nextColumns / Math.max(1, document.columns);
  return {
    ...document,
    breakpoint,
    columns: nextColumns,
    items: document.items.map((item) => ({
      ...item,
      x: Math.max(0, Math.round(item.x * scale)),
      w: Math.max(1, Math.round(item.w * scale)),
    })),
  };
}

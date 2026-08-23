export type FrakonBreakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export interface FrakonGridSize {
  columns: number;
  rows: number;
  minColumns?: number;
  maxColumns?: number;
  minRows?: number;
  maxRows?: number;
}

export type ResponsiveGridConfig = Partial<Record<FrakonBreakpoint, FrakonGridSize>>;

export const defaultCardGrid: Required<ResponsiveGridConfig> = {
  mobile: { columns: 4, rows: 3, minColumns: 2, maxColumns: 4, minRows: 2, maxRows: 8 },
  tablet: { columns: 4, rows: 3, minColumns: 2, maxColumns: 8, minRows: 2, maxRows: 8 },
  desktop: { columns: 3, rows: 3, minColumns: 2, maxColumns: 8, minRows: 2, maxRows: 8 },
  wide: { columns: 3, rows: 3, minColumns: 2, maxColumns: 10, minRows: 2, maxRows: 10 },
};

export function resolveBreakpoint(width: number): FrakonBreakpoint {
  if (width < 600) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1600) return 'desktop';
  return 'wide';
}

export function resolveGridSize(config: ResponsiveGridConfig | undefined, width: number): FrakonGridSize {
  const breakpoint = resolveBreakpoint(width);
  return config?.[breakpoint] ?? defaultCardGrid[breakpoint];
}

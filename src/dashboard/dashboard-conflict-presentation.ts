import type { DashboardMergeConflict } from './dashboard-conflict-resolver';

export interface DashboardConflictPresentation {
  label: string;
  localSummary: string;
  remoteSummary: string;
}

export function presentDashboardConflict(conflict: DashboardMergeConflict): DashboardConflictPresentation {
  return {
    label: conflictLabel(conflict.path),
    localSummary: summarizeConflictValue(conflict.local),
    remoteSummary: summarizeConflictValue(conflict.remote),
  };
}

export function conflictLabel(path: string): string {
  if (path === 'title') return 'Dashboard title';
  if (path === 'breakpoint') return 'Responsive breakpoint';
  if (path === 'columns') return 'Grid columns';
  if (path === 'rowHeight') return 'Grid row height';
  if (path === 'gap') return 'Card spacing';
  if (path === 'surface') return 'Dashboard appearance';
  if (path === 'cardSurface') return 'Default card appearance';
  if (path === 'constraints') return 'Layout rules';
  if (path.startsWith('items.')) return `Card · ${path.slice('items.'.length)}`;
  return path;
}

export function summarizeConflictValue(value: unknown): string {
  if (value === undefined) return 'Removed';
  if (value === null) return 'None';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (isGridItem(value)) return `${value.x}, ${value.y} · ${value.w} × ${value.h}`;
  if (typeof value === 'object') return `${Object.keys(value as Record<string, unknown>).length} changed properties`;
  return String(value);
}

function isGridItem(value: unknown): value is { x: number; y: number; w: number; h: number } {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return ['x', 'y', 'w', 'h'].every((key) => typeof candidate[key] === 'number');
}

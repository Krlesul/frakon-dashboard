import { selectByMarquee, type SelectionRect, type SelectionState } from '../../packages/studio-engine/src/selection';
import { dashboardGridMetrics } from './dashboard-pointer-grid';
import type { FrakonDashboardDocument } from './layout-model';

export interface DashboardMarqueeOptions {
  additive?: boolean;
  current?: SelectionState;
  mode?: 'intersect' | 'contain';
}

export function selectDashboardCardsByMarquee(
  document: FrakonDashboardDocument,
  marquee: SelectionRect,
  containerWidth: number,
  options: DashboardMarqueeOptions = {},
): SelectionState {
  const metrics = dashboardGridMetrics(containerWidth, document.columns, document.rowHeight, document.gap);
  const columnWidth = Math.max(1, metrics.columnStep - document.gap);
  const rowHeight = Math.max(1, metrics.rowStep - document.gap);
  const items = document.items.map((item) => ({
    id: item.id,
    x: item.x * metrics.columnStep,
    y: item.y * metrics.rowStep,
    width: Math.max(1, item.w * columnWidth + Math.max(0, item.w - 1) * document.gap),
    height: Math.max(1, item.h * rowHeight + Math.max(0, item.h - 1) * document.gap),
    selectable: true,
  }));
  return selectByMarquee(items, marquee, {
    mode: options.mode ?? 'intersect',
    additive: options.additive,
    current: options.current,
  });
}

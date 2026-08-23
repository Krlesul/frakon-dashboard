import { normalizeViewport, type ViewportTransform } from '../../packages/studio-engine/src/viewport';

export interface DashboardCanvasV2ViewportStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function dashboardCanvasV2ViewportMemoryKey(dashboardId: string, breakpoint: string): string {
  return `frakon.canvas-v2.viewport:${dashboardId}:${breakpoint}`;
}

export function loadDashboardCanvasV2Viewport(
  storage: DashboardCanvasV2ViewportStorage,
  dashboardId: string,
  breakpoint: string,
): ViewportTransform | undefined {
  try {
    const raw = storage.getItem(dashboardCanvasV2ViewportMemoryKey(dashboardId, breakpoint));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<ViewportTransform>;
    if (![parsed.x, parsed.y, parsed.zoom].every(Number.isFinite)) return undefined;
    return normalizeViewport({ x: parsed.x!, y: parsed.y!, zoom: parsed.zoom! });
  } catch {
    return undefined;
  }
}

export function saveDashboardCanvasV2Viewport(
  storage: DashboardCanvasV2ViewportStorage,
  dashboardId: string,
  breakpoint: string,
  viewport: ViewportTransform,
): void {
  try {
    storage.setItem(dashboardCanvasV2ViewportMemoryKey(dashboardId, breakpoint), JSON.stringify(normalizeViewport(viewport)));
  } catch {
    // Per-device viewport state is best-effort and must never block dashboard editing.
  }
}

export function clearDashboardCanvasV2Viewport(
  storage: DashboardCanvasV2ViewportStorage,
  dashboardId: string,
  breakpoint: string,
): void {
  try {
    storage.removeItem(dashboardCanvasV2ViewportMemoryKey(dashboardId, breakpoint));
  } catch {
    // Best-effort local preference cleanup.
  }
}

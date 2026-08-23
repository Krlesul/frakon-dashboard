export interface DashboardCanvasV2WheelZoomInput {
  deltaY: number;
  ctrlKey: boolean;
  metaKey: boolean;
  currentZoom: number;
}

export function dashboardCanvasV2WheelZoom(input: DashboardCanvasV2WheelZoomInput): number | undefined {
  if (!input.ctrlKey && !input.metaKey) return undefined;
  const direction = input.deltaY > 0 ? -1 : input.deltaY < 0 ? 1 : 0;
  if (!direction) return undefined;
  const factor = direction > 0 ? 1.1 : 1 / 1.1;
  return Math.min(4, Math.max(0.25, input.currentZoom * factor));
}

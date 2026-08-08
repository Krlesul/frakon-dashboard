export type DashboardCanvasV2ViewportShortcut =
  | { kind: 'fit' }
  | { kind: 'reset' };

export function dashboardCanvasV2ViewportShortcut(event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>): DashboardCanvasV2ViewportShortcut | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return undefined;
  if (event.key === '0' || event.code === 'Digit0') return { kind: 'fit' };
  if (event.key === '1' || event.code === 'Digit1') return { kind: 'reset' };
  return undefined;
}

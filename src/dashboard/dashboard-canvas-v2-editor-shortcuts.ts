import type { DashboardCanvasV2ItemAction } from './dashboard-canvas-v2-item-actions';
import type { DashboardCanvasV2LayerAction } from './dashboard-canvas-v2-layer-actions';

export type DashboardCanvasV2EditorShortcut =
  | { kind: 'item'; action: DashboardCanvasV2ItemAction }
  | { kind: 'layer'; action: DashboardCanvasV2LayerAction };

export interface DashboardCanvasV2ShortcutInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

export function dashboardCanvasV2EditorShortcut(input: DashboardCanvasV2ShortcutInput): DashboardCanvasV2EditorShortcut | undefined {
  const mod = input.ctrlKey === true || input.metaKey === true;
  const key = input.key.toLowerCase();
  if (!mod && (key === 'delete' || key === 'backspace')) return { kind: 'item', action: 'delete' };
  if (mod && key === 'd') return { kind: 'item', action: 'duplicate' };
  if (mod && input.key === ']') return { kind: 'layer', action: input.shiftKey ? 'bring-front' : 'bring-forward' };
  if (mod && input.key === '[') return { kind: 'layer', action: input.shiftKey ? 'send-back' : 'send-backward' };
  return undefined;
}

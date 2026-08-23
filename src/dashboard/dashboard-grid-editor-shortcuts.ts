import type { DashboardGridItemAction } from './dashboard-grid-item-actions';
import type { DashboardGridLayerAction } from './dashboard-grid-layer-actions';

export type DashboardGridClipboardAction = 'copy' | 'cut' | 'paste';

export type DashboardGridEditorShortcut =
  | { kind: 'item'; action: DashboardGridItemAction }
  | { kind: 'layer'; action: DashboardGridLayerAction }
  | { kind: 'clipboard'; action: DashboardGridClipboardAction };

export interface DashboardGridShortcutInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

export function dashboardGridEditorShortcut(
  input: DashboardGridShortcutInput,
): DashboardGridEditorShortcut | undefined {
  const mod = input.ctrlKey === true || input.metaKey === true;
  const key = input.key.toLowerCase();
  if (!mod && (key === 'delete' || key === 'backspace')) {
    return { kind: 'item', action: 'delete' };
  }
  if (mod && key === 'c') return { kind: 'clipboard', action: 'copy' };
  if (mod && key === 'x') return { kind: 'clipboard', action: 'cut' };
  if (mod && key === 'v') return { kind: 'clipboard', action: 'paste' };
  if (mod && key === 'd') return { kind: 'item', action: 'duplicate' };
  if (mod && input.key === ']') {
    return { kind: 'layer', action: input.shiftKey ? 'bring-front' : 'bring-forward' };
  }
  if (mod && input.key === '[') {
    return { kind: 'layer', action: input.shiftKey ? 'send-back' : 'send-backward' };
  }
  return undefined;
}

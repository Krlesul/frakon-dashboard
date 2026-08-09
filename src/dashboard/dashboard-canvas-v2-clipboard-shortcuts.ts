export type DashboardCanvasV2ClipboardShortcut = 'copy' | 'cut' | 'paste';

export interface DashboardCanvasV2ClipboardShortcutInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  canvasFocused: boolean;
  canCopy: boolean;
  canPaste: boolean;
}

export function dashboardCanvasV2ClipboardShortcut(
  input: DashboardCanvasV2ClipboardShortcutInput,
): DashboardCanvasV2ClipboardShortcut | undefined {
  if (!input.canvasFocused || input.altKey || !(input.ctrlKey || input.metaKey)) return undefined;
  const key = input.key.toLowerCase();
  if (key === 'c' && input.canCopy) return 'copy';
  if (key === 'x' && input.canCopy) return 'cut';
  if (key === 'v' && input.canPaste) return 'paste';
  return undefined;
}

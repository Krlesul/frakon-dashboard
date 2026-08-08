import {
  copyDashboardCanvasV2Selection,
  pasteDashboardCanvasV2Clipboard,
  type DashboardCanvasV2ClipboardPasteResult,
  type DashboardCanvasV2ClipboardSnapshot,
} from './dashboard-canvas-v2-clipboard';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export class DashboardCanvasV2ClipboardController {
  private snapshot?: DashboardCanvasV2ClipboardSnapshot;

  get canPaste(): boolean {
    return this.snapshot !== undefined;
  }

  get current(): DashboardCanvasV2ClipboardSnapshot | undefined {
    return this.snapshot ? structuredClone(this.snapshot) : undefined;
  }

  copy(document: FrakonDashboardDocumentV2, selectedIds: Iterable<string>): boolean {
    const snapshot = copyDashboardCanvasV2Selection(document, selectedIds);
    if (!snapshot) return false;
    this.snapshot = snapshot;
    return true;
  }

  paste(document: FrakonDashboardDocumentV2, target?: { x: number; y: number }): DashboardCanvasV2ClipboardPasteResult {
    return pasteDashboardCanvasV2Clipboard(document, this.snapshot, target);
  }

  clear(): void {
    this.snapshot = undefined;
  }
}

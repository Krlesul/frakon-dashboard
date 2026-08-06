import { LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DashboardConflictPreview } from '../../../src/dashboard/dashboard-conflict-preview';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type { FrakonDashboardConflictCanvasOverlay } from './dashboard-conflict-canvas-overlay';
import './dashboard-conflict-canvas-overlay';

@customElement('frakon-dashboard-conflict-canvas-bridge')
export class FrakonDashboardConflictCanvasBridge extends LitElement {
  @property({ attribute: false }) preview?: DashboardConflictPreview;
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ type: Boolean }) visible = false;
  @property({ type: Boolean }) showLocal = true;
  @property({ type: Boolean }) showRemote = true;
  @property({ type: Boolean }) showResult = true;

  private overlay?: FrakonDashboardConflictCanvasOverlay;

  protected updated(): void {
    this.syncOverlay();
  }

  disconnectedCallback(): void {
    this.removeOverlay();
    super.disconnectedCallback();
  }

  private studioCanvas(): HTMLElement | undefined {
    let root: Node = this.getRootNode();
    while (root instanceof ShadowRoot) {
      const canvas = findStudioCanvas(root);
      if (canvas) return canvas;
      root = root.host.getRootNode();
    }
    return undefined;
  }

  private syncOverlay(): void {
    if (!this.visible || !this.preview || !this.document) {
      this.removeOverlay();
      return;
    }

    const canvas = this.studioCanvas();
    if (!canvas) return;
    if (!this.overlay) this.overlay = document.createElement('frakon-dashboard-conflict-canvas-overlay');
    this.overlay.preview = this.preview;
    this.overlay.document = this.document;
    this.overlay.showLocal = this.showLocal;
    this.overlay.showRemote = this.showRemote;
    this.overlay.showResult = this.showResult;
    if (this.overlay.parentElement !== canvas) canvas.append(this.overlay);
  }

  private removeOverlay(): void {
    this.overlay?.remove();
  }

  render() {
    return nothing;
  }
}

function findStudioCanvas(root: ParentNode): HTMLElement | undefined {
  const direct = root.querySelector<HTMLElement>('frakon-studio-canvas');
  if (direct) return direct;

  for (const element of root.querySelectorAll<HTMLElement>('*')) {
    if (!element.shadowRoot) continue;
    const nested = findStudioCanvas(element.shadowRoot);
    if (nested) return nested;
  }
  return undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-conflict-canvas-bridge': FrakonDashboardConflictCanvasBridge;
  }
}

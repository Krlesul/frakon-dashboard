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
      const canvas = root.querySelector<HTMLElement>('frakon-studio-canvas');
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
    if (this.overlay.parentElement !== canvas) canvas.append(this.overlay);
  }

  private removeOverlay(): void {
    this.overlay?.remove();
  }

  render() {
    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-conflict-canvas-bridge': FrakonDashboardConflictCanvasBridge;
  }
}

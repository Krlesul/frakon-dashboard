import { LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type { FrakonConstraintPreviewOverlay } from './constraint-preview-overlay';
import './constraint-preview-overlay';

@customElement('frakon-constraint-preview-bridge')
export class FrakonConstraintPreviewBridge extends LitElement {
  @property({ attribute: false }) source?: FrakonDashboardDocument;
  @property({ attribute: false }) preview?: FrakonDashboardDocument;
  @property({ type: Boolean }) visible = false;

  private overlay?: FrakonConstraintPreviewOverlay;

  protected updated(): void {
    this.syncOverlay();
  }

  disconnectedCallback(): void {
    this.removeOverlay();
    super.disconnectedCallback();
  }

  private studioCanvas(): HTMLElement | undefined {
    const root = this.getRootNode();
    if (!(root instanceof ShadowRoot)) return undefined;
    const studio = root.host;
    const studioRoot = studio.shadowRoot;
    return studioRoot?.querySelector<HTMLElement>('frakon-studio-canvas') ?? undefined;
  }

  private syncOverlay(): void {
    if (!this.visible || !this.source || !this.preview) {
      this.removeOverlay();
      return;
    }

    const canvas = this.studioCanvas();
    if (!canvas) return;

    if (!this.overlay) {
      this.overlay = document.createElement('frakon-constraint-preview-overlay');
    }
    this.overlay.source = this.source;
    this.overlay.preview = this.preview;
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
    'frakon-constraint-preview-bridge': FrakonConstraintPreviewBridge;
  }
}

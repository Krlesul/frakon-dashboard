import { LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DashboardEmergencyFocusState } from '../../../src/dashboard/dashboard-emergency-focus';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type { ViewportTransform } from '../../../packages/studio-engine/src/viewport';
import type { FrakonDashboardEmergencyFocusOverlay } from './dashboard-emergency-focus-overlay';
import type { FrakonStudioCanvas } from './studio-canvas';
import './dashboard-emergency-focus-overlay';

const COLUMN_WIDTH = 96;

@customElement('frakon-dashboard-emergency-focus-bridge')
export class FrakonDashboardEmergencyFocusBridge extends LitElement {
  @property({ attribute: false }) focus?: DashboardEmergencyFocusState;
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ type: Boolean }) autoFocus = true;

  private overlay?: FrakonDashboardEmergencyFocusOverlay;
  private previousViewport?: ViewportTransform;
  private focusedItemId?: string;

  protected updated(): void {
    this.sync();
  }

  disconnectedCallback(): void {
    this.deactivate();
    super.disconnectedCallback();
  }

  private sync(): void {
    if (!this.focus?.active || !this.document) {
      this.deactivate();
      return;
    }
    const canvas = this.studioCanvas();
    if (!canvas) return;
    if (!this.overlay) this.overlay = document.createElement('frakon-dashboard-emergency-focus-overlay');
    this.overlay.focus = this.focus;
    this.overlay.document = this.document;
    if (this.overlay.parentElement !== canvas) canvas.append(this.overlay);

    const primary = this.focus.primary;
    if (!this.autoFocus || !primary || this.focusedItemId === primary.itemId) return;
    if (!this.previousViewport) this.previousViewport = { ...canvas.viewport };
    this.focusedItemId = primary.itemId;
    const rect = canvas.getBoundingClientRect();
    const item = primary.item;
    const itemWidth = item.w * COLUMN_WIDTH - this.document.gap;
    const itemHeight = item.h * this.document.rowHeight - this.document.gap;
    const availableWidth = Math.max(320, rect.width - 96);
    const availableHeight = Math.max(240, rect.height - 96);
    const zoom = Math.min(1.35, Math.max(canvas.viewport.zoom, Math.min(availableWidth / itemWidth, availableHeight / itemHeight)));
    const centerX = item.x * COLUMN_WIDTH + itemWidth / 2;
    const centerY = item.y * this.document.rowHeight + itemHeight / 2;
    canvas.viewport = {
      zoom,
      x: rect.width / 2 - centerX * zoom,
      y: rect.height / 2 - centerY * zoom,
    };
    canvas.requestUpdate();
  }

  private deactivate(): void {
    this.overlay?.remove();
    this.focusedItemId = undefined;
    if (!this.previousViewport) return;
    const canvas = this.studioCanvas();
    if (canvas) {
      canvas.viewport = { ...this.previousViewport };
      canvas.requestUpdate();
    }
    this.previousViewport = undefined;
  }

  private studioCanvas(): FrakonStudioCanvas | undefined {
    let root: Node = this.getRootNode();
    while (root instanceof ShadowRoot) {
      const canvas = findStudioCanvas(root);
      if (canvas) return canvas;
      root = root.host.getRootNode();
    }
    return undefined;
  }

  render() { return nothing; }
}

function findStudioCanvas(root: ParentNode): FrakonStudioCanvas | undefined {
  const direct = root.querySelector<FrakonStudioCanvas>('frakon-studio-canvas');
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
    'frakon-dashboard-emergency-focus-bridge': FrakonDashboardEmergencyFocusBridge;
  }
}

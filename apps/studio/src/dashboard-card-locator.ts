import { LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import type { FrakonStudioCanvas } from './studio-canvas';

const COLUMN_WIDTH = 96;

@customElement('frakon-dashboard-card-locator')
export class FrakonDashboardCardLocator extends LitElement {
  @property({ attribute:false }) document?: FrakonDashboardDocument;
  @property() itemId = '';
  @property({ type:Number }) locateToken = 0;
  @property({ type:Number }) maxZoom = 1.2;

  private lastLocateToken = -1;

  protected updated(): void {
    if (!this.document || !this.itemId || this.locateToken === this.lastLocateToken) return;
    this.lastLocateToken = this.locateToken;
    this.locate();
  }

  private locate(): void {
    if (!this.document) return;
    const item = this.document.items.find((candidate) => candidate.id === this.itemId);
    const canvas = this.studioCanvas();
    if (!item || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const itemWidth = item.w * COLUMN_WIDTH - this.document.gap;
    const itemHeight = item.h * this.document.rowHeight - this.document.gap;
    const availableWidth = Math.max(320, rect.width - 96);
    const availableHeight = Math.max(240, rect.height - 96);
    const zoom = Math.min(
      this.maxZoom,
      Math.max(canvas.viewport.zoom, Math.min(availableWidth / itemWidth, availableHeight / itemHeight)),
    );
    const centerX = item.x * COLUMN_WIDTH + itemWidth / 2;
    const centerY = item.y * this.document.rowHeight + itemHeight / 2;
    canvas.viewport = {
      zoom,
      x: rect.width / 2 - centerX * zoom,
      y: rect.height / 2 - centerY * zoom,
    };
    canvas.selectItemById(this.itemId);
    canvas.requestUpdate();
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
    'frakon-dashboard-card-locator': FrakonDashboardCardLocator;
  }
}

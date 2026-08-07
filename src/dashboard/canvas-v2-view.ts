import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { HomeAssistant } from '../home-assistant/types';
import './card-host';
import { dashboardCanvasRenderModel } from './dashboard-canvas-render-model';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

@customElement('frakon-canvas-v2-view')
export class FrakonCanvasV2View extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ type: Number }) width = 1000;

  static styles = css`
    :host { display: block; }
    .canvas { position: relative; min-height: 120px; overflow: hidden; border-radius: 18px; background: color-mix(in srgb, var(--card-background-color) 94%, var(--primary-color) 6%); }
    .item { position: absolute; min-width: 0; min-height: 0; overflow: hidden; border-radius: 18px; border: 1px solid color-mix(in srgb, var(--primary-text-color) 10%, transparent); background: var(--card-background-color); box-sizing: border-box; }
    .content { width: 100%; height: 100%; min-width: 0; min-height: 0; }
  `;

  render() {
    if (!this.document) return nothing;
    const model = dashboardCanvasRenderModel(this.document, Math.max(1, this.width));
    return html`
      <div class="canvas" style=${`height:${model.minHeight}px`}>
        ${model.items.map((item) => html`
          <article
            class="item"
            data-frakon-item-id=${item.id}
            style=${`left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px`}
          >
            <div class="content"><frakon-card-host .hass=${this.hass} .config=${item.card}></frakon-card-host></div>
          </article>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-canvas-v2-view': FrakonCanvasV2View;
  }
}

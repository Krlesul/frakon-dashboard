import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { cssRecordToString, surfaceStyleToCss } from '../../../packages/design-system/src/surface-style';
import type { SelectionState } from '../../../packages/studio-engine/src/selection';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';
import { resolveDashboardSurface, resolveGridItemSurface } from '../../../src/dashboard/surface-style-resolver';
import type { FrakonStudioSelectionChangedDetail } from './studio-canvas';
import type { FrakonStudioDocumentChangedDetail } from './surface-inspector';
import './studio-canvas';
import './surface-inspector';

export interface FrakonDashboardStudioChangedDetail {
  document: FrakonDashboardDocument;
  selection: SelectionState;
}

@customElement('frakon-dashboard-studio')
export class FrakonDashboardStudio extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @state() private selection: SelectionState = { ids: [] };

  static styles = css`
    :host {
      display:block;
      min-height:680px;
      color:var(--primary-text-color,#f7f8fb);
      font-family:Inter,system-ui,sans-serif;
    }
    .studio-shell {
      display:grid;
      grid-template-columns:minmax(0,1fr) minmax(300px,380px);
      gap:16px;
      min-height:inherit;
    }
    .canvas-pane { min-width:0; }
    .inspector-pane {
      min-width:0;
      max-height:calc(100vh - 32px);
      overflow:auto;
      padding-right:2px;
    }
    .item {
      position:absolute;
      box-sizing:border-box;
      overflow:hidden;
      cursor:default;
    }
    .item-content {
      height:100%;
      box-sizing:border-box;
      display:grid;
      align-content:start;
      gap:8px;
    }
    .item-title { font-weight:700; }
    .item-meta { font-size:12px; opacity:.58; }
    .empty {
      position:absolute;
      left:120px;
      top:100px;
      width:380px;
      padding:24px;
      border:1px dashed rgb(255 255 255 / 18%);
      border-radius:20px;
      background:rgb(255 255 255 / 3%);
    }
    @media (max-width:980px) {
      .studio-shell { grid-template-columns:1fr; }
      .inspector-pane { max-height:none; }
    }
  `;

  private emitChanged(): void {
    if (!this.document) return;
    this.dispatchEvent(new CustomEvent<FrakonDashboardStudioChangedDetail>('frakon-dashboard-studio-changed', {
      detail: {
        document: structuredClone(this.document),
        selection: structuredClone(this.selection),
      },
      bubbles: true,
      composed: true,
    }));
  }

  private onSelectionChanged(event: CustomEvent<FrakonStudioSelectionChangedDetail>): void {
    this.selection = event.detail.selection;
    this.emitChanged();
  }

  private onDocumentChanged(event: CustomEvent<FrakonStudioDocumentChangedDetail>): void {
    this.document = event.detail.document;
    this.emitChanged();
  }

  private renderItems(document: FrakonDashboardDocument) {
    if (document.items.length === 0) {
      return html`<div class="empty"><strong>Empty dashboard</strong><p>Add cards to begin composing the FRAKON interface.</p></div>`;
    }

    const columnWidth = 96;
    const rowHeight = document.rowHeight;
    return document.items.map((item) => {
      const style = resolveGridItemSurface(document, item);
      const surfaceCss = cssRecordToString(surfaceStyleToCss(style));
      const placement = [
        `left:${item.x * columnWidth}px`,
        `top:${item.y * rowHeight}px`,
        `width:${item.w * columnWidth - document.gap}px`,
        `height:${item.h * rowHeight - document.gap}px`,
      ].join(';');
      const cardType = typeof item.card.type === 'string' ? item.card.type : 'card';
      const name = typeof item.card.name === 'string' ? item.card.name : item.id;
      return html`
        <article
          class="item"
          data-frakon-id=${item.id}
          style=${`${placement};${surfaceCss}`}
          aria-label=${name}
        >
          <div class="item-content">
            <span class="item-title">${name}</span>
            <span class="item-meta">${cardType} · ${item.w} × ${item.h}</span>
          </div>
        </article>
      `;
    });
  }

  render() {
    const document = this.document;
    if (!document) return html`<p>No dashboard document loaded.</p>`;
    const dashboardCss = cssRecordToString(surfaceStyleToCss(resolveDashboardSurface(document)));

    return html`
      <section class="studio-shell">
        <div class="canvas-pane" style=${dashboardCss}>
          <frakon-studio-canvas
            @frakon-studio-selection-changed=${this.onSelectionChanged}
          >
            ${this.renderItems(document)}
          </frakon-studio-canvas>
        </div>
        <aside class="inspector-pane">
          <frakon-surface-inspector
            .document=${document}
            .selection=${this.selection}
            @frakon-studio-document-changed=${this.onDocumentChanged}
          ></frakon-surface-inspector>
        </aside>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-studio': FrakonDashboardStudio;
  }
}

import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';

const COLUMN_WIDTH = 96;

@customElement('frakon-constraint-preview-overlay')
export class FrakonConstraintPreviewOverlay extends LitElement {
  @property({ attribute: false }) source?: FrakonDashboardDocument;
  @property({ attribute: false }) preview?: FrakonDashboardDocument;

  static styles = css`
    :host {
      position:absolute;
      inset:0;
      display:block;
      pointer-events:none;
      z-index:18;
    }
    .ghost {
      position:absolute;
      box-sizing:border-box;
      border:1.5px dashed rgb(126 196 255 / 90%);
      border-radius:10px;
      background:rgb(75 150 255 / 12%);
      box-shadow:0 0 0 1px rgb(105 167 255 / 12%),0 12px 28px rgb(27 75 150 / 18%);
      transition:left 160ms ease,top 160ms ease,width 160ms ease,height 160ms ease;
    }
    .ghost::after {
      content:attr(data-label);
      position:absolute;
      left:8px;
      top:8px;
      max-width:calc(100% - 16px);
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      padding:4px 7px;
      border-radius:7px;
      color:#dcecff;
      background:rgb(15 34 61 / 82%);
      font:600 11px/1.2 Inter,system-ui,sans-serif;
    }
    .origin {
      position:absolute;
      box-sizing:border-box;
      border:1px dotted rgb(255 255 255 / 24%);
      border-radius:10px;
      opacity:.5;
    }
  `;

  private changedIds(): string[] {
    if (!this.source || !this.preview) return [];
    const previewById = new Map(this.preview.items.map((item) => [item.id, item]));
    return this.source.items.filter((item) => {
      if (item.hidden) return false;
      const next = previewById.get(item.id);
      return next && !next.hidden && (next.x !== item.x || next.y !== item.y || next.w !== item.w || next.h !== item.h);
    }).map((item) => item.id);
  }

  render() {
    if (!this.source || !this.preview) return nothing;
    const changed = new Set(this.changedIds());
    if (changed.size === 0) return nothing;
    const sourceById = new Map(this.source.items.map((item) => [item.id, item]));

    return html`${this.preview.items.filter((item) => changed.has(item.id) && !item.hidden).map((item) => {
      const source = sourceById.get(item.id);
      const label = typeof item.card.name === 'string' ? item.card.name : item.id;
      const previewStyle = `left:${item.x * COLUMN_WIDTH}px;top:${item.y * this.preview!.rowHeight}px;width:${item.w * COLUMN_WIDTH - this.preview!.gap}px;height:${item.h * this.preview!.rowHeight - this.preview!.gap}px`;
      const sourceStyle = source
        ? `left:${source.x * COLUMN_WIDTH}px;top:${source.y * this.source!.rowHeight}px;width:${source.w * COLUMN_WIDTH - this.source!.gap}px;height:${source.h * this.source!.rowHeight - this.source!.gap}px`
        : '';
      return html`
        ${source ? html`<div class="origin" style=${sourceStyle}></div>` : nothing}
        <div class="ghost" data-label=${label} style=${previewStyle}></div>
      `;
    })}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-constraint-preview-overlay': FrakonConstraintPreviewOverlay;
  }
}

import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DashboardConflictPreview } from '../../../src/dashboard/dashboard-conflict-preview';
import type { FrakonDashboardDocument, FrakonGridItem } from '../../../src/dashboard/layout-model';

const COLUMN_WIDTH = 96;

@customElement('frakon-dashboard-conflict-canvas-overlay')
export class FrakonDashboardConflictCanvasOverlay extends LitElement {
  @property({ attribute: false }) preview?: DashboardConflictPreview;
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ type: Boolean }) showLocal = true;
  @property({ type: Boolean }) showRemote = true;
  @property({ type: Boolean }) showResult = true;
  @property() activeId = '';

  static styles = css`
    :host {
      position:absolute;
      inset:0;
      z-index:24;
      display:block;
      pointer-events:none;
    }
    .box {
      position:absolute;
      box-sizing:border-box;
      border-radius:10px;
      transition:left 160ms ease,top 160ms ease,width 160ms ease,height 160ms ease,opacity 120ms ease,filter 120ms ease;
    }
    .box::after {
      content:attr(data-label);
      position:absolute;
      left:7px;
      top:7px;
      max-width:calc(100% - 14px);
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      padding:4px 7px;
      border-radius:7px;
      color:white;
      font:700 10px/1.2 Inter,system-ui,sans-serif;
      backdrop-filter:blur(10px);
    }
    .local {
      border:2px solid rgb(105 167 255 / 92%);
      background:rgb(105 167 255 / 10%);
      box-shadow:0 0 0 1px rgb(105 167 255 / 14%) inset;
    }
    .local::after { background:rgb(32 74 136 / 88%); }
    .remote {
      border:2px dashed rgb(255 174 92 / 92%);
      background:rgb(255 174 92 / 9%);
    }
    .remote::after { background:rgb(128 72 25 / 88%); }
    .resolved {
      border:2px solid rgb(95 211 154 / 96%);
      background:rgb(95 211 154 / 13%);
      box-shadow:0 0 0 4px rgb(95 211 154 / 9%);
    }
    .resolved::after { background:rgb(24 102 68 / 90%); }
    .active {
      filter:brightness(1.16);
      box-shadow:0 0 0 4px rgb(255 255 255 / 20%),0 0 30px rgb(105 167 255 / 34%);
      z-index:3;
    }
    .resolved.active {
      box-shadow:0 0 0 5px rgb(95 211 154 / 22%),0 0 34px rgb(95 211 154 / 34%);
    }
    .muted { opacity:.42; }
  `;

  render() {
    if (!this.preview || !this.document || this.preview.cards.length === 0) return nothing;
    return html`${this.preview.cards.map((card) => html`
      ${this.showLocal && card.local
        ? this.renderBox(card.id, card.local, 'local', `${card.id} · Local`, card.selected === 'remote')
        : nothing}
      ${this.showRemote && card.remote
        ? this.renderBox(card.id, card.remote, 'remote', `${card.id} · Home Assistant`, card.selected === 'local')
        : nothing}
      ${this.showResult && card.selected && card.resolved
        ? this.renderBox(card.id, card.resolved, 'resolved', `${card.id} · Result`, false)
        : nothing}
    `)}`;
  }

  private renderBox(
    id: string,
    item: FrakonGridItem,
    kind: 'local' | 'remote' | 'resolved',
    label: string,
    muted: boolean,
  ) {
    const style = `left:${item.x * COLUMN_WIDTH}px;top:${item.y * this.document!.rowHeight}px;width:${item.w * COLUMN_WIDTH - this.document!.gap}px;height:${item.h * this.document!.rowHeight - this.document!.gap}px`;
    return html`<div class=${`box ${kind} ${id === this.activeId ? 'active' : ''} ${muted ? 'muted' : ''}`} data-label=${label} style=${style}></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-conflict-canvas-overlay': FrakonDashboardConflictCanvasOverlay;
  }
}

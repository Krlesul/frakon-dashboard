import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DashboardEmergencyFocusState } from '../../../src/dashboard/dashboard-emergency-focus';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';

const COLUMN_WIDTH = 96;

@customElement('frakon-dashboard-emergency-focus-overlay')
export class FrakonDashboardEmergencyFocusOverlay extends LitElement {
  @property({ attribute: false }) focus?: DashboardEmergencyFocusState;
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property() activeItemId = '';

  static styles = css`
    :host { position:absolute; inset:0; z-index:30; display:block; pointer-events:none; }
    .veil { position:absolute; inset:0; background:rgb(5 7 12 / 52%); backdrop-filter:blur(1px); }
    .focus {
      position:absolute;
      box-sizing:border-box;
      border:3px solid rgb(255 78 91 / 96%);
      border-radius:14px;
      background:rgb(255 78 91 / 8%);
      box-shadow:0 0 0 7px rgb(255 78 91 / 16%),0 0 42px rgb(255 78 91 / 48%);
      animation:pulse 1.25s ease-in-out infinite alternate;
      transition:opacity 140ms ease,filter 140ms ease,box-shadow 140ms ease;
    }
    .label {
      position:absolute;
      left:8px;
      top:8px;
      display:grid;
      gap:2px;
      max-width:calc(100% - 16px);
      padding:6px 8px;
      border-radius:8px;
      color:white;
      background:rgb(151 19 31 / 94%);
      font:700 10px/1.25 Inter,system-ui,sans-serif;
    }
    .label strong { font-weight:900; letter-spacing:.04em; }
    .label span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.92; }
    .label small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.7; }
    .focus.active {
      z-index:2;
      box-shadow:0 0 0 8px rgb(255 78 91 / 22%),0 0 54px rgb(255 78 91 / 64%);
      filter:brightness(1.16);
    }
    .focus.muted { opacity:.38; animation:none; }
    @keyframes pulse { from { filter:brightness(1); } to { filter:brightness(1.22); } }
    @media (prefers-reduced-motion:reduce) { .focus { animation:none; } }
  `;

  render() {
    if (!this.focus?.active || !this.document) return nothing;
    const activeItemId = this.activeItemId || this.focus.primary?.itemId || '';
    return html`
      <div class="veil"></div>
      ${this.focus.targets.map((target) => {
        const item = target.item;
        const active = target.itemId === activeItemId;
        const style = `left:${item.x * COLUMN_WIDTH}px;top:${item.y * this.document!.rowHeight}px;width:${item.w * COLUMN_WIDTH - this.document!.gap}px;height:${item.h * this.document!.rowHeight - this.document!.gap}px`;
        return html`<div class=${`focus ${active ? 'active' : 'muted'}`} style=${style}>
          <div class="label">
            <strong>CRITICAL · ${target.itemId}</strong>
            ${target.reasons[0] ? html`<span>${target.reasons[0]}</span>` : nothing}
            ${target.sourceEntityIds.length > 0 ? html`<small>${target.sourceEntityIds.join(', ')}</small>` : nothing}
          </div>
        </div>`;
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-dashboard-emergency-focus-overlay': FrakonDashboardEmergencyFocusOverlay;
  }
}

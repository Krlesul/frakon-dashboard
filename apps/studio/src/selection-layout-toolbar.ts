import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SelectionState } from '../../../packages/studio-engine/src/selection';
import type { DashboardSelectionLayoutAction } from '../../../src/dashboard/dashboard-selection-layout';
import type { FrakonDashboardDocument } from '../../../src/dashboard/layout-model';

export interface FrakonSelectionLayoutActionDetail {
  action: DashboardSelectionLayoutAction;
}

const ACTIONS: Array<{ action: DashboardSelectionLayoutAction; label: string; title: string; minimum: number }> = [
  { action: 'align-left', label: 'L', title: 'Align left', minimum: 2 },
  { action: 'align-center-x', label: '↔', title: 'Align horizontal centers', minimum: 2 },
  { action: 'align-right', label: 'R', title: 'Align right', minimum: 2 },
  { action: 'align-top', label: 'T', title: 'Align top', minimum: 2 },
  { action: 'align-center-y', label: '↕', title: 'Align vertical centers', minimum: 2 },
  { action: 'align-bottom', label: 'B', title: 'Align bottom', minimum: 2 },
  { action: 'distribute-horizontal', label: 'H⋯', title: 'Distribute horizontally', minimum: 3 },
  { action: 'distribute-vertical', label: 'V⋮', title: 'Distribute vertically', minimum: 3 },
];

@customElement('frakon-selection-layout-toolbar')
export class FrakonSelectionLayoutToolbar extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) selection: SelectionState = { ids: [] };

  static styles = css`
    :host { display:block; }
    .panel {
      display:grid;
      gap:9px;
      padding:11px 12px;
      border:1px solid rgb(255 255 255 / 10%);
      border-radius:14px;
      background:rgb(255 255 255 / 4%);
    }
    .head { display:flex; justify-content:space-between; gap:8px; font-size:12px; }
    .title { font-weight:720; }
    .count { opacity:.5; }
    .buttons { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; }
    button {
      min-height:32px;
      border:1px solid rgb(105 167 255 / 26%);
      border-radius:8px;
      color:inherit;
      background:rgb(105 167 255 / 9%);
      cursor:pointer;
      font:650 11px/1 Inter,system-ui,sans-serif;
    }
    button:hover:not(:disabled) { background:rgb(105 167 255 / 18%); }
    button:disabled { opacity:.28; cursor:not-allowed; }
  `;

  private selectedMovableCount(): number {
    if (!this.document) return 0;
    const ids = new Set(this.selection.ids);
    return this.document.items.filter((item) => ids.has(item.id) && !item.hidden && !item.locked).length;
  }

  private visibleSelectedCount(): number {
    if (!this.document) return 0;
    const ids = new Set(this.selection.ids);
    return this.document.items.filter((item) => ids.has(item.id) && !item.hidden).length;
  }

  private fire(action: DashboardSelectionLayoutAction): void {
    this.dispatchEvent(new CustomEvent<FrakonSelectionLayoutActionDetail>('frakon-selection-layout-action', {
      detail: { action },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.document) return nothing;
    const visible = this.visibleSelectedCount();
    const movable = this.selectedMovableCount();
    return html`
      <section class="panel" aria-label="Selection layout tools">
        <div class="head"><span class="title">Align & distribute</span><span class="count">${visible} selected</span></div>
        <div class="buttons">
          ${ACTIONS.map(({ action, label, title, minimum }) => html`
            <button
              title=${title}
              aria-label=${title}
              ?disabled=${visible < 2 || movable === 0 || (action.startsWith('distribute-') && movable < minimum)}
              @click=${() => this.fire(action)}
            >${label}</button>
          `)}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-selection-layout-toolbar': FrakonSelectionLayoutToolbar;
  }
}

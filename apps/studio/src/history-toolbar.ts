import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type FrakonHistoryAction = 'undo' | 'redo';

export interface FrakonHistoryActionDetail {
  action: FrakonHistoryAction;
}

@customElement('frakon-history-toolbar')
export class FrakonHistoryToolbar extends LitElement {
  @property({ type: Boolean }) canUndo = false;
  @property({ type: Boolean }) canRedo = false;
  @property() lastSource = '';

  static styles = css`
    :host { display:block; }
    .toolbar {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:8px 10px;
      border:1px solid rgb(255 255 255 / 9%);
      border-radius:14px;
      background:rgb(13 18 28 / 72%);
      backdrop-filter:blur(18px);
    }
    .actions { display:flex; gap:6px; }
    button {
      min-width:78px;
      border:1px solid rgb(255 255 255 / 11%);
      border-radius:10px;
      padding:8px 11px;
      color:inherit;
      background:rgb(255 255 255 / 6%);
      cursor:pointer;
      font:600 13px/1.2 Inter,system-ui,sans-serif;
    }
    button:hover:not(:disabled) {
      border-color:rgb(105 167 255 / 42%);
      background:rgb(105 167 255 / 14%);
    }
    button:disabled { opacity:.38; cursor:not-allowed; }
    .status {
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      font:500 12px/1.2 Inter,system-ui,sans-serif;
      opacity:.58;
    }
  `;

  private emitAction(action: FrakonHistoryAction): void {
    this.dispatchEvent(new CustomEvent<FrakonHistoryActionDetail>('frakon-history-action', {
      detail: { action },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      <div class="toolbar" role="toolbar" aria-label="Dashboard history">
        <div class="actions">
          <button title="Undo · Ctrl/Cmd+Z" ?disabled=${!this.canUndo} @click=${() => this.emitAction('undo')}>↶ Undo</button>
          <button title="Redo · Ctrl/Cmd+Shift+Z" ?disabled=${!this.canRedo} @click=${() => this.emitAction('redo')}>↷ Redo</button>
        </div>
        <span class="status">${this.lastSource ? `Last change: ${this.lastSource}` : 'No committed changes'}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-history-toolbar': FrakonHistoryToolbar;
  }
}

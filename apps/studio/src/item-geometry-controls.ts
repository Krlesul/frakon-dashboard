import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SelectionState } from '../../../packages/studio-engine/src/selection';
import { updateDashboardItemGeometryExact } from '../../../src/dashboard/dashboard-item-geometry';
import type { FrakonDashboardDocument, FrakonGridItem } from '../../../src/dashboard/layout-model';

export interface FrakonItemGeometryDocumentChangedDetail {
  document: FrakonDashboardDocument;
}

@customElement('frakon-item-geometry-controls')
export class FrakonItemGeometryControls extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) selection: SelectionState = { ids: [] };
  @state() private message?: string;

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
    .head { display:flex; justify-content:space-between; gap:8px; align-items:baseline; }
    .title { font-size:12px; font-weight:720; }
    .hint { font-size:10px; opacity:.5; }
    .fields { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; }
    label { display:grid; gap:4px; min-width:0; font-size:10px; opacity:.72; }
    input {
      width:100%;
      min-width:0;
      box-sizing:border-box;
      border:1px solid rgb(255 255 255 / 12%);
      border-radius:8px;
      padding:7px 6px;
      color:inherit;
      background:rgb(0 0 0 / 13%);
      font:650 12px/1 Inter,system-ui,sans-serif;
    }
    input:focus { outline:1px solid rgb(105 167 255 / 64%); border-color:transparent; }
    input:disabled { opacity:.4; cursor:not-allowed; }
    .message { font-size:10px; color:#ff9aaa; }
  `;

  private selectedItem(): FrakonGridItem | undefined {
    if (!this.document || this.selection.ids.length !== 1) return undefined;
    return this.document.items.find((item) => item.id === this.selection.ids[0]);
  }

  private update(field: 'x' | 'y' | 'w' | 'h', event: Event): void {
    const document = this.document;
    const item = this.selectedItem();
    if (!document || !item || item.locked || item.hidden) return;
    const raw = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(raw)) return;
    const result = updateDashboardItemGeometryExact(document, item.id, { [field]: raw });
    if (result.status === 'collision') {
      this.message = `Blocked by collision: ${result.collisionIds.join(', ')}`;
      (event.target as HTMLInputElement).value = String(item[field]);
      return;
    }
    this.message = undefined;
    if (result.status !== 'committed') return;
    this.dispatchEvent(new CustomEvent<FrakonItemGeometryDocumentChangedDetail>('frakon-item-geometry-document-changed', {
      detail: { document: result.document },
      bubbles: true,
      composed: true,
    }));
  }

  private minimum(item: FrakonGridItem, field: 'x' | 'y' | 'w' | 'h'): number {
    if (field === 'w') return Math.max(1, item.minW ?? 1);
    if (field === 'h') return Math.max(1, item.minH ?? 1);
    return 0;
  }

  private maximum(item: FrakonGridItem, field: 'x' | 'y' | 'w' | 'h'): number | undefined {
    if (!this.document) return undefined;
    if (field === 'x') return Math.max(0, this.document.columns - item.w);
    if (field === 'w') return Math.min(this.document.columns, item.maxW ?? this.document.columns);
    if (field === 'h') return item.maxH;
    return undefined;
  }

  private field(item: FrakonGridItem, key: 'x' | 'y' | 'w' | 'h', label: string) {
    const maximum = this.maximum(item, key);
    return html`
      <label>${label}
        <input
          type="number"
          step="1"
          min=${this.minimum(item, key)}
          max=${maximum ?? nothing}
          .value=${String(item[key])}
          ?disabled=${item.locked || item.hidden}
          @change=${(event: Event) => this.update(key, event)}
          aria-label=${`${label} for ${item.id}`}
        >
      </label>
    `;
  }

  render() {
    const item = this.selectedItem();
    if (!item) return nothing;
    return html`
      <section class="panel" aria-label="Precise card geometry">
        <div class="head">
          <span class="title">Position & size</span>
          <span class="hint">Grid units</span>
        </div>
        <div class="fields">
          ${this.field(item, 'x', 'X')}
          ${this.field(item, 'y', 'Y')}
          ${this.field(item, 'w', 'W')}
          ${this.field(item, 'h', 'H')}
        </div>
        ${item.locked ? html`<div class="message">Unlock this layer to change geometry.</div>` : nothing}
        ${item.hidden ? html`<div class="message">Show this layer to change geometry.</div>` : nothing}
        ${this.message ? html`<div class="message" role="status">${this.message}</div>` : nothing}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-item-geometry-controls': FrakonItemGeometryControls;
  }
}

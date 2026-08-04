import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCardConfig } from '../home-assistant/types';
import { LocalDashboardStore } from './layout-store';
import { normalizeDashboard, updateGridItem, type FrakonDashboardDocument, type FrakonGridItem } from './layout-model';

export interface FrakonDashboardCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-dashboard-card';
  entity: string;
  dashboard_id?: string;
  title?: string;
  columns?: number;
  row_height?: number;
  gap?: number;
  edit_mode?: boolean;
  items?: FrakonGridItem[];
}

const store = new LocalDashboardStore();

@customElement('frakon-dashboard-card')
export class FrakonDashboardCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonDashboardCardConfig;
  @state() private document?: FrakonDashboardDocument;
  @state() private draggingId?: string;

  static styles = css`
    :host { display:block; }
    .shell { padding:16px; border-radius:24px; background:var(--card-background-color); }
    header { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; }
    h2 { margin:0; font-size:22px; }
    .badge { padding:6px 10px; border-radius:999px; background:color-mix(in srgb,var(--primary-color) 16%,transparent); font-size:12px; }
    .grid { display:grid; position:relative; align-items:stretch; }
    .item { min-width:0; overflow:hidden; border-radius:20px; border:1px solid color-mix(in srgb,var(--primary-text-color) 10%,transparent); background:color-mix(in srgb,var(--card-background-color) 92%,var(--primary-color) 8%); }
    .item[draggable='true'] { cursor:grab; }
    .item.dragging { opacity:.45; }
    .item-head { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:9px 11px; border-bottom:1px solid color-mix(in srgb,var(--primary-text-color) 8%,transparent); font-size:12px; }
    .preview { display:grid; place-items:center; min-height:80px; padding:14px; text-align:center; }
    .type { font-weight:700; }
    .entity { margin-top:6px; opacity:.62; font-size:12px; word-break:break-all; }
    .controls { display:flex; gap:4px; }
    button { border:0; border-radius:9px; padding:5px 8px; color:inherit; background:color-mix(in srgb,var(--primary-text-color) 9%,transparent); cursor:pointer; }
    .empty { padding:32px; text-align:center; opacity:.62; }
  `;

  setConfig(config: FrakonDashboardCardConfig): void {
    const id = config.dashboard_id ?? 'default';
    this.config = config;
    this.document = store.load(id) ?? normalizeDashboard({
      version: 1,
      id,
      title: config.title ?? 'FRAKON Dashboard',
      breakpoint: 'desktop',
      columns: config.columns ?? 12,
      rowHeight: config.row_height ?? 48,
      gap: config.gap ?? 12,
      items: config.items ?? [],
    });
  }

  static getConfigElement(): HTMLElement { return document.createElement('frakon-dashboard-card-editor'); }
  static getStubConfig(): FrakonDashboardCardConfig {
    return { type:'custom:frakon-dashboard-card', entity:'sensor.placeholder', dashboard_id:'home', title:'FRAKON Dashboard', columns:12, row_height:48, gap:12, edit_mode:true, items:[] };
  }

  getCardSize(): number { return 8; }

  private persist(document: FrakonDashboardDocument): void {
    this.document = document;
    store.save(document);
    this.dispatchEvent(new CustomEvent('frakon-layout-changed', { detail: { document }, bubbles: true, composed: true }));
  }

  private resize(item: FrakonGridItem, dw: number, dh: number): void {
    if (!this.document) return;
    this.persist(updateGridItem(this.document, item.id, { w: item.w + dw, h: item.h + dh }));
  }

  private onDrop(targetId: string): void {
    if (!this.document || !this.draggingId || this.draggingId === targetId) return;
    const source = this.document.items.find((item) => item.id === this.draggingId);
    const target = this.document.items.find((item) => item.id === targetId);
    if (!source || !target || source.locked) return;
    const next = this.document.items.map((item) => {
      if (item.id === source.id) return { ...item, x: target.x, y: target.y };
      if (item.id === target.id) return { ...item, x: source.x, y: source.y };
      return item;
    });
    this.persist(normalizeDashboard({ ...this.document, items: next }));
    this.draggingId = undefined;
  }

  render() {
    const doc = this.document;
    if (!doc) return nothing;
    const editMode = this.config?.edit_mode === true;
    const style = `grid-template-columns:repeat(${doc.columns},minmax(0,1fr));grid-auto-rows:${doc.rowHeight}px;gap:${doc.gap}px`;
    return html`
      <section class="shell">
        <header><h2>${doc.title}</h2>${editMode ? html`<span class="badge">EDIT MODE</span>` : nothing}</header>
        <div class="grid" style=${style}>
          ${doc.items.length === 0 ? html`<div class="empty" style="grid-column:1/-1">No dashboard items yet.</div>` : doc.items.map((item) => html`
            <article
              class="item ${this.draggingId === item.id ? 'dragging' : ''}"
              style=${`grid-column:${item.x + 1}/span ${item.w};grid-row:${item.y + 1}/span ${item.h}`}
              draggable=${String(editMode && !item.locked)}
              @dragstart=${() => { this.draggingId = item.id; }}
              @dragover=${(event: DragEvent) => event.preventDefault()}
              @drop=${() => this.onDrop(item.id)}
            >
              ${editMode ? html`<div class="item-head"><span>${item.id}</span><div class="controls"><button @click=${() => this.resize(item,-1,0)}>−W</button><button @click=${() => this.resize(item,1,0)}>+W</button><button @click=${() => this.resize(item,0,-1)}>−H</button><button @click=${() => this.resize(item,0,1)}>+H</button></div></div>` : nothing}
              <div class="preview"><div><div class="type">${String(item.card.type ?? 'Card')}</div><div class="entity">${String(item.card.entity ?? '')}</div></div></div>
            </article>
          `)}
        </div>
      </section>
    `;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-dashboard-card': FrakonDashboardCard; } }

import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { SelectionState } from '../../../packages/studio-engine/src/selection';
import type { DashboardAutoLayoutPreview } from '../../../src/dashboard/auto-layout-session';
import type { FrakonBreakpoint, FrakonDashboardDocument } from '../../../src/dashboard/layout-model';

export type FrakonAutoLayoutAction = 'start' | 'next' | 'apply' | 'revert';

export interface FrakonAutoLayoutActionDetail {
  action: FrakonAutoLayoutAction;
}

export interface FrakonAutoLayoutBreakpointChangedDetail {
  breakpoint: FrakonBreakpoint;
}

export interface FrakonAutoLayoutOverrideChangedDetail {
  itemId: string;
  priority?: number | null;
  semanticGroup?: string | null;
}

const BREAKPOINTS: FrakonBreakpoint[] = ['mobile', 'tablet', 'desktop', 'wide'];

@customElement('frakon-auto-layout-panel')
export class FrakonAutoLayoutPanel extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocument;
  @property({ attribute: false }) selection: SelectionState = { ids: [] };
  @property({ attribute: false }) preview?: DashboardAutoLayoutPreview;
  @property({ attribute: false }) previewBreakpoint?: FrakonBreakpoint;

  static styles = css`
    :host { display:block; }
    .panel {
      display:grid;
      gap:10px;
      padding:12px;
      border:1px solid rgb(255 255 255 / 10%);
      border-radius:16px;
      background:rgb(255 255 255 / 4%);
    }
    .head { display:flex; justify-content:space-between; gap:8px; align-items:baseline; }
    .title { font-size:13px; font-weight:760; letter-spacing:.04em; }
    .badge { padding:4px 7px; border-radius:999px; background:rgb(105 167 255 / 14%); font-size:10px; }
    .row { display:flex; gap:7px; align-items:center; flex-wrap:wrap; }
    select,input,button {
      min-height:32px;
      box-sizing:border-box;
      border:1px solid rgb(255 255 255 / 12%);
      border-radius:9px;
      padding:6px 8px;
      color:inherit;
      background:rgb(255 255 255 / 6%);
      font:inherit;
      font-size:11px;
    }
    button { cursor:pointer; }
    button.primary { border-color:rgb(105 167 255 / 48%); background:rgb(105 167 255 / 20%); }
    button:disabled,input:disabled,select:disabled { opacity:.38; cursor:not-allowed; }
    .meta { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
    label { display:grid; gap:4px; min-width:0; font-size:10px; opacity:.72; }
    input { width:100%; min-width:0; }
    .note { font-size:10px; line-height:1.45; opacity:.58; }
    .warning { color:#ffd28a; opacity:.86; }
  `;

  private emitAction(action: FrakonAutoLayoutAction): void {
    this.dispatchEvent(new CustomEvent<FrakonAutoLayoutActionDetail>('frakon-auto-layout-action', {
      detail: { action },
      bubbles: true,
      composed: true,
    }));
  }

  private changeBreakpoint(event: Event): void {
    const breakpoint = (event.target as HTMLSelectElement).value as FrakonBreakpoint;
    if (!BREAKPOINTS.includes(breakpoint)) return;
    this.dispatchEvent(new CustomEvent<FrakonAutoLayoutBreakpointChangedDetail>('frakon-auto-layout-breakpoint-changed', {
      detail: { breakpoint },
      bubbles: true,
      composed: true,
    }));
  }

  private selectedItem() {
    if (!this.document || this.selection.ids.length !== 1) return undefined;
    return this.document.items.find((item) => item.id === this.selection.ids[0]);
  }

  private updatePriority(event: Event): void {
    const item = this.selectedItem();
    if (!item) return;
    const raw = (event.target as HTMLInputElement).value.trim();
    const priority = raw === '' ? null : Number(raw);
    if (priority !== null && !Number.isFinite(priority)) return;
    this.dispatchEvent(new CustomEvent<FrakonAutoLayoutOverrideChangedDetail>('frakon-auto-layout-override-changed', {
      detail: { itemId: item.id, priority },
      bubbles: true,
      composed: true,
    }));
  }

  private updateGroup(event: Event): void {
    const item = this.selectedItem();
    if (!item) return;
    const semanticGroup = (event.target as HTMLInputElement).value.trim() || null;
    this.dispatchEvent(new CustomEvent<FrakonAutoLayoutOverrideChangedDetail>('frakon-auto-layout-override-changed', {
      detail: { itemId: item.id, semanticGroup },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    const document = this.document;
    if (!document) return nothing;
    const breakpoint = this.previewBreakpoint ?? document.breakpoint;
    const selected = this.selectedItem();
    const priority = typeof selected?.card.priority === 'number' ? selected.card.priority : '';
    const group = typeof selected?.card.layout_group === 'string' ? selected.card.layout_group : '';
    const preview = this.preview;
    const canApply = Boolean(preview && preview.breakpoint === document.breakpoint);

    return html`
      <section class="panel" aria-label="Automatic Dashboard Designer">
        <div class="head">
          <span class="title">Automatic Designer</span>
          ${preview ? html`<span class="badge">${preview.strategy} · #${preview.variant + 1}</span>` : html`<span class="badge">ready</span>`}
        </div>
        <div class="row">
          <select .value=${breakpoint} @change=${this.changeBreakpoint} aria-label="Auto-layout preview breakpoint">
            ${BREAKPOINTS.map((candidate) => html`<option value=${candidate}>${candidate}</option>`)}
          </select>
          ${preview
            ? html`
              <button @click=${() => this.emitAction('next')}>Next proposal</button>
              <button class="primary" ?disabled=${!canApply} @click=${() => this.emitAction('apply')}>Apply</button>
              <button @click=${() => this.emitAction('revert')}>Revert preview</button>
            `
            : html`<button class="primary" @click=${() => this.emitAction('start')}>Generate proposal</button>`}
        </div>
        ${preview && !canApply ? html`
          <div class="note warning">Responsive preview only. Apply is enabled on the dashboard's canonical ${document.breakpoint} breakpoint.</div>
        ` : nothing}
        ${selected ? html`
          <div class="meta">
            <label>Manual priority (0–100)
              <input type="number" min="0" max="100" step="1" .value=${String(priority)} ?disabled=${Boolean(preview)} @change=${this.updatePriority} placeholder="Auto">
            </label>
            <label>Semantic layout group
              <input type="text" .value=${String(group)} ?disabled=${Boolean(preview)} @change=${this.updateGroup} placeholder="Auto by card type">
            </label>
          </div>
          <div class="note">Manual values override explainable type-based scoring. Clear a field to return to automatic scoring/grouping.</div>
        ` : html`<div class="note">Select one card to override its layout priority or semantic group.</div>`}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-auto-layout-panel': FrakonAutoLayoutPanel;
  }
}

import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ConstraintDiagnostic } from '../../packages/studio-engine/src/constraints';
import type { SupportedLanguage } from '../i18n';
import { canvasDashboardTranslate } from './canvas-dashboard-i18n';
import { canvasV2ClipboardTranslate, type CanvasV2ClipboardTranslationKey } from './canvas-v2-clipboard-i18n';
import './canvas-v2-constraint-editor';
import './canvas-v2-item-toolbar';
import './canvas-v2-layer-toolbar';
import './canvas-v2-selection-toolbar';
import { DashboardCanvasV2ClipboardController } from './dashboard-canvas-v2-clipboard-controller';
import { summarizeDashboardCanvasV2ConstraintDiagnostics } from './dashboard-canvas-v2-constraint-diagnostics';
import type { DashboardCanvasV2InspectorItemPatch } from './dashboard-canvas-v2-inspector-actions';
import { dashboardCanvasV2InspectorSelection } from './dashboard-canvas-v2-inspector';
import type { FrakonDashboardDocumentV2 } from './layout-model-v2';

export type FrakonCanvasV2InspectorEditDetail =
  | { kind: 'item'; itemId: string; patch: DashboardCanvasV2InspectorItemPatch }
  | { kind: 'snap'; patch: { enabled?: boolean; size?: number } };

@customElement('frakon-canvas-v2-inspector-panel')
export class FrakonCanvasV2InspectorPanel extends LitElement {
  @property({ attribute: false }) document?: FrakonDashboardDocumentV2;
  @property({ attribute: false }) selectedIds: string[] = [];
  @property({ attribute: false }) selectedConstraintId?: string;
  @property({ attribute: false }) diagnostics: ConstraintDiagnostic[] = [];
  @property({ attribute: false }) language: SupportedLanguage = 'en';
  @state() private clipboardMessage?: string;

  private readonly clipboard = new DashboardCanvasV2ClipboardController();
  private readonly clipboardKeyHandler = (event: KeyboardEvent) => this.onClipboardKeyDown(event);

  static styles = css`
    :host { display: block; margin-top: 10px; }
    .panel { display: grid; gap: 9px; padding: 11px 12px; border-radius: 14px; background: color-mix(in srgb, var(--card-background-color) 90%, var(--primary-color) 10%); border: 1px solid color-mix(in srgb, var(--primary-text-color) 9%, transparent); }
    .title { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; font-weight: 700; }
    .summary { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .chip { padding: 4px 7px; border-radius: 999px; font-size: 11px; background: color-mix(in srgb, var(--primary-color) 12%, transparent); }
    .chip.warning { background: color-mix(in srgb, #f0a85a 20%, transparent); }
    .chip.error { background: color-mix(in srgb, #ff4d67 18%, transparent); }
    .clipboard { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
    .clipboard button { border:0; border-radius:8px; padding:6px 9px; color:inherit; background:color-mix(in srgb, var(--primary-color) 14%, transparent); cursor:pointer; font:inherit; font-size:11px; }
    .clipboard button:disabled { opacity:.38; cursor:not-allowed; }
    .clipboard-message { font-size:11px; opacity:.72; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .field { display: grid; gap: 3px; padding: 6px 7px; border-radius: 9px; background: color-mix(in srgb, var(--card-background-color) 92%, var(--primary-text-color) 8%); min-width: 0; }
    .label { font-size: 10px; opacity: .65; }
    input[type='number'] { width: 100%; min-width: 0; box-sizing: border-box; border: 0; border-radius: 6px; padding: 5px 6px; color: inherit; background: color-mix(in srgb, var(--card-background-color) 88%, var(--primary-text-color) 12%); font: inherit; }
    .toggle { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; }
    .issues { display: grid; gap: 5px; }
    .issue { font-size: 11px; padding: 6px 8px; border-radius: 8px; background: color-mix(in srgb, #f0a85a 12%, transparent); }
    @media (max-width: 600px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.clipboardKeyHandler);
  }

  disconnectedCallback(): void {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', this.clipboardKeyHandler);
    super.disconnectedCallback();
  }

  private t(key: Parameters<typeof canvasDashboardTranslate>[1]): string { return canvasDashboardTranslate(this.language, key); }
  private tc(key: CanvasV2ClipboardTranslationKey): string { return canvasV2ClipboardTranslate(this.language, key); }
  private dispatchEdit(detail: FrakonCanvasV2InspectorEditDetail): void { this.dispatchEvent(new CustomEvent<FrakonCanvasV2InspectorEditDetail>('frakon-canvas-v2-inspector-edit', { detail, bubbles: true, composed: true })); }
  private numberValue(event: Event): number | undefined { const value = Number((event.currentTarget as HTMLInputElement).value); return Number.isFinite(value) ? value : undefined; }
  private optionalNumberValue(event: Event): number | null | undefined { const raw = (event.currentTarget as HTMLInputElement).value.trim(); if (!raw) return null; const value = Number(raw); return Number.isFinite(value) ? value : undefined; }
  private itemField(itemId: string, key: 'x' | 'y' | 'width' | 'height', value: number, label: string) { return html`<label class="field"><span class="label">${label}</span><input type="number" .value=${String(Math.round(value))} @change=${(event: Event) => { const next = this.numberValue(event); if (next !== undefined) this.dispatchEdit({ kind: 'item', itemId, patch: { [key]: next } }); }}></label>`; }
  private optionalItemField(itemId: string, key: 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight', value: number | undefined, label: string) { return html`<label class="field"><span class="label">${label}</span><input type="number" min="1" .value=${value === undefined ? '' : String(Math.round(value))} @change=${(event: Event) => { const next = this.optionalNumberValue(event); if (next !== undefined) this.dispatchEdit({ kind: 'item', itemId, patch: { [key]: next } }); }}></label>`; }

  private canCopySelection(): boolean {
    return this.document?.items.some((item) => this.selectedIds.includes(item.id) && !item.locked) === true;
  }

  private canvasHasFocus(): boolean {
    const root = this.getRootNode();
    if (!(root instanceof ShadowRoot)) return false;
    const active = root.activeElement;
    return active instanceof HTMLElement && active.classList.contains('canvas');
  }

  private onClipboardKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || !(event.ctrlKey || event.metaKey) || !this.canvasHasFocus()) return;
    const key = event.key.toLowerCase();
    if (key === 'c' && this.canCopySelection()) {
      event.preventDefault();
      event.stopPropagation();
      this.copySelection();
      return;
    }
    if (key === 'x' && this.canCopySelection()) {
      event.preventDefault();
      event.stopPropagation();
      this.cutSelection();
      return;
    }
    if (key === 'v' && this.clipboard.canPaste) {
      event.preventDefault();
      event.stopPropagation();
      this.pasteSelection();
    }
  }

  private copySelection(): void {
    if (!this.document) return;
    const copied = this.clipboard.copy(this.document, this.selectedIds);
    this.clipboardMessage = this.tc(copied ? 'copied' : 'copyUnavailable');
  }

  private cutSelection(): void {
    if (!this.document) return;
    const result = this.clipboard.cut(this.document, this.selectedIds);
    if (result.status !== 'committed') {
      this.clipboardMessage = this.tc('copyUnavailable');
      return;
    }
    this.clipboardMessage = this.tc('cutDone');
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-draft', {
      detail: { status: 'committed', document: result.document, collisionIds: [], constraintDiagnostics: [] },
      bubbles: true,
      composed: true,
    }));
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-selection-set', {
      detail: { selectedIds: [] },
      bubbles: true,
      composed: true,
    }));
  }

  private pasteSelection(): void {
    if (!this.document) return;
    const result = this.clipboard.paste(this.document);
    if (result.status !== 'committed') {
      this.clipboardMessage = this.tc('pasteUnavailable');
      return;
    }
    this.clipboardMessage = this.tc('pasted');
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-draft', {
      detail: { status: 'committed', document: result.document, collisionIds: [], constraintDiagnostics: [] },
      bubbles: true,
      composed: true,
    }));
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-selection-set', {
      detail: { selectedIds: result.selectedIds },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.document) return nothing;
    const selection = dashboardCanvasV2InspectorSelection(this.document, this.selectedIds);
    const diagnostics = summarizeDashboardCanvasV2ConstraintDiagnostics(this.diagnostics);
    const single = selection.single;
    const diagnosticClass = diagnostics.severity === 'error' ? 'error' : diagnostics.severity === 'warning' ? 'warning' : '';
    const canCopy = this.canCopySelection();
    return html`<section class="panel">
      <div class="title"><span>${this.t('inspector')}</span><span>${selection.count} ${this.t('selected')}</span></div>
      <div class="summary">
        <label class="toggle"><input type="checkbox" .checked=${selection.snapEnabled} @change=${(event: Event) => this.dispatchEdit({ kind: 'snap', patch: { enabled: (event.currentTarget as HTMLInputElement).checked } })}>${this.t('snap')}</label>
        <label class="toggle">px <input type="number" min="1" style="width:68px" .value=${String(selection.snapSize)} @change=${(event: Event) => { const size = this.numberValue(event); if (size !== undefined) this.dispatchEdit({ kind: 'snap', patch: { size } }); }}></label>
        <span class="chip">${this.t('locked')}: ${selection.lockedCount}</span><span class="chip">${this.t('constraints')}: ${selection.constraintCount}</span><span class="chip ${diagnosticClass}">${this.t('diagnostics')}: ${diagnostics.applied}/${diagnostics.total}</span>
      </div>
      <div class="clipboard">
        <button ?disabled=${!canCopy} @click=${this.copySelection}>${this.tc('copy')}</button>
        <button ?disabled=${!canCopy} @click=${this.cutSelection}>${this.tc('cut')}</button>
        <button ?disabled=${!this.clipboard.canPaste} @click=${this.pasteSelection}>${this.tc('paste')}</button>
        ${this.clipboardMessage ? html`<span class="clipboard-message">${this.clipboardMessage}</span>` : nothing}
      </div>
      ${single ? html`<div class="grid">${this.itemField(single.id,'x',single.frame.x,'X')}${this.itemField(single.id,'y',single.frame.y,'Y')}${this.itemField(single.id,'width',single.frame.width,'W')}${this.itemField(single.id,'height',single.frame.height,'H')}${this.optionalItemField(single.id,'minWidth',single.minWidth,'min W')}${this.optionalItemField(single.id,'minHeight',single.minHeight,'min H')}${this.optionalItemField(single.id,'maxWidth',single.maxWidth,'max W')}${this.optionalItemField(single.id,'maxHeight',single.maxHeight,'max H')}</div><label class="toggle"><input type="checkbox" .checked=${single.locked === true} @change=${(event: Event) => this.dispatchEdit({ kind: 'item', itemId: single.id, patch: { locked: (event.currentTarget as HTMLInputElement).checked } })}>${this.t('locked')}</label>` : nothing}
      <frakon-canvas-v2-item-toolbar .document=${this.document} .selectedIds=${this.selectedIds} .language=${this.language}></frakon-canvas-v2-item-toolbar>
      <frakon-canvas-v2-layer-toolbar .document=${this.document} .selectedIds=${this.selectedIds} .language=${this.language}></frakon-canvas-v2-layer-toolbar>
      <frakon-canvas-v2-selection-toolbar .document=${this.document} .selectedIds=${this.selectedIds} .language=${this.language}></frakon-canvas-v2-selection-toolbar>
      <frakon-canvas-v2-constraint-editor .document=${this.document} .selectedIds=${this.selectedIds} .selectedConstraintId=${this.selectedConstraintId} .language=${this.language}></frakon-canvas-v2-constraint-editor>
      ${diagnostics.issues.length ? html`<div class="issues">${diagnostics.issues.map((issue) => html`<div class="issue">${issue.constraintId} · ${issue.status} · ${issue.message}</div>`)}</div>` : nothing}
    </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-inspector-panel': FrakonCanvasV2InspectorPanel; } }

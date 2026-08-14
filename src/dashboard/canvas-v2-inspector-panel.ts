import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ConstraintDiagnostic } from '../../packages/studio-engine/src/constraints';
import type { HomeAssistant } from '../home-assistant/types';
import type { SupportedLanguage } from '../i18n';
import './card-palette';
import type { FrakonCardTemplateSelectedDetail } from './card-palette';
import { canvasDashboardTranslate } from './canvas-dashboard-i18n';
import { canvasV2CardConfigTranslate, type CanvasV2CardConfigTranslationKey } from './canvas-v2-card-config-i18n';
import { canvasV2ClipboardTranslate, type CanvasV2ClipboardTranslationKey } from './canvas-v2-clipboard-i18n';
import './canvas-v2-constraint-editor';
import './canvas-v2-entity-field';
import type { FrakonCanvasV2EntityChangedDetail } from './canvas-v2-entity-field';
import './canvas-v2-entity-list-field';
import type { FrakonCanvasV2EntityListChangedDetail } from './canvas-v2-entity-list-field';
import './canvas-v2-item-toolbar';
import './canvas-v2-layer-toolbar';
import './canvas-v2-selection-toolbar';
import './canvas-v2-surface-editor';
import { dashboardCanvasV2CardConfigFields, patchDashboardCanvasV2CardConfig, type DashboardCanvasV2CardConfigField } from './dashboard-canvas-v2-card-config';
import { DashboardCanvasV2ClipboardController } from './dashboard-canvas-v2-clipboard-controller';
import { summarizeDashboardCanvasV2ConstraintDiagnostics } from './dashboard-canvas-v2-constraint-diagnostics';
import { insertDashboardCanvasV2Card } from './dashboard-canvas-v2-insert-card';
import type { DashboardCanvasV2InspectorItemPatch } from './dashboard-canvas-v2-inspector-actions';
import { dashboardCanvasV2InspectorSelection } from './dashboard-canvas-v2-inspector';
import { editorTranslate, resolveEditorLanguage } from './editor-i18n';
import type { FrakonCanvasItem, FrakonDashboardDocumentV2 } from './layout-model-v2';

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
  @state() private cardConfigMessage?: string;
  @state() private showPalette = false;

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
    .clipboard button.primary { background:color-mix(in srgb, var(--primary-color) 24%, transparent); font-weight:700; }
    .clipboard button:disabled { opacity:.38; cursor:not-allowed; }
    .clipboard-message { font-size:11px; opacity:.72; }
    .palette-wrap { margin-top:2px; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .config-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; }
    .field { display: grid; gap: 3px; padding: 6px 7px; border-radius: 9px; background: color-mix(in srgb, var(--card-background-color) 92%, var(--primary-text-color) 8%); min-width: 0; }
    .label { font-size: 10px; opacity: .65; }
    input[type='number'], input[type='text'], select { width: 100%; min-width: 0; box-sizing: border-box; border: 0; border-radius: 6px; padding: 5px 6px; color: inherit; background: color-mix(in srgb, var(--card-background-color) 88%, var(--primary-text-color) 12%); font: inherit; }
    .toggle { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; }
    .option { min-height:32px; padding:6px 8px; border-radius:9px; background:color-mix(in srgb, var(--card-background-color) 92%, var(--primary-text-color) 8%); }
    .config-error { padding:7px 9px; border-radius:9px; font-size:11px; background:color-mix(in srgb, #ff4d67 16%, transparent); }
    .issues { display: grid; gap: 5px; }
    .issue { font-size: 11px; padding: 6px 8px; border-radius: 8px; background: color-mix(in srgb, #f0a85a 12%, transparent); }
    @media (max-width: 600px) { .grid, .config-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.clipboardKeyHandler);
  }

  disconnectedCallback(): void {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', this.clipboardKeyHandler);
    super.disconnectedCallback();
  }

  private inheritedHass(): HomeAssistant | undefined {
    const root = this.getRootNode();
    if (!(root instanceof ShadowRoot)) return undefined;
    return (root.host as HTMLElement & { hass?: HomeAssistant }).hass;
  }

  private t(key: Parameters<typeof canvasDashboardTranslate>[1]): string { return canvasDashboardTranslate(this.language, key); }
  private tc(key: CanvasV2ClipboardTranslationKey): string { return canvasV2ClipboardTranslate(this.language, key); }
  private tcc(key: CanvasV2CardConfigTranslationKey): string { return canvasV2CardConfigTranslate(this.language, key); }
  private te(key: Parameters<typeof editorTranslate>[1]): string { return editorTranslate(resolveEditorLanguage(this.language), key); }
  private dispatchEdit(detail: FrakonCanvasV2InspectorEditDetail): void { this.dispatchEvent(new CustomEvent<FrakonCanvasV2InspectorEditDetail>('frakon-canvas-v2-inspector-edit', { detail, bubbles: true, composed: true })); }
  private numberValue(event: Event): number | undefined { const value = Number((event.currentTarget as HTMLInputElement).value); return Number.isFinite(value) ? value : undefined; }
  private optionalNumberValue(event: Event): number | null | undefined { const raw = (event.currentTarget as HTMLInputElement).value.trim(); if (!raw) return null; const value = Number(raw); return Number.isFinite(value) ? value : undefined; }
  private itemField(itemId: string, key: 'x' | 'y' | 'width' | 'height', value: number, label: string) { return html`<label class="field"><span class="label">${label}</span><input type="number" .value=${String(Math.round(value))} @change=${(event: Event) => { const next = this.numberValue(event); if (next !== undefined) this.dispatchEdit({ kind: 'item', itemId, patch: { [key]: next } }); }}></label>`; }
  private optionalItemField(itemId: string, key: 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight', value: number | undefined, label: string) { return html`<label class="field"><span class="label">${label}</span><input type="number" min="1" .value=${value === undefined ? '' : String(Math.round(value))} @change=${(event: Event) => { const next = this.optionalNumberValue(event); if (next !== undefined) this.dispatchEdit({ kind: 'item', itemId, patch: { [key]: next } }); }}></label>`; }

  private cardFieldLabel(field: DashboardCanvasV2CardConfigField): string {
    if (field.key === 'entity') return this.te('entity');
    if (field.key === 'name') return this.te('name');
    if (field.key === 'title') return this.te('title');
    const labels: Record<Exclude<DashboardCanvasV2CardConfigField['key'], 'entity' | 'name' | 'title'>, CanvasV2CardConfigTranslationKey> = {
      temperature_entity: 'temperatureEntity', humidity_entity: 'humidityEntity', range_entity: 'rangeEntity', charging_power_entity: 'chargingPowerEntity', charging_switch_entity: 'chargingSwitchEntity', energy_entity: 'energyEntity', price_entity: 'priceEntity', unit: 'unit', light_entities: 'lightEntities', show_brightness: 'showBrightness', show_color_temperature: 'showColorTemperature', show_position: 'showPosition', show_state: 'showState', show_volume: 'showVolume', compact: 'compact', step: 'temperatureStep', precision: 'precision', aspect_ratio: 'aspectRatio',
    };
    return this.tcc(labels[field.key as keyof typeof labels]);
  }

  private renderCardConfigField(item: FrakonCanvasItem, field: DashboardCanvasV2CardConfigField) {
    const value = item.card[field.key];
    const label = this.cardFieldLabel(field);
    if (field.kind === 'boolean') {
      return html`<label class="toggle option"><input type="checkbox" .checked=${value === true} @change=${(event: Event) => this.patchCardConfig(item.id, field.key, (event.currentTarget as HTMLInputElement).checked)}>${label}</label>`;
    }
    if (field.kind === 'number') {
      return html`<label class="field"><span class="label">${label}</span><input type="number" min=${String(field.min)} max=${String(field.max)} step=${field.integer ? '1' : '0.1'} .value=${typeof value === 'number' ? String(value) : ''} @change=${(event: Event) => { const next = Number((event.currentTarget as HTMLInputElement).value); if (Number.isFinite(next)) this.patchCardConfig(item.id, field.key, next); }}></label>`;
    }
    if (field.kind === 'select') {
      return html`<label class="field"><span class="label">${label}</span><select .value=${typeof value === 'string' && field.options.includes(value) ? value : field.options[0]} @change=${(event: Event) => this.patchCardConfig(item.id, field.key, (event.currentTarget as HTMLSelectElement).value)}>${field.options.map((option) => html`<option value=${option}>${option.replaceAll(' ', '')}</option>`)}</select></label>`;
    }
    if (field.kind === 'entity-list') {
      const selected = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
      return html`<frakon-canvas-v2-entity-list-field .hass=${this.inheritedHass()} .domains=${field.domains} .selected=${selected} .label=${label} @frakon-canvas-v2-entity-list-changed=${(event: CustomEvent<FrakonCanvasV2EntityListChangedDetail>) => this.patchCardConfig(item.id, field.key, event.detail.value)}></frakon-canvas-v2-entity-list-field>`;
    }
    if (field.kind === 'entity') {
      const serialized = typeof value === 'string' ? value : '';
      return html`<frakon-canvas-v2-entity-field .hass=${this.inheritedHass()} .domains=${field.domains} .deviceClasses=${field.deviceClasses} .value=${serialized} .label=${label} .required=${field.required === true} @frakon-canvas-v2-entity-changed=${(event: CustomEvent<FrakonCanvasV2EntityChangedDetail>) => this.patchCardConfig(item.id, field.key, event.detail.value)}></frakon-canvas-v2-entity-field>`;
    }
    const serialized = typeof value === 'string' ? value : '';
    return html`<label class="field"><span class="label">${label}</span><input type="text" .value=${serialized} @change=${(event: Event) => this.patchCardConfig(item.id, field.key, (event.currentTarget as HTMLInputElement).value)}></label>`;
  }

  private patchCardConfig(itemId: string, key: string, value: unknown): void {
    if (!this.document) return;
    const result = patchDashboardCanvasV2CardConfig(this.document, itemId, { [key]: value });
    if (result.status === 'invalid' || result.status === 'missing-item') {
      this.cardConfigMessage = `${this.te('invalidConfig')} ${result.reason ?? ''}`.trim();
      this.requestUpdate();
      return;
    }
    if (result.status !== 'committed') return;
    this.cardConfigMessage = undefined;
    this.commitDocument(result.document, [itemId]);
  }

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
    if (key === 'c' && this.canCopySelection()) { event.preventDefault(); event.stopPropagation(); this.copySelection(); return; }
    if (key === 'x' && this.canCopySelection()) { event.preventDefault(); event.stopPropagation(); this.cutSelection(); return; }
    if (key === 'v' && this.clipboard.canPaste) { event.preventDefault(); event.stopPropagation(); this.pasteSelection(); }
  }

  private copySelection(): void {
    if (!this.document) return;
    const copied = this.clipboard.copy(this.document, this.selectedIds);
    this.clipboardMessage = this.tc(copied ? 'copied' : 'copyUnavailable');
  }

  private cutSelection(): void {
    if (!this.document) return;
    const result = this.clipboard.cut(this.document, this.selectedIds);
    if (result.status !== 'committed') { this.clipboardMessage = this.tc('copyUnavailable'); return; }
    this.clipboardMessage = this.tc('cutDone');
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-draft', { detail: { status: 'committed', document: result.document, collisionIds: [], constraintDiagnostics: [] }, bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-selection-set', { detail: { selectedIds: [] }, bubbles: true, composed: true }));
  }

  private pasteSelection(): void {
    if (!this.document) return;
    const result = this.clipboard.paste(this.document);
    if (result.status !== 'committed') { this.clipboardMessage = this.tc('pasteUnavailable'); return; }
    this.clipboardMessage = this.tc('pasted');
    this.commitDocument(result.document, result.selectedIds);
  }

  private addCard(event: CustomEvent<FrakonCardTemplateSelectedDetail>): void {
    if (!this.document) return;
    event.stopPropagation();
    const result = insertDashboardCanvasV2Card(this.document, event.detail.template);
    if (result.status !== 'committed') return;
    this.showPalette = false;
    this.cardConfigMessage = undefined;
    this.commitDocument(result.document, result.selectedIds);
  }

  private commitDocument(document: FrakonDashboardDocumentV2, selectedIds: string[]): void {
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-draft', { detail: { status: 'committed', document, collisionIds: [], constraintDiagnostics: [] }, bubbles: true, composed: true }));
    this.dispatchEvent(new CustomEvent('frakon-canvas-v2-selection-set', { detail: { selectedIds }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.document) return nothing;
    const selection = dashboardCanvasV2InspectorSelection(this.document, this.selectedIds);
    const diagnostics = summarizeDashboardCanvasV2ConstraintDiagnostics(this.diagnostics);
    const single = selection.single;
    const diagnosticClass = diagnostics.severity === 'error' ? 'error' : diagnostics.severity === 'warning' ? 'warning' : '';
    const canCopy = this.canCopySelection();
    const cardFields = single ? dashboardCanvasV2CardConfigFields(single.card) : [];
    return html`<section class="panel">
      <div class="title"><span>${this.t('inspector')}</span><span>${selection.count} ${this.t('selected')}</span></div>
      <div class="summary">
        <label class="toggle"><input type="checkbox" .checked=${selection.snapEnabled} @change=${(event: Event) => this.dispatchEdit({ kind: 'snap', patch: { enabled: (event.currentTarget as HTMLInputElement).checked } })}>${this.t('snap')}</label>
        <label class="toggle">px <input type="number" min="1" style="width:68px" .value=${String(selection.snapSize)} @change=${(event: Event) => { const size = this.numberValue(event); if (size !== undefined) this.dispatchEdit({ kind: 'snap', patch: { size } }); }}></label>
        <span class="chip">${this.t('locked')}: ${selection.lockedCount}</span><span class="chip">${this.t('constraints')}: ${selection.constraintCount}</span><span class="chip ${diagnosticClass}">${this.t('diagnostics')}: ${diagnostics.applied}/${diagnostics.total}</span>
      </div>
      <div class="clipboard">
        <button class="primary" @click=${() => { this.showPalette = !this.showPalette; }}>${this.te('addCard')}</button>
        <button ?disabled=${!canCopy} @click=${this.copySelection}>${this.tc('copy')}</button>
        <button ?disabled=${!canCopy} @click=${this.cutSelection}>${this.tc('cut')}</button>
        <button ?disabled=${!this.clipboard.canPaste} @click=${this.pasteSelection}>${this.tc('paste')}</button>
        ${this.clipboardMessage ? html`<span class="clipboard-message">${this.clipboardMessage}</span>` : nothing}
      </div>
      ${this.showPalette ? html`<div class="palette-wrap"><frakon-card-palette .language=${this.language} @frakon-card-template-selected=${this.addCard}></frakon-card-palette></div>` : nothing}
      ${single ? html`
        <div class="config-grid">${cardFields.map((field) => this.renderCardConfigField(single, field))}</div>
        ${this.cardConfigMessage ? html`<div class="config-error">${this.cardConfigMessage}</div>` : nothing}
        <div class="grid">${this.itemField(single.id,'x',single.frame.x,'X')}${this.itemField(single.id,'y',single.frame.y,'Y')}${this.itemField(single.id,'width',single.frame.width,'W')}${this.itemField(single.id,'height',single.frame.height,'H')}${this.optionalItemField(single.id,'minWidth',single.minWidth,'min W')}${this.optionalItemField(single.id,'minHeight',single.minHeight,'min H')}${this.optionalItemField(single.id,'maxWidth',single.maxWidth,'max W')}${this.optionalItemField(single.id,'maxHeight',single.maxHeight,'max H')}</div>
        <label class="toggle"><input type="checkbox" .checked=${single.locked === true} @change=${(event: Event) => this.dispatchEdit({ kind: 'item', itemId: single.id, patch: { locked: (event.currentTarget as HTMLInputElement).checked } })}>${this.t('locked')}</label>
      ` : nothing}
      <frakon-canvas-v2-surface-editor .document=${this.document} .selectedIds=${this.selectedIds}></frakon-canvas-v2-surface-editor>
      <frakon-canvas-v2-item-toolbar .document=${this.document} .selectedIds=${this.selectedIds} .language=${this.language}></frakon-canvas-v2-item-toolbar>
      <frakon-canvas-v2-layer-toolbar .document=${this.document} .selectedIds=${this.selectedIds} .language=${this.language}></frakon-canvas-v2-layer-toolbar>
      <frakon-canvas-v2-selection-toolbar .document=${this.document} .selectedIds=${this.selectedIds} .language=${this.language}></frakon-canvas-v2-selection-toolbar>
      <frakon-canvas-v2-constraint-editor .document=${this.document} .selectedIds=${this.selectedIds} .selectedConstraintId=${this.selectedConstraintId} .language=${this.language}></frakon-canvas-v2-constraint-editor>
      ${diagnostics.issues.length ? html`<div class="issues">${diagnostics.issues.map((issue) => html`<div class="issue">${issue.constraintId} · ${issue.status} · ${issue.message}</div>`)}</div>` : nothing}
    </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-inspector-panel': FrakonCanvasV2InspectorPanel; } }
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../home-assistant/types';
import type { SupportedLanguage } from '../i18n';
import { canvasV2CardConfigTranslate } from './canvas-v2-card-config-i18n';
import { dashboardCanvasV2EntityOptions, filterDashboardCanvasV2EntityOptions } from './dashboard-canvas-v2-entity-options';

export interface FrakonCanvasV2EntityChangedDetail { value: string; }

@customElement('frakon-canvas-v2-entity-field')
export class FrakonCanvasV2EntityField extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) domains?: readonly string[];
  @property({ attribute: false }) deviceClasses?: readonly string[];
  @property() value = '';
  @property() label = '';
  @property({ attribute: false }) language?: SupportedLanguage;
  @property({ type: Boolean }) required = false;
  @state() private query = '';
  @state() private open = false;

  static styles = css`
    :host { display:block; min-width:0; }
    .field { position:relative; display:grid; gap:4px; padding:6px 7px; border-radius:9px; background:color-mix(in srgb, var(--card-background-color) 92%, var(--primary-text-color) 8%); }
    .label { font-size:10px; opacity:.65; }
    input { width:100%; min-width:0; box-sizing:border-box; border:0; border-radius:6px; padding:6px 7px; color:inherit; background:color-mix(in srgb, var(--card-background-color) 88%, var(--primary-text-color) 12%); font:inherit; }
    .menu { display:grid; gap:2px; max-height:220px; overflow:auto; padding:4px; border-radius:8px; border:1px solid color-mix(in srgb, var(--primary-text-color) 10%, transparent); background:var(--card-background-color); box-shadow:0 10px 24px rgba(0,0,0,.16); }
    button { display:grid; gap:1px; width:100%; text-align:left; border:0; border-radius:6px; padding:6px 7px; color:inherit; background:transparent; cursor:pointer; font:inherit; font-size:11px; }
    button:hover, button.active { background:color-mix(in srgb, var(--primary-color) 14%, transparent); }
    .id { font-size:9px; opacity:.55; }
    .empty { padding:6px 7px; font-size:10px; opacity:.55; }
  `;

  private effectiveLanguage(): SupportedLanguage {
    if (this.language) return this.language;
    const root = this.getRootNode();
    if (root instanceof ShadowRoot) {
      const inherited = (root.host as HTMLElement & { language?: SupportedLanguage }).language;
      if (inherited) return inherited;
    }
    return 'en';
  }

  private t(key: 'searchEntity' | 'noMatchingEntities'): string {
    return canvasV2CardConfigTranslate(this.effectiveLanguage(), key);
  }

  private allOptions() {
    return dashboardCanvasV2EntityOptions(this.hass, this.domains, this.value, this.deviceClasses);
  }

  private options() {
    return filterDashboardCanvasV2EntityOptions(this.allOptions(), this.query);
  }

  private select(value: string): void {
    if (!value && this.required) return;
    this.value = value;
    this.query = '';
    this.open = false;
    this.dispatchEvent(new CustomEvent<FrakonCanvasV2EntityChangedDetail>('frakon-canvas-v2-entity-changed', {
      detail: { value }, bubbles: true, composed: true,
    }));
  }

  render() {
    const options = this.options();
    const selected = this.allOptions().find((option) => option.entityId === this.value);
    const display = this.open ? this.query : selected?.label ?? this.value;
    return html`<label class="field"><span class="label">${this.label}</span>
      <input type="search" .value=${display} placeholder=${this.t('searchEntity')} @focus=${() => { this.open = true; this.query = ''; }} @input=${(event:Event) => { this.open = true; this.query = (event.currentTarget as HTMLInputElement).value; }} @keydown=${(event:KeyboardEvent) => { if (event.key === 'Escape') { this.open = false; this.query = ''; (event.currentTarget as HTMLInputElement).blur(); } }}>
      ${this.open ? html`<div class="menu">
        ${!this.required ? html`<button class=${this.value === '' ? 'active' : ''} @mousedown=${(event:MouseEvent) => event.preventDefault()} @click=${() => this.select('')}>—</button>` : ''}
        ${options.length ? options.map((option) => html`<button class=${option.entityId === this.value ? 'active' : ''} @mousedown=${(event:MouseEvent) => event.preventDefault()} @click=${() => this.select(option.entityId)}><span>${option.label}</span><span class="id">${option.entityId}</span></button>`) : html`<span class="empty">${this.t('noMatchingEntities')}</span>`}
      </div>` : ''}
    </label>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-canvas-v2-entity-field': FrakonCanvasV2EntityField; } }

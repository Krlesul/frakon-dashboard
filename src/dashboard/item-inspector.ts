import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../home-assistant/types';
import { editorTranslate, resolveEditorLanguage } from './editor-i18n';
import type { FrakonGridItem } from './layout-model';

export interface FrakonItemUpdateDetail {
  id: string;
  card: Record<string, unknown>;
}

const cardTypes = [
  'custom:frakon-card',
  'custom:frakon-light-card',
  'custom:frakon-sensor-card',
  'custom:frakon-cover-card',
  'custom:frakon-climate-card',
  'custom:frakon-room-card',
  'custom:frakon-camera-card',
  'custom:frakon-media-player-card',
  'custom:frakon-vehicle-card',
];

@customElement('frakon-item-inspector')
export class FrakonItemInspector extends LitElement {
  @property({ attribute: false }) item?: FrakonGridItem;
  @property({ attribute: false }) hass?: HomeAssistant;
  @property() language?: string;
  @state() private draft = '';
  @state() private error?: string;
  @state() private advancedOpen = false;

  static styles = css`
    :host { display:block; }
    .panel { display:grid; gap:14px; margin:0 0 16px; padding:16px; border:1px solid color-mix(in srgb,var(--primary-text-color) 12%,transparent); border-radius:18px; background:color-mix(in srgb,var(--card-background-color) 94%,var(--primary-color) 6%); }
    header { display:flex; justify-content:space-between; align-items:center; gap:12px; }
    h3 { margin:0; font-size:16px; }
    .meta { opacity:.62; font-size:12px; }
    .form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
    label { display:grid; gap:6px; font-size:12px; font-weight:650; }
    input,select,textarea { box-sizing:border-box; width:100%; border:1px solid var(--divider-color); border-radius:11px; color:inherit; background:var(--card-background-color); }
    input,select { min-height:42px; padding:0 11px; }
    textarea { min-height:180px; resize:vertical; padding:12px; font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
    .actions { display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; }
    button { border:0; border-radius:10px; padding:8px 12px; color:inherit; background:color-mix(in srgb,var(--primary-text-color) 10%,transparent); cursor:pointer; }
    button.primary { background:var(--primary-color); color:var(--text-primary-color,#fff); }
    .error { padding:9px 11px; border-radius:10px; background:color-mix(in srgb,#ff4d67 16%,transparent); font-size:13px; }
    .advanced { display:grid; gap:10px; padding-top:4px; border-top:1px solid var(--divider-color); }
    @media (max-width:700px) { .form { grid-template-columns:1fr; } }
  `;

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('item')) {
      this.draft = this.item ? JSON.stringify(this.item.card, null, 2) : '';
      this.error = undefined;
    }
  }

  private parsedDraft(): Record<string, unknown> {
    const parsed: unknown = JSON.parse(this.draft);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid-object');
    return parsed as Record<string, unknown>;
  }

  private updateField(key: string, value: string): void {
    const lang = resolveEditorLanguage(this.language, this.hass?.locale?.language, this.hass?.language);
    try {
      const card = this.parsedDraft();
      const next = { ...card };
      if (value.trim()) next[key] = value.trim();
      else delete next[key];
      this.draft = JSON.stringify(next, null, 2);
      this.error = undefined;
    } catch {
      this.error = editorTranslate(lang, 'invalidConfig');
    }
  }

  private reset(): void {
    this.draft = this.item ? JSON.stringify(this.item.card, null, 2) : '';
    this.error = undefined;
  }

  private apply(): void {
    if (!this.item) return;
    const lang = resolveEditorLanguage(this.language, this.hass?.locale?.language, this.hass?.language);
    try {
      const card = this.parsedDraft();
      if (typeof card.type !== 'string' || !card.type) throw new Error('missing-type');
      this.error = undefined;
      this.dispatchEvent(new CustomEvent<FrakonItemUpdateDetail>('frakon-item-config-changed', {
        detail:{ id:this.item.id, card }, bubbles:true, composed:true,
      }));
    } catch (error) {
      this.error = error instanceof Error && error.message === 'missing-type'
        ? editorTranslate(lang, 'requiresType')
        : editorTranslate(lang, 'invalidConfig');
    }
  }

  private close(): void {
    this.dispatchEvent(new CustomEvent('frakon-item-inspector-close', { bubbles:true, composed:true }));
  }

  render() {
    if (!this.item) return nothing;
    const lang = resolveEditorLanguage(this.language, this.hass?.locale?.language, this.hass?.language);
    let card: Record<string, unknown> = this.item.card;
    try { card = this.parsedDraft(); } catch { /* keep last valid form values */ }
    const entities = Object.keys(this.hass?.states ?? {}).sort();
    return html`
      <section class="panel">
        <header><div><h3>${editorTranslate(lang,'cardConfiguration')}</h3><div class="meta">${this.item.id} · ${this.item.w} × ${this.item.h}</div></div><button @click=${this.close}>${editorTranslate(lang,'close')}</button></header>
        ${this.error ? html`<div class="error">${this.error}</div>` : nothing}
        <div class="form">
          <label>${editorTranslate(lang,'cardType')}
            <select .value=${String(card.type ?? 'custom:frakon-card')} @change=${(event:Event) => this.updateField('type',(event.target as HTMLSelectElement).value)}>
              ${cardTypes.map((type) => html`<option value=${type}>${type.replace('custom:frakon-','').replace('-card','')}</option>`)}
            </select>
          </label>
          <label>${editorTranslate(lang,'entity')}
            <input list="frakon-entity-list" .value=${String(card.entity ?? '')} @input=${(event:Event) => this.updateField('entity',(event.target as HTMLInputElement).value)}>
            <datalist id="frakon-entity-list">${entities.map((entity) => html`<option value=${entity}></option>`)}</datalist>
          </label>
          <label>${editorTranslate(lang,'name')}<input .value=${String(card.name ?? '')} @input=${(event:Event) => this.updateField('name',(event.target as HTMLInputElement).value)}></label>
          <label>${editorTranslate(lang,'icon')}<input placeholder="mdi:home" .value=${String(card.icon ?? '')} @input=${(event:Event) => this.updateField('icon',(event.target as HTMLInputElement).value)}></label>
        </div>
        <div class="advanced">
          <button @click=${() => { this.advancedOpen = !this.advancedOpen; }}>${editorTranslate(lang,this.advancedOpen ? 'hideAdvanced' : 'showAdvanced')}</button>
          ${this.advancedOpen ? html`<textarea .value=${this.draft} @input=${(event:Event) => { this.draft = (event.target as HTMLTextAreaElement).value; }}></textarea>` : nothing}
        </div>
        <div class="actions"><button @click=${this.reset}>${editorTranslate(lang,'reset')}</button><button class="primary" @click=${this.apply}>${editorTranslate(lang,'apply')}</button></div>
      </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-item-inspector': FrakonItemInspector; } }

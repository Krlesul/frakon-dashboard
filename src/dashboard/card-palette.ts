import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { filterCardCatalog, type FrakonCardCategory, type FrakonCardTemplate } from './card-catalog';
import { editorTranslate, resolveEditorLanguage } from './editor-i18n';

export interface FrakonCardTemplateSelectedDetail {
  template: FrakonCardTemplate;
}

const categoryKeys: Array<{ value: FrakonCardCategory | 'all'; key: 'all' | 'general' | 'lighting' | 'climate' | 'security' | 'media' | 'energy' | 'vehicle' }> = [
  { value:'all', key:'all' },
  { value:'general', key:'general' },
  { value:'lighting', key:'lighting' },
  { value:'climate', key:'climate' },
  { value:'security', key:'security' },
  { value:'media', key:'media' },
  { value:'energy', key:'energy' },
  { value:'vehicle', key:'vehicle' },
];

@customElement('frakon-card-palette')
export class FrakonCardPalette extends LitElement {
  @property() language?: string;
  @state() private query = '';
  @state() private category: FrakonCardCategory | 'all' = 'all';

  static styles = css`
    :host { display:block; }
    .palette { display:grid; gap:12px; margin:0 0 16px; padding:16px; border:1px solid color-mix(in srgb,var(--primary-text-color) 12%,transparent); border-radius:18px; background:color-mix(in srgb,var(--card-background-color) 94%,var(--primary-color) 6%); }
    header { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
    h3 { margin:0; font-size:16px; }
    .filters { display:grid; grid-template-columns:minmax(160px,1fr) minmax(130px,auto); gap:8px; }
    input,select { box-sizing:border-box; width:100%; min-height:40px; padding:0 11px; border:1px solid var(--divider-color); border-radius:10px; color:inherit; background:var(--card-background-color); }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; }
    button { display:grid; gap:6px; min-height:100px; padding:12px; border:1px solid color-mix(in srgb,var(--primary-text-color) 10%,transparent); border-radius:14px; color:inherit; background:color-mix(in srgb,var(--card-background-color) 90%,var(--primary-color) 10%); text-align:left; cursor:pointer; }
    button:hover { border-color:var(--primary-color); transform:translateY(-1px); }
    strong { font-size:14px; }
    .description { opacity:.68; font-size:12px; line-height:1.4; }
    .meta { font-size:11px; text-transform:uppercase; letter-spacing:.06em; opacity:.52; }
    .empty { padding:18px; text-align:center; opacity:.62; }
  `;

  private selectTemplate(template: FrakonCardTemplate): void {
    this.dispatchEvent(new CustomEvent<FrakonCardTemplateSelectedDetail>('frakon-card-template-selected', {
      detail:{ template }, bubbles:true, composed:true,
    }));
  }

  render() {
    const lang = resolveEditorLanguage(this.language);
    const templates = filterCardCatalog(this.query, this.category);
    return html`
      <section class="palette">
        <header><h3>${editorTranslate(lang,'addCard')}</h3><span>${templates.length} ${editorTranslate(lang,'available')}</span></header>
        <div class="filters">
          <input placeholder=${editorTranslate(lang,'searchCards')} .value=${this.query} @input=${(event:Event) => { this.query = (event.target as HTMLInputElement).value; }}>
          <select .value=${this.category} @change=${(event:Event) => { this.category = (event.target as HTMLSelectElement).value as FrakonCardCategory | 'all'; }}>
            ${categoryKeys.map((category) => html`<option value=${category.value}>${editorTranslate(lang,category.key)}</option>`)}
          </select>
        </div>
        <div class="cards">
          ${templates.map((template) => html`<button @click=${() => this.selectTemplate(template)}>
            <strong>${template.name}</strong>
            <span class="description">${template.description}</span>
            <span class="meta">${editorTranslate(lang,template.category)} · ${template.defaultWidth} × ${template.defaultHeight}</span>
          </button>`)}
        </div>
        ${templates.length === 0 ? html`<div class="empty">${editorTranslate(lang,'noMatchingCards')}</div>` : ''}
      </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-card-palette': FrakonCardPalette; } }

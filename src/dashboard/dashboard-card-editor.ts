import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../home-assistant/types';
import type { FrakonDashboardCardConfig } from './dashboard-card';
import { editorTranslate, resolveEditorLanguage } from './editor-i18n';
import { defaultResponsiveColumns, type ResponsiveColumns } from './responsive-layout';

@customElement('frakon-dashboard-card-editor')
export class FrakonDashboardCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonDashboardCardConfig;

  static styles = css`
    :host{display:block;color:var(--primary-text-color)}
    .editor{display:grid;gap:16px}.section{display:grid;gap:12px;padding:16px;border:1px solid var(--divider-color);border-radius:16px}
    .title{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.68}
    label{display:grid;gap:6px;font-size:13px}.row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    input{box-sizing:border-box;width:100%;min-height:42px;padding:0 12px;border:1px solid var(--divider-color);border-radius:10px;color:inherit;background:var(--card-background-color)}
    input[type='checkbox']{width:auto;min-height:auto;justify-self:start}
    @media (max-width:700px){.row{grid-template-columns:1fr}}
  `;

  setConfig(config: FrakonDashboardCardConfig): void { this.config = { ...config }; }

  private emit(config: FrakonDashboardCardConfig): void {
    this.config = config;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
  }

  private updateConfig<K extends keyof FrakonDashboardCardConfig>(key: K, value: FrakonDashboardCardConfig[K]): void {
    if (!this.config) return;
    this.emit({ ...this.config, [key]: value });
  }

  private updateResponsive(key: keyof ResponsiveColumns, value: number): void {
    if (!this.config) return;
    const responsive: ResponsiveColumns = {
      ...defaultResponsiveColumns,
      ...this.config.responsive_columns,
      [key]: Math.max(1, Math.round(value)),
    };
    this.emit({ ...this.config, responsive_columns: responsive });
  }

  render() {
    if (!this.config) return nothing;
    const language = resolveEditorLanguage(this.config.language, this.hass?.language, this.hass?.locale?.language);
    const t = (key: Parameters<typeof editorTranslate>[1]) => editorTranslate(language, key);
    const responsive = { ...defaultResponsiveColumns, ...this.config.responsive_columns };
    return html`<div class="editor">
      <section class="section">
        <div class="title">${t('dashboard')}</div>
        <label>${t('title')}<input .value=${this.config.title ?? ''} @input=${(e:Event)=>this.updateConfig('title',(e.target as HTMLInputElement).value)}></label>
        <label>${t('dashboardId')}<input .value=${this.config.dashboard_id ?? 'default'} @input=${(e:Event)=>this.updateConfig('dashboard_id',(e.target as HTMLInputElement).value)}></label>
        <div class="row">
          <label>${t('editingColumns')}<input type="number" min="1" max="24" .value=${String(this.config.columns ?? 12)} @input=${(e:Event)=>this.updateConfig('columns',Number((e.target as HTMLInputElement).value))}></label>
          <label>${t('rowHeight')}<input type="number" min="24" max="240" .value=${String(this.config.row_height ?? 48)} @input=${(e:Event)=>this.updateConfig('row_height',Number((e.target as HTMLInputElement).value))}></label>
        </div>
        <div class="row">
          <label>${t('gap')}<input type="number" min="0" max="48" .value=${String(this.config.gap ?? 12)} @input=${(e:Event)=>this.updateConfig('gap',Number((e.target as HTMLInputElement).value))}></label>
          <label>${t('editMode')}<input type="checkbox" .checked=${this.config.edit_mode === true} @change=${(e:Event)=>this.updateConfig('edit_mode',(e.target as HTMLInputElement).checked)}></label>
        </div>
      </section>
      <section class="section">
        <div class="title">${t('responsiveColumns')}</div>
        <div class="row">
          <label>${t('mobile')}<input type="number" min="1" max="12" .value=${String(responsive.mobile)} @input=${(e:Event)=>this.updateResponsive('mobile',Number((e.target as HTMLInputElement).value))}></label>
          <label>${t('tablet')}<input type="number" min="1" max="16" .value=${String(responsive.tablet)} @input=${(e:Event)=>this.updateResponsive('tablet',Number((e.target as HTMLInputElement).value))}></label>
        </div>
        <div class="row">
          <label>${t('desktop')}<input type="number" min="1" max="24" .value=${String(responsive.desktop)} @input=${(e:Event)=>this.updateResponsive('desktop',Number((e.target as HTMLInputElement).value))}></label>
          <label>${t('wide')}<input type="number" min="1" max="32" .value=${String(responsive.wide)} @input=${(e:Event)=>this.updateResponsive('wide',Number((e.target as HTMLInputElement).value))}></label>
        </div>
      </section>
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-dashboard-card-editor': FrakonDashboardCardEditor; } }

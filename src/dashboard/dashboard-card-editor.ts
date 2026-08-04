import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { FrakonDashboardCardConfig } from './dashboard-card';

@customElement('frakon-dashboard-card-editor')
export class FrakonDashboardCardEditor extends LitElement {
  @state() private config?: FrakonDashboardCardConfig;

  static styles = css`
    :host{display:block;color:var(--primary-text-color)}
    .editor{display:grid;gap:16px}.section{display:grid;gap:12px;padding:16px;border:1px solid var(--divider-color);border-radius:16px}
    label{display:grid;gap:6px;font-size:13px}.row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    input{box-sizing:border-box;width:100%;min-height:42px;padding:0 12px;border:1px solid var(--divider-color);border-radius:10px;color:inherit;background:var(--card-background-color)}
  `;

  setConfig(config: FrakonDashboardCardConfig): void { this.config = { ...config }; }

  private updateConfig<K extends keyof FrakonDashboardCardConfig>(key: K, value: FrakonDashboardCardConfig[K]): void {
    if (!this.config) return;
    this.config = { ...this.config, [key]: value };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.config) return nothing;
    return html`<div class="editor">
      <section class="section">
        <label>Title<input .value=${this.config.title ?? ''} @input=${(e:Event)=>this.updateConfig('title',(e.target as HTMLInputElement).value)}></label>
        <label>Dashboard ID<input .value=${this.config.dashboard_id ?? 'default'} @input=${(e:Event)=>this.updateConfig('dashboard_id',(e.target as HTMLInputElement).value)}></label>
        <div class="row">
          <label>Columns<input type="number" min="1" max="24" .value=${String(this.config.columns ?? 12)} @input=${(e:Event)=>this.updateConfig('columns',Number((e.target as HTMLInputElement).value))}></label>
          <label>Row height<input type="number" min="24" max="240" .value=${String(this.config.row_height ?? 48)} @input=${(e:Event)=>this.updateConfig('row_height',Number((e.target as HTMLInputElement).value))}></label>
        </div>
        <div class="row">
          <label>Gap<input type="number" min="0" max="48" .value=${String(this.config.gap ?? 12)} @input=${(e:Event)=>this.updateConfig('gap',Number((e.target as HTMLInputElement).value))}></label>
          <label>Edit mode<input type="checkbox" .checked=${this.config.edit_mode === true} @change=${(e:Event)=>this.updateConfig('edit_mode',(e.target as HTMLInputElement).checked)}></label>
        </div>
      </section>
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-dashboard-card-editor': FrakonDashboardCardEditor; } }

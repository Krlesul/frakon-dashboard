import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../home-assistant/types';
import type { FrakonActionCardConfig } from './action-card';

interface ConfigChangedEventDetail { config: FrakonActionCardConfig; }

const ACTION_PREFIXES = ['button.', 'input_button.', 'script.', 'scene.'];

@customElement('frakon-action-card-editor')
export class FrakonActionCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonActionCardConfig;

  static styles = css`
    :host { display:block; color:var(--primary-text-color); }
    .editor { display:grid; gap:18px; padding:4px 0; }
    .section { display:grid; gap:12px; padding:16px; border:1px solid var(--divider-color); border-radius:16px; }
    .title { font-size:13px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; opacity:.65; }
    label { display:grid; gap:7px; font-size:13px; }
    input[type='text'], select { width:100%; box-sizing:border-box; min-height:42px; padding:0 12px; border:1px solid var(--divider-color); border-radius:10px; color:inherit; background:var(--card-background-color); }
    .toggle { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .hint { margin:0; font-size:12px; line-height:1.45; opacity:.62; }
  `;

  setConfig(config: FrakonActionCardConfig): void { this.config = { show_state:false, ...config }; }

  private updateConfig<K extends keyof FrakonActionCardConfig>(key: K, value: FrakonActionCardConfig[K]): void {
    if (!this.config) return;
    this.config = { ...this.config, [key]: value };
    this.dispatchEvent(new CustomEvent<ConfigChangedEventDetail>('config-changed', {
      detail:{ config:this.config }, bubbles:true, composed:true,
    }));
  }

  private entities(): string[] {
    return Object.keys(this.hass?.states ?? {})
      .filter((entityId) => ACTION_PREFIXES.some((prefix) => entityId.startsWith(prefix)))
      .sort();
  }

  render() {
    if (!this.config) return nothing;
    const entities = this.entities();
    return html`<div class="editor">
      <section class="section">
        <div class="title">Action target</div>
        <label>Entity
          <select .value=${this.config.entity} @change=${(event:Event) => this.updateConfig('entity', (event.target as HTMLSelectElement).value)}>
            ${entities.length === 0 && this.config.entity ? html`<option value=${this.config.entity}>${this.config.entity}</option>` : nothing}
            ${entities.map((entityId) => html`<option value=${entityId}>${entityId}</option>`)}
          </select>
        </label>
        <label>Name<input type="text" .value=${this.config.name ?? ''} placeholder="Use entity name" @input=${(event:Event) => this.updateConfig('name', (event.target as HTMLInputElement).value || undefined)}></label>
        <p class="hint">Supported domains: button, input_button, script and scene.</p>
      </section>
      <section class="section">
        <div class="title">Display</div>
        <label class="toggle"><span>Show entity state</span><input type="checkbox" .checked=${this.config.show_state === true} @change=${(event:Event) => this.updateConfig('show_state', (event.target as HTMLInputElement).checked)}></label>
      </section>
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-action-card-editor': FrakonActionCardEditor; } }

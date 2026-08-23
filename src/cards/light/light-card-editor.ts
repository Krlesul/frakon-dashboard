import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../home-assistant/types';
import type { FrakonLightCardConfig } from './light-card';

interface ConfigChangedEventDetail { config: FrakonLightCardConfig; }

@customElement('frakon-light-card-editor')
export class FrakonLightCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonLightCardConfig;

  static styles = css`
    :host { display: block; color: var(--primary-text-color); }
    .editor { display: grid; gap: 18px; padding: 4px 0; }
    .section { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--divider-color); border-radius: 16px; }
    .title { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; opacity: .65; }
    label { display: grid; gap: 7px; font-size: 13px; }
    input[type='text'], select { width: 100%; box-sizing: border-box; min-height: 42px; padding: 0 12px; border: 1px solid var(--divider-color); border-radius: 10px; color: inherit; background: var(--card-background-color); }
    .toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  `;

  setConfig(config: FrakonLightCardConfig): void { this.config = { ...config }; }

  private updateConfig<K extends keyof FrakonLightCardConfig>(key: K, value: FrakonLightCardConfig[K]): void {
    if (!this.config) return;
    this.config = { ...this.config, [key]: value };
    this.dispatchEvent(new CustomEvent<ConfigChangedEventDetail>('config-changed', {
      detail: { config: this.config }, bubbles: true, composed: true,
    }));
  }

  private lightEntities(): string[] {
    return Object.keys(this.hass?.states ?? {}).filter((entityId) => entityId.startsWith('light.')).sort();
  }

  render() {
    if (!this.config) return nothing;
    return html`
      <div class="editor">
        <section class="section">
          <div class="title">Entity</div>
          <label>Light
            <select .value=${this.config.entity} @change=${(event: Event) => this.updateConfig('entity', (event.target as HTMLSelectElement).value)}>
              ${this.lightEntities().map((entityId) => html`<option value=${entityId}>${entityId}</option>`)}
            </select>
          </label>
          <label>Name
            <input type="text" .value=${this.config.name ?? ''} placeholder="Use entity name" @input=${(event: Event) => this.updateConfig('name', (event.target as HTMLInputElement).value || undefined)}>
          </label>
        </section>
        <section class="section">
          <div class="title">Controls</div>
          <label class="toggle"><span>Brightness slider</span><input type="checkbox" .checked=${this.config.show_brightness !== false} @change=${(event: Event) => this.updateConfig('show_brightness', (event.target as HTMLInputElement).checked)}></label>
          <label class="toggle"><span>Color temperature</span><input type="checkbox" .checked=${this.config.show_color_temperature !== false} @change=${(event: Event) => this.updateConfig('show_color_temperature', (event.target as HTMLInputElement).checked)}></label>
          <label class="toggle"><span>Compact layout</span><input type="checkbox" .checked=${this.config.compact === true} @change=${(event: Event) => this.updateConfig('compact', (event.target as HTMLInputElement).checked)}></label>
        </section>
      </div>
    `;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-light-card-editor': FrakonLightCardEditor; } }

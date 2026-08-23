import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { supportedLanguages } from '../i18n';
import type { HomeAssistant, LovelaceCardConfig } from '../home-assistant/types';

interface ConfigChangedEventDetail {
  config: LovelaceCardConfig;
}

@customElement('frakon-card-editor')
export class FrakonCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: LovelaceCardConfig;

  static styles = css`
    :host { display:block; color:var(--primary-text-color); }
    .editor { display:grid; gap:18px; padding:4px 0; }
    .section { display:grid; gap:12px; padding:16px; border:1px solid var(--divider-color); border-radius:16px; }
    .title { font-size:13px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; opacity:.65; }
    label { display:grid; gap:7px; font-size:13px; }
    input[type='text'], select { width:100%; box-sizing:border-box; min-height:42px; padding:0 12px; border:1px solid var(--divider-color); border-radius:10px; color:inherit; background:var(--card-background-color); }
    .hint { margin:0; font-size:12px; line-height:1.45; opacity:.62; }
  `;

  setConfig(config: LovelaceCardConfig): void {
    this.config = { tap_action: 'toggle', ...config };
  }

  private updateConfig<K extends keyof LovelaceCardConfig>(
    key: K,
    value: LovelaceCardConfig[K],
  ): void {
    if (!this.config) return;
    const next = { ...this.config, [key]: value };
    if (value === undefined) delete next[key];
    this.config = next;
    this.dispatchEvent(new CustomEvent<ConfigChangedEventDetail>('config-changed', {
      detail: { config: this.config },
      bubbles: true,
      composed: true,
    }));
  }

  private entities(): string[] {
    return Object.keys(this.hass?.states ?? {}).sort();
  }

  render() {
    if (!this.config) return nothing;
    const entities = this.entities();
    const entityOptions = this.config.entity && !entities.includes(this.config.entity)
      ? [this.config.entity, ...entities]
      : entities;

    return html`<div class="editor">
      <section class="section">
        <div class="title">Entity</div>
        <label>Entity
          <select .value=${this.config.entity} @change=${(event:Event) => this.updateConfig('entity', (event.target as HTMLSelectElement).value)}>
            ${entityOptions.map((entityId) => html`<option value=${entityId}>${entityId}</option>`)}
          </select>
        </label>
        <label>Name
          <input type="text" .value=${this.config.name ?? ''} placeholder="Use entity name" @input=${(event:Event) => this.updateConfig('name', (event.target as HTMLInputElement).value || undefined)}>
        </label>
      </section>

      <section class="section">
        <div class="title">Interaction</div>
        <label>Tap action
          <select .value=${this.config.tap_action ?? 'toggle'} @change=${(event:Event) => this.updateConfig('tap_action', (event.target as HTMLSelectElement).value as LovelaceCardConfig['tap_action'])}>
            <option value="toggle">Toggle entity</option>
            <option value="more-info">Open more info</option>
            <option value="none">No action</option>
          </select>
        </label>
        <p class="hint">Toggle calls the entity domain toggle service. More info opens the standard Home Assistant entity dialog.</p>
      </section>

      <section class="section">
        <div class="title">Language</div>
        <label>Card language
          <select .value=${this.config.language ?? ''} @change=${(event:Event) => this.updateConfig('language', (event.target as HTMLSelectElement).value || undefined)}>
            <option value="">Automatic</option>
            ${supportedLanguages.map((language) => html`<option value=${language}>${language.toUpperCase()}</option>`)}
          </select>
        </label>
      </section>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frakon-card-editor': FrakonCardEditor;
  }
}

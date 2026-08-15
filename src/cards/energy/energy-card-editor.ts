import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../home-assistant/types';
import type { FrakonEnergyCardConfig } from './energy-card';

interface ConfigChangedEventDetail { config: FrakonEnergyCardConfig; }

@customElement('frakon-energy-card-editor')
export class FrakonEnergyCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonEnergyCardConfig;

  static styles = css`
    :host { display:block; color:var(--primary-text-color); }
    .editor { display:grid; gap:18px; padding:4px 0; }
    .section { display:grid; gap:12px; padding:16px; border:1px solid var(--divider-color); border-radius:16px; }
    .title { font-size:13px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; opacity:.65; }
    label { display:grid; gap:7px; font-size:13px; }
    input[type='text'], select { width:100%; box-sizing:border-box; min-height:42px; padding:0 12px; border:1px solid var(--divider-color); border-radius:10px; color:inherit; background:var(--card-background-color); }
    .toggle { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  `;

  setConfig(config: FrakonEnergyCardConfig): void { this.config = { ...config }; }

  private updateConfig<K extends keyof FrakonEnergyCardConfig>(key: K, value: FrakonEnergyCardConfig[K]): void {
    if (!this.config) return;
    this.config = { ...this.config, [key]: value };
    this.dispatchEvent(new CustomEvent<ConfigChangedEventDetail>('config-changed', {
      detail:{ config:this.config }, bubbles:true, composed:true,
    }));
  }

  private sensors(): string[] {
    return Object.keys(this.hass?.states ?? {}).filter((entityId) => entityId.startsWith('sensor.')).sort();
  }

  private optionalOptions(current: string | undefined, candidates: string[]) {
    const options = current && !candidates.includes(current) ? [current, ...candidates] : candidates;
    return html`<option value="">None</option>${options.map((entityId) => html`<option value=${entityId}>${entityId}</option>`)}`;
  }

  render() {
    if (!this.config) return nothing;
    const sensors = this.sensors();
    return html`<div class="editor">
      <section class="section">
        <div class="title">Primary metric</div>
        <label>Power / primary entity
          <select .value=${this.config.entity} @change=${(event:Event) => this.updateConfig('entity', (event.target as HTMLSelectElement).value)}>
            ${this.config.entity && !sensors.includes(this.config.entity) ? html`<option value=${this.config.entity}>${this.config.entity}</option>` : nothing}
            ${sensors.map((entityId) => html`<option value=${entityId}>${entityId}</option>`)}
          </select>
        </label>
        <label>Name<input type="text" .value=${this.config.name ?? ''} placeholder="Use primary entity name" @input=${(event:Event) => this.updateConfig('name', (event.target as HTMLInputElement).value || undefined)}></label>
      </section>
      <section class="section">
        <div class="title">Secondary metrics</div>
        <label>Energy entity<select .value=${this.config.energy_entity ?? ''} @change=${(event:Event) => this.updateConfig('energy_entity', (event.target as HTMLSelectElement).value || undefined)}>${this.optionalOptions(this.config.energy_entity, sensors)}</select></label>
        <label>Price entity<select .value=${this.config.price_entity ?? ''} @change=${(event:Event) => this.updateConfig('price_entity', (event.target as HTMLSelectElement).value || undefined)}>${this.optionalOptions(this.config.price_entity, sensors)}</select></label>
      </section>
      <section class="section">
        <div class="title">Presentation</div>
        <label class="toggle"><span>Compact layout</span><input type="checkbox" .checked=${this.config.compact === true} @change=${(event:Event) => this.updateConfig('compact', (event.target as HTMLInputElement).checked)}></label>
      </section>
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-energy-card-editor': FrakonEnergyCardEditor; } }

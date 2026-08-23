import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from '../../home-assistant/types';
import type { FrakonVehicleCardConfig } from './vehicle-card';

interface ConfigChangedEventDetail { config: FrakonVehicleCardConfig; }

@customElement('frakon-vehicle-card-editor')
export class FrakonVehicleCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonVehicleCardConfig;

  static styles = css`
    :host { display:block; color:var(--primary-text-color); }
    .editor { display:grid; gap:18px; padding:4px 0; }
    .section { display:grid; gap:12px; padding:16px; border:1px solid var(--divider-color); border-radius:16px; }
    .title { font-size:13px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; opacity:.65; }
    label { display:grid; gap:7px; font-size:13px; }
    input[type='text'], select { width:100%; box-sizing:border-box; min-height:42px; padding:0 12px; border:1px solid var(--divider-color); border-radius:10px; color:inherit; background:var(--card-background-color); }
  `;

  setConfig(config: FrakonVehicleCardConfig): void { this.config = { ...config }; }

  private updateConfig<K extends keyof FrakonVehicleCardConfig>(key: K, value: FrakonVehicleCardConfig[K]): void {
    if (!this.config) return;
    this.config = { ...this.config, [key]: value };
    this.dispatchEvent(new CustomEvent<ConfigChangedEventDetail>('config-changed', {
      detail:{ config:this.config }, bubbles:true, composed:true,
    }));
  }

  private sensors(): string[] {
    return Object.keys(this.hass?.states ?? {}).filter((entityId) => entityId.startsWith('sensor.')).sort();
  }

  private chargingControls(): string[] {
    return Object.keys(this.hass?.states ?? {})
      .filter((entityId) => entityId.startsWith('switch.') || entityId.startsWith('input_boolean.'))
      .sort();
  }

  private optionalOptions(current: string | undefined, candidates: string[]) {
    const options = current && !candidates.includes(current) ? [current, ...candidates] : candidates;
    return html`<option value="">None</option>${options.map((entityId) => html`<option value=${entityId}>${entityId}</option>`)}`;
  }

  render() {
    if (!this.config) return nothing;
    const sensors = this.sensors();
    const chargingControls = this.chargingControls();
    return html`<div class="editor">
      <section class="section">
        <div class="title">Vehicle</div>
        <label>Battery / state of charge
          <select .value=${this.config.entity} @change=${(event:Event) => this.updateConfig('entity', (event.target as HTMLSelectElement).value)}>
            ${this.config.entity && !sensors.includes(this.config.entity) ? html`<option value=${this.config.entity}>${this.config.entity}</option>` : nothing}
            ${sensors.map((entityId) => html`<option value=${entityId}>${entityId}</option>`)}
          </select>
        </label>
        <label>Name<input type="text" .value=${this.config.name ?? ''} placeholder="Use battery entity name" @input=${(event:Event) => this.updateConfig('name', (event.target as HTMLInputElement).value || undefined)}></label>
      </section>
      <section class="section">
        <div class="title">Metrics</div>
        <label>Range entity<select .value=${this.config.range_entity ?? ''} @change=${(event:Event) => this.updateConfig('range_entity', (event.target as HTMLSelectElement).value || undefined)}>${this.optionalOptions(this.config.range_entity, sensors)}</select></label>
        <label>Charging power entity<select .value=${this.config.charging_power_entity ?? ''} @change=${(event:Event) => this.updateConfig('charging_power_entity', (event.target as HTMLSelectElement).value || undefined)}>${this.optionalOptions(this.config.charging_power_entity, sensors)}</select></label>
      </section>
      <section class="section">
        <div class="title">Charging control</div>
        <label>Charging switch<select .value=${this.config.charging_switch_entity ?? ''} @change=${(event:Event) => this.updateConfig('charging_switch_entity', (event.target as HTMLSelectElement).value || undefined)}>${this.optionalOptions(this.config.charging_switch_entity, chargingControls)}</select></label>
      </section>
    </div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-vehicle-card-editor': FrakonVehicleCardEditor; } }

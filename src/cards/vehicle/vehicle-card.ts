import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';

export interface FrakonVehicleCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-vehicle-card';
  entity: string;
  range_entity?: string;
  charging_power_entity?: string;
  charging_switch_entity?: string;
}

@customElement('frakon-vehicle-card')
export class FrakonVehicleCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonVehicleCardConfig;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card { min-height: 190px; padding: 20px; border: 1px solid var(--frakon-border); border-radius: var(--frakon-radius-card); background: var(--frakon-surface); box-shadow: 0 18px 50px rgb(0 0 0 / 18%); }
    .eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; opacity: .58; }
    .name { margin-top: 7px; font-size: 21px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 24px; }
    .metric { padding: 14px; border-radius: 16px; background: color-mix(in srgb, var(--frakon-accent) 9%, transparent); }
    .label { font-size: 11px; opacity: .62; }
    .value { margin-top: 5px; font-size: 22px; font-weight: 720; }
    button { width: 100%; min-height: 44px; margin-top: 16px; border: 0; border-radius: 14px; color: inherit; background: color-mix(in srgb, var(--frakon-accent) 18%, transparent); cursor: pointer; }
  `;

  setConfig(config: FrakonVehicleCardConfig): void {
    if (!config.entity) throw new Error('FRAKON Vehicle Card requires a battery entity.');
    if (config.charging_switch_entity && !/^(switch|input_boolean)\./.test(config.charging_switch_entity)) {
      throw new Error('FRAKON Vehicle Card charging_switch_entity must be switch.* or input_boolean.*.');
    }
    this.config = { ...config };
  }

  getCardSize(): number { return 4; }
  static getConfigElement(): HTMLElement { return document.createElement('frakon-vehicle-card-editor'); }
  static getStubConfig(): FrakonVehicleCardConfig {
    return { type: 'custom:frakon-vehicle-card', entity: 'sensor.vehicle_battery' };
  }

  private stateValue(entityId?: string): string {
    if (!entityId || !this.hass?.states[entityId]) return '—';
    const state = this.hass.states[entityId];
    const unit = typeof state.attributes.unit_of_measurement === 'string' ? ` ${state.attributes.unit_of_measurement}` : '';
    return `${state.state}${unit}`;
  }

  private async toggleCharging(): Promise<void> {
    if (!this.hass || !this.config?.charging_switch_entity) return;
    const [domain] = this.config.charging_switch_entity.split('.');
    await this.hass.callService(domain, 'toggle', { entity_id: this.config.charging_switch_entity });
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const battery = this.hass.states[this.config.entity];
    if (!battery) return html`<article class="card">Entity not found</article>`;
    const name = this.config.name ?? String(battery.attributes.friendly_name ?? 'Vehicle');
    return html`
      <article class="card">
        <div class="eyebrow">FRAKON VEHICLE</div><div class="name">${name}</div>
        <div class="grid">
          <div class="metric"><div class="label">Battery</div><div class="value">${this.stateValue(this.config.entity)}</div></div>
          <div class="metric"><div class="label">Range</div><div class="value">${this.stateValue(this.config.range_entity)}</div></div>
          <div class="metric"><div class="label">Power</div><div class="value">${this.stateValue(this.config.charging_power_entity)}</div></div>
        </div>
        ${this.config.charging_switch_entity ? html`<button @click=${this.toggleCharging}>Toggle charging</button>` : nothing}
      </article>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-vehicle-card': FrakonVehicleCard; } }

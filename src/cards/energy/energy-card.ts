import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';

export interface FrakonEnergyCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-energy-card';
  entity: string;
  energy_entity?: string;
  price_entity?: string;
  compact?: boolean;
}

@customElement('frakon-energy-card')
export class FrakonEnergyCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonEnergyCardConfig;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    :host { display:block; height:100%; }
    .card { min-height:176px; height:100%; box-sizing:border-box; padding:20px; border:1px solid var(--frakon-border); border-radius:var(--frakon-radius-card); background:var(--frakon-surface); box-shadow:0 18px 50px rgb(0 0 0 / 18%); }
    .eyebrow { font-size:11px; letter-spacing:.14em; text-transform:uppercase; opacity:.58; }
    .name { margin-top:7px; font-size:21px; font-weight:700; }
    .primary { margin-top:24px; font-size:34px; font-weight:740; letter-spacing:-.04em; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:18px; }
    .metric { padding:12px 14px; border-radius:15px; background:color-mix(in srgb,var(--frakon-accent) 9%,transparent); }
    .label { font-size:11px; opacity:.6; }
    .value { margin-top:5px; font-size:19px; font-weight:690; }
    .compact .grid { display:none; }
  `;

  setConfig(config: FrakonEnergyCardConfig): void {
    if (!config.entity) throw new Error('FRAKON Energy Card requires a power or energy entity.');
    this.config = config;
  }

  getCardSize(): number { return this.config?.compact ? 3 : 4; }

  private value(entityId?: string): string {
    if (!entityId || !this.hass) return '—';
    const entity = this.hass.states[entityId];
    if (!entity) return '—';
    const unit = typeof entity.attributes.unit_of_measurement === 'string' ? ` ${entity.attributes.unit_of_measurement}` : '';
    return `${entity.state}${unit}`;
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const primary = this.hass.states[this.config.entity];
    if (!primary) return html`<article class="card">Entity not found</article>`;
    const name = this.config.name ?? String(primary.attributes.friendly_name ?? this.config.entity);
    return html`
      <article class="card ${this.config.compact ? 'compact' : ''}">
        <div class="eyebrow">FRAKON ENERGY</div>
        <div class="name">${name}</div>
        <div class="primary">${this.value(this.config.entity)}</div>
        <div class="grid">
          <div class="metric"><div class="label">Energy</div><div class="value">${this.value(this.config.energy_entity)}</div></div>
          <div class="metric"><div class="label">Price</div><div class="value">${this.value(this.config.price_entity)}</div></div>
        </div>
      </article>
    `;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-energy-card': FrakonEnergyCard; } }

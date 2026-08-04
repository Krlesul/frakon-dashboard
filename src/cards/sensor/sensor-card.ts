import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import { resolveLanguage, translate } from '../../i18n';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';

export interface FrakonSensorCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-sensor-card';
  precision?: number;
  unit?: string;
  compact?: boolean;
}

@customElement('frakon-sensor-card')
export class FrakonSensorCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonSensorCardConfig;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    :host { display:block; height:100%; }
    .card { min-height:138px; height:100%; box-sizing:border-box; padding:20px; border:1px solid var(--frakon-border); border-radius:var(--frakon-radius-card); background:var(--frakon-surface); box-shadow:0 18px 50px rgb(0 0 0 / 18%); backdrop-filter:blur(24px) saturate(130%); }
    .eyebrow { opacity:.58; font-size:11px; letter-spacing:.14em; text-transform:uppercase; }
    .name { margin-top:6px; overflow:hidden; font-size:18px; font-weight:680; text-overflow:ellipsis; white-space:nowrap; }
    .value { margin-top:28px; font-size:34px; font-weight:730; letter-spacing:-.04em; }
    .meta { margin-top:6px; opacity:.6; font-size:12px; }
    .unavailable { opacity:.55; }
  `;

  setConfig(config: FrakonSensorCardConfig): void {
    if (!config.entity) throw new Error('FRAKON Sensor Card requires an entity.');
    this.config = { precision: 1, ...config };
  }

  getCardSize(): number { return this.config?.compact ? 2 : 3; }

  static getStubConfig(): FrakonSensorCardConfig {
    return { type: 'custom:frakon-sensor-card', entity: 'sensor.example', precision: 1 };
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const entity = this.hass.states[this.config.entity];
    const language = resolveLanguage(this.config.language, this.hass.locale?.language, this.hass.language, navigator.language);
    if (!entity) return html`<article class="card unavailable">${translate(language, 'entityMissing')}</article>`;
    const unavailable = ['unknown', 'unavailable'].includes(entity.state);
    const parsed = Number(entity.state);
    const value = unavailable ? '—' : Number.isFinite(parsed) ? parsed.toFixed(this.config.precision ?? 1) : entity.state;
    const unit = this.config.unit ?? String(entity.attributes.unit_of_measurement ?? '');
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    return html`<article class="card ${unavailable ? 'unavailable' : ''}"><div class="eyebrow">FRAKON SENSOR</div><div class="name">${name}</div><div class="value">${value}${unit ? html` <small>${unit}</small>` : nothing}</div><div class="meta">${unavailable ? translate(language, 'unavailable') : this.config.entity}</div></article>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-sensor-card': FrakonSensorCard; } }

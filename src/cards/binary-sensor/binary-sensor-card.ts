import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';
import { frakonBinarySensorPresentation } from './binary-sensor-card-state';

export interface FrakonBinarySensorCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-binary-sensor-card';
  entity: string;
  show_state?: boolean;
}

@customElement('frakon-binary-sensor-card')
export class FrakonBinarySensorCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonBinarySensorCardConfig;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card{min-height:140px;padding:20px;border:1px solid var(--frakon-border);border-radius:var(--frakon-radius-card);background:var(--frakon-surface);box-shadow:0 18px 50px rgb(0 0 0 / 18%);display:grid;gap:18px}
    .head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.name{font-size:21px;font-weight:680}.meta{margin-top:7px;display:flex;gap:7px;align-items:center;flex-wrap:wrap;opacity:.72}.device{font-size:11px;text-transform:uppercase;letter-spacing:.08em}.state{font-size:15px;font-weight:680}
    .indicator{width:14px;height:14px;border-radius:999px;background:color-mix(in srgb,var(--primary-text-color) 28%,transparent);box-shadow:0 0 0 7px color-mix(in srgb,var(--primary-text-color) 7%,transparent)}
    .indicator.active{background:var(--frakon-accent);box-shadow:0 0 0 7px color-mix(in srgb,var(--frakon-accent) 16%,transparent)}
    .indicator.danger{background:#ff4d67;box-shadow:0 0 0 7px rgb(255 77 103 / 16%)}
    .indicator.unknown{background:#f0a85a;box-shadow:0 0 0 7px rgb(240 168 90 / 14%)}
  `;

  setConfig(config: FrakonBinarySensorCardConfig): void {
    if (!config.entity?.startsWith('binary_sensor.')) throw new Error('FRAKON Binary Sensor Card requires a binary_sensor entity.');
    this.config = { show_state: true, ...config };
  }

  getCardSize(): number { return 3; }

  render() {
    if (!this.hass || !this.config) return nothing;
    const entity = this.hass.states[this.config.entity];
    if (!entity) return html`<article class="card">Entity not found</article>`;
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    const deviceClass = typeof entity.attributes.device_class === 'string' ? entity.attributes.device_class : undefined;
    const presentation = frakonBinarySensorPresentation(entity.state, deviceClass);
    return html`<article class="card">
      <div class="head">
        <div>
          <div class="name">${name}</div>
          <div class="meta">
            ${this.config.show_state ? html`<span class="state">${presentation.label}</span>` : nothing}
            ${deviceClass ? html`<span class="device">${deviceClass.replaceAll('_', ' ')}</span>` : nothing}
          </div>
        </div>
        <span class="indicator ${presentation.tone}" aria-label=${presentation.label}></span>
      </div>
    </article>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-binary-sensor-card': FrakonBinarySensorCard; } }

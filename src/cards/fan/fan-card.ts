import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';
import { resolveLanguage, translate } from '../../i18n';
import { frakonFanTranslate } from './fan-card-i18n';
import { frakonFanState, normalizeFanPercentage } from './fan-card-state';

export interface FrakonFanCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-fan-card';
  entity: string;
  show_percentage?: boolean;
}

@customElement('frakon-fan-card')
export class FrakonFanCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonFanCardConfig;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card{min-height:160px;padding:20px;border:1px solid var(--frakon-border);border-radius:var(--frakon-radius-card);background:var(--frakon-surface);box-shadow:0 18px 50px rgb(0 0 0 / 18%);display:grid;gap:17px}
    .head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.name{font-size:21px;font-weight:680}.state{margin-top:7px;opacity:.65}.toggle{min-width:88px;height:42px;border:0;border-radius:14px;color:inherit;background:color-mix(in srgb,var(--frakon-accent) 14%,transparent);cursor:pointer;font:inherit;font-weight:680}.toggle.on{background:color-mix(in srgb,var(--frakon-accent) 30%,transparent)}.toggle:disabled{opacity:.42;cursor:not-allowed}
    .speed{display:grid;gap:7px}.speed-head{display:flex;justify-content:space-between;gap:10px;font-size:12px;opacity:.72}input[type='range']{width:100%;accent-color:var(--frakon-accent)}
  `;

  setConfig(config: FrakonFanCardConfig): void {
    if (!config.entity?.startsWith('fan.')) throw new Error('FRAKON Fan Card requires a fan entity.');
    this.config = { show_percentage: true, ...config };
  }

  getCardSize(): number { return 4; }

  private toggle(on: boolean): void {
    if (!this.hass || !this.config) return;
    void this.hass.callService('fan', on ? 'turn_off' : 'turn_on', { entity_id: this.config.entity });
  }

  private setPercentage(event: Event): void {
    if (!this.hass || !this.config) return;
    const percentage = normalizeFanPercentage(Number((event.currentTarget as HTMLInputElement).value));
    void this.hass.callService('fan', 'set_percentage', { entity_id: this.config.entity, percentage });
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const language = resolveLanguage(this.config.language, this.hass.locale?.language, this.hass.language, navigator.language);
    const entity = this.hass.states[this.config.entity];
    if (!entity) return html`<article class="card">${translate(language, 'entityMissing')}</article>`;
    const model = frakonFanState(entity.state, entity.attributes.percentage);
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    const stateLabel = model.unavailable ? frakonFanTranslate(language, 'unavailable') : frakonFanTranslate(language, model.on ? 'on' : 'off');
    const showPercentage = this.config.show_percentage !== false && model.percentage !== undefined;
    return html`<article class="card">
      <div class="head"><div><div class="name">${name}</div><div class="state">${stateLabel}</div></div><button class="toggle ${model.on ? 'on' : ''}" ?disabled=${model.unavailable} @click=${() => this.toggle(model.on)}>${stateLabel}</button></div>
      ${showPercentage ? html`<div class="speed"><div class="speed-head"><span>${frakonFanTranslate(language, 'speed')}</span><span>${model.percentage}%</span></div><input type="range" min="0" max="100" step="1" .value=${String(model.percentage)} ?disabled=${model.unavailable} @change=${this.setPercentage}></div>` : nothing}
    </article>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-fan-card': FrakonFanCard; } }

import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';

export interface FrakonClimateCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-climate-card';
  entity: string;
  step?: number;
}

@customElement('frakon-climate-card')
export class FrakonClimateCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonClimateCardConfig;
  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card{min-height:170px;padding:20px;border:1px solid var(--frakon-border);border-radius:var(--frakon-radius-card);background:var(--frakon-surface);box-shadow:0 18px 50px rgb(0 0 0 / 18%)}
    .name{font-size:21px;font-weight:680}.mode{margin-top:6px;opacity:.65}.temperatures{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-top:28px}.current{font-size:34px;font-weight:730}.target{opacity:.72}.actions{display:flex;gap:10px;margin-top:20px}button{width:48px;height:44px;border:0;border-radius:14px;color:inherit;background:color-mix(in srgb,var(--frakon-accent) 14%,transparent);cursor:pointer}
  `;
  setConfig(config: FrakonClimateCardConfig): void {
    if (!config.entity?.startsWith('climate.')) throw new Error('FRAKON Climate Card requires a climate entity.');
    this.config = { step: 0.5, ...config };
  }
  getCardSize(): number { return 4; }
  private setTarget(delta: number): void {
    if (!this.hass || !this.config) return;
    const entity = this.hass.states[this.config.entity];
    const target = typeof entity?.attributes.temperature === 'number' ? entity.attributes.temperature : undefined;
    if (target === undefined) return;
    void this.hass.callService('climate', 'set_temperature', { entity_id: this.config.entity, temperature: target + delta });
  }
  render() {
    if (!this.hass || !this.config) return nothing;
    const entity = this.hass.states[this.config.entity];
    if (!entity) return html`<article class="card">Entity not found</article>`;
    const current = typeof entity.attributes.current_temperature === 'number' ? entity.attributes.current_temperature : undefined;
    const target = typeof entity.attributes.temperature === 'number' ? entity.attributes.temperature : undefined;
    const unit = String(entity.attributes.temperature_unit ?? '°C');
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    const step = this.config.step ?? 0.5;
    return html`<article class="card"><div class="name">${name}</div><div class="mode">${entity.state}</div><div class="temperatures"><div><div class="current">${current ?? '—'}${current === undefined ? '' : unit}</div><div>Current</div></div><div class="target">Target ${target ?? '—'}${target === undefined ? '' : unit}</div></div><div class="actions"><button @click=${() => this.setTarget(-step)} aria-label="Decrease temperature">−</button><button @click=${() => this.setTarget(step)} aria-label="Increase temperature">+</button></div></article>`;
  }
}
declare global { interface HTMLElementTagNameMap { 'frakon-climate-card': FrakonClimateCard; } }

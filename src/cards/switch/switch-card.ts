import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { baseStyles } from '../../design-system/tokens';
import type { HomeAssistant, LovelaceCardConfig } from '../../home-assistant/types';
import { frakonSwitchActionForState } from './switch-card-state';

export interface FrakonSwitchCardConfig extends LovelaceCardConfig {
  type: 'custom:frakon-switch-card';
  entity: string;
  show_state?: boolean;
}

@customElement('frakon-switch-card')
export class FrakonSwitchCard extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @state() private config?: FrakonSwitchCardConfig;

  static styles = css`
    ${unsafeCSS(baseStyles)}
    .card{min-height:140px;padding:20px;border:1px solid var(--frakon-border);border-radius:var(--frakon-radius-card);background:var(--frakon-surface);box-shadow:0 18px 50px rgb(0 0 0 / 18%);display:grid;gap:18px}
    .head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.name{font-size:21px;font-weight:680}.state{margin-top:7px;opacity:.65}.toggle{justify-self:start;min-width:96px;height:44px;border:0;border-radius:14px;color:inherit;background:color-mix(in srgb,var(--frakon-accent) 14%,transparent);cursor:pointer;font:inherit;font-weight:650}.toggle.on{background:color-mix(in srgb,var(--frakon-accent) 30%,transparent)}.toggle:disabled{opacity:.42;cursor:not-allowed}
  `;

  setConfig(config: FrakonSwitchCardConfig): void {
    if (!config.entity?.startsWith('switch.')) throw new Error('FRAKON Switch Card requires a switch entity.');
    this.config = { show_state: true, ...config };
  }

  getCardSize(): number { return 3; }
  static getConfigElement(): HTMLElement { return document.createElement('frakon-switch-card-editor'); }
  static getStubConfig(): FrakonSwitchCardConfig {
    return { type: 'custom:frakon-switch-card', entity: 'switch.example', show_state: true };
  }

  private toggle(state: string): void {
    if (!this.hass || !this.config) return;
    const service = frakonSwitchActionForState(state);
    if (!service) return;
    void this.hass.callService('switch', service, { entity_id: this.config.entity });
  }

  render() {
    if (!this.hass || !this.config) return nothing;
    const entity = this.hass.states[this.config.entity];
    if (!entity) return html`<article class="card">Entity not found</article>`;
    const name = this.config.name ?? String(entity.attributes.friendly_name ?? this.config.entity);
    const on = entity.state === 'on';
    const actionable = frakonSwitchActionForState(entity.state) !== undefined;
    return html`<article class="card">
      <div class="head"><div><div class="name">${name}</div>${this.config.show_state ? html`<div class="state">${entity.state}</div>` : nothing}</div></div>
      <button class="toggle ${on ? 'on' : ''}" ?disabled=${!actionable} @click=${() => this.toggle(entity.state)}>${on ? 'ON' : entity.state === 'off' ? 'OFF' : '—'}</button>
    </article>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'frakon-switch-card': FrakonSwitchCard; } }
